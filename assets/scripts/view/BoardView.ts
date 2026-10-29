import { BoardPresenter } from '../app/GameViews';
import { Signal } from '../app/Signal';
import { ReadonlyBoard } from '../core/board/Board';
import { GridPos, samePos } from '../core/board/GridPos';
import { TurnStep } from '../core/game/TurnStep';
import { Tile } from '../core/tiles/Tile';
import { dropNode } from './animation/DropMotion';
import { NoEffects, NoSound } from './animation/Silent';
import { TileStage } from './animation/TileStage';
import { Timings } from './animation/Timings';
import { createTurnPlayer } from './animation/TurnAnimations';
import { TurnPlayer } from './animation/TurnPlayer';
import { SoundBoard } from './audio/SoundBoard';
import { BoardLayout } from './BoardLayout';
import { CellGlows } from './CellGlows';
import { BoardEffects } from './fx/BoardEffects';
import { TILE_BEVEL } from './TileArt';
import { CueTile, TileCues } from './TileCues';
import { TileNodePool } from './TileNodePool';
import { TileSkins } from './TileSkins';

const { ccclass, property } = cc._decorator;

/** Room for pops and shakes around the tile mask. Not on top, where refilled tiles wait hidden. */
const MASK_PADDING = 16;

/** Added to the row order, so lifted tiles draw above resting ones and keep their order among themselves. */
const FRONT_Z = 1000;

/** The deal at level start, in seconds: columns land left to right, each from the bottom up. */
export const IntroFeel = {
    columnStagger: 0.016,
    rowStagger: 0.005,
};

@ccclass
export class BoardView extends cc.Component implements BoardPresenter, TileStage {
    @property(TileSkins)
    skins: TileSkins = null!;

    @property({ type: cc.Node, tooltip: 'Masked container the tiles live in' })
    tileLayer: cc.Node = null!;

    @property({ type: cc.SpriteFrame, tooltip: 'Nine-sliced rounded panel, lit over the cells an aimed booster hits' })
    glowFrame: cc.SpriteFrame | null = null;

    @property
    stepX = 100;

    @property
    stepY = 100;

    @property({ tooltip: 'Width inside the frame, in design px. A wider board is scaled down' })
    maxWidth = 900;

    @property({ tooltip: 'Height inside the frame, in design px, the bevel of the top row included' })
    maxHeight = 1012;

    readonly cellTapped = new Signal<GridPos>();
    readonly cellPointed = new Signal<GridPos | null>();

    private boardLayout: BoardLayout | null = null;
    private board: ReadonlyBoard | null = null;
    private pool: TileNodePool = null!;
    private player: TurnPlayer = null!;
    private cues: TileCues = null!;
    private glows: CellGlows = null!;
    private readonly nodes = new Map<number, cc.Node>();
    private pressedCell: GridPos | null = null;
    private fingerCell: GridPos | null = null;
    private pointedCell: GridPos | null = null;
    /** Set while a deal or a turn plays: the tiles belong to the animations, cues and presses keep off. */
    private animating = false;
    // The engine sends no mouse events on phones (CCInputManager), so there the finger is the only pointer.
    private readonly fingerPoints = cc.sys.isMobile;
    /** Reused by every pointer event: mouse moves arrive many times a second. */
    private readonly localPoint = new cc.Vec2();
    private boardEffects: BoardEffects = new NoEffects();
    private boardSound: SoundBoard = new NoSound();

    get layout(): BoardLayout {
        if (this.boardLayout === null) {
            throw new Error('BoardView.render() was not called');
        }
        return this.boardLayout;
    }

    get effects(): BoardEffects {
        return this.boardEffects;
    }

    get sound(): SoundBoard {
        return this.boardSound;
    }

    /** Until this is called the board plays without effects and sound. */
    setPresentation(effects: BoardEffects, sound: SoundBoard): void {
        this.boardEffects = effects;
        this.boardSound = sound;
    }

    onLoad(): void {
        this.pool = new TileNodePool(this.skins, this.tileLayer);
        this.player = createTurnPlayer(this);
        this.cues = new TileCues(this);
        this.glows = new CellGlows(this.addGlowLayer(), this.glowFrame);
        if (this.glowFrame === null) {
            cc.warn('BoardView: no glowFrame, the booster preview stays invisible');
        }
        this.node.on(cc.Node.EventType.TOUCH_START, this.onTouchStart, this);
        this.node.on(cc.Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
        this.node.on(cc.Node.EventType.TOUCH_END, this.onTouchEnd, this);
        this.node.on(cc.Node.EventType.TOUCH_CANCEL, this.onTouchCancel, this);
        this.node.on(cc.Node.EventType.MOUSE_MOVE, this.onMouseMove, this);
        this.node.on(cc.Node.EventType.MOUSE_LEAVE, this.onMouseLeave, this);
    }

    onDestroy(): void {
        this.node.targetOff(this);
        this.cellTapped.clear();
        this.cellPointed.clear();
        this.pool.clear();
    }

    render(board: ReadonlyBoard): void {
        this.settleCues();
        this.nodes.forEach((node) => this.pool.release(node));
        this.nodes.clear();
        this.pressedCell = null;
        this.fingerCell = null;

        this.board = board;
        this.boardLayout = new BoardLayout(board.cols, board.rows, this.stepX, this.stepY);
        this.fitToFrame();
        this.fitMask();

        for (const p of board.positions()) {
            const tile = board.tileAt(p);
            if (tile !== null) {
                this.spawn(tile, p.col, p.row);
            }
        }
    }

    intro(): Promise<void> {
        return this.whileAnimating(() => this.dealIn());
    }

    play(steps: ReadonlyArray<TurnStep>): Promise<void> {
        return this.whileAnimating(() => this.player.play(steps));
    }

    rejectTap(at: GridPos): void {
        const tile = this.cueTile(at);
        if (tile !== null) {
            this.sound.play('reject');
            this.cues.shake(tile);
        }
    }

    markTargets(cells: ReadonlyArray<GridPos>): void {
        this.cues.mark(this.cueTiles(cells));
    }

    /** A finger covers the group it presses, and the squeeze already answers it: only a mouse lifts the group. */
    showTapPreview(cells: ReadonlyArray<GridPos>): void {
        this.cues.lift(this.fingerPoints ? [] : this.cueTiles(cells));
    }

    showBoosterPreview(cells: ReadonlyArray<GridPos>): void {
        const centers = this.cueTiles(cells).map((tile) => tile.rest);
        this.glows.show(centers, this.stepX, this.stepY);
    }

    showHint(cells: ReadonlyArray<GridPos>): void {
        this.cues.hint(this.cueTiles(cells));
    }

    clearHint(): void {
        this.cues.hint([]);
    }

    nodeOf(tileId: number): cc.Node {
        const node = this.nodes.get(tileId);
        if (node === undefined) {
            throw new Error(`No node for tile ${tileId}`);
        }
        return node;
    }

    spawn(tile: Tile, col: number, row: number): cc.Node {
        const node = this.pool.acquire(tile);
        const center = this.layout.cellCenter(col, row);
        // The mask only clears the bevel of the top row: a tile waiting above the board goes one bevel higher.
        const lift = row >= this.layout.rows ? TILE_BEVEL : 0;
        node.setPosition(center.x, center.y + lift);
        this.sortByRow(node, row);
        this.nodes.set(tile.id, node);
        return node;
    }

    remove(tileId: number): void {
        this.pool.release(this.nodeOf(tileId));
        this.nodes.delete(tileId);
    }

    /** Lower rows draw on top, so each bevel covers the bottom edge of the tile above it. */
    sortByRow(node: cc.Node, row: number): void {
        node.zIndex = this.layout.rows - row;
    }

    bringToFront(node: cc.Node): void {
        if (node.zIndex < FRONT_Z) {
            node.zIndex += FRONT_Z;
        }
    }

    shake(strength: number): void {
        const offset = 6 + 10 * strength;
        const target = this.tileLayer;
        cc.Tween.stopAllByTarget(target);
        target.setPosition(0, 0);
        cc.tween(target)
            .to(Timings.shake / 6, { x: offset })
            .to(Timings.shake / 3, { x: -offset })
            .to(Timings.shake / 3, { x: offset / 2 })
            .to(Timings.shake / 6, { x: 0 })
            .start();
    }

    wait(seconds: number): Promise<void> {
        return new Promise<void>((resolve) => this.scheduleOnce(() => resolve(), seconds));
    }

    /** Cues let go of the tiles first, and keep off them until the animation settles, failed or not. */
    private whileAnimating(run: () => Promise<void>): Promise<void> {
        this.settleCues();
        this.animating = true;
        const done = (): void => {
            this.animating = false;
        };
        // Through a promise, so a synchronous throw also unlocks the cues.
        return new Promise<void>((resolve) => resolve(run())).then(done, (error: unknown) => {
            done();
            throw error;
        });
    }

    private settleCues(): void {
        this.cues.reset();
        this.glows.clear();
    }

    /** Every column falls in from above the mask as one stack, which reads as the level being dealt. */
    private dealIn(): Promise<void> {
        const layout = this.layout;
        const board = this.board;
        if (board === null) {
            return Promise.resolve();
        }
        const thudded: number[] = [];
        const thud = (col: number) => () => {
            if (thudded.indexOf(col) < 0) {
                thudded.push(col);
                this.sound.play('land');
            }
        };
        this.sound.play('shuffle');
        const drops = board.positions().map((p) => {
            const tile = board.tileAt(p);
            const node = tile === null ? undefined : this.nodes.get(tile.id);
            if (node === undefined) {
                return Promise.resolve();
            }
            const start = layout.cellCenter(p.col, p.row + layout.rows);
            node.setPosition(start.x, start.y + TILE_BEVEL);
            const delay = p.col * IntroFeel.columnStagger + p.row * IntroFeel.rowStagger;
            return dropNode(node, layout.cellCenter(p.col, p.row), layout.rows, delay, thud(p.col));
        });
        return Promise.all(drops).then(() => undefined);
    }

    /** Valid only between turns: during a turn the model is already ahead of the nodes. */
    private nodeAt(cell: GridPos): cc.Node | null {
        const tile = this.board === null ? null : this.board.tileAt(cell);
        return tile === null ? null : this.nodes.get(tile.id) || null;
    }

    private cueTile(cell: GridPos): CueTile | null {
        const node = this.animating ? null : this.nodeAt(cell);
        return node === null ? null : { node, row: cell.row, rest: this.layout.cellCenter(cell.col, cell.row) };
    }

    private cueTiles(cells: ReadonlyArray<GridPos>): CueTile[] {
        const tiles: CueTile[] = [];
        cells.forEach((cell) => {
            const tile = this.cueTile(cell);
            if (tile !== null) {
                tiles.push(tile);
            }
        });
        return tiles;
    }

    /** Over the masked tiles and under the effects, wherever the scene puts those. */
    private addGlowLayer(): cc.Node {
        const layer = new cc.Node('Glows');
        layer.parent = this.node;
        layer.setSiblingIndex(this.tileLayer.getSiblingIndex() + 1);
        return layer;
    }

    /** Big boards shrink to fit the frame. Touches go through convertToNodeSpaceAR, so they follow the scale. */
    private fitToFrame(): void {
        const layout = this.layout;
        this.node.setContentSize(layout.width, layout.height);
        this.node.setScale(Math.min(1, this.maxWidth / layout.width, this.maxHeight / (layout.height + TILE_BEVEL)));
    }

    private fitMask(): void {
        const layout = this.layout;
        const height = layout.height + TILE_BEVEL + MASK_PADDING;
        this.tileLayer.setContentSize(layout.width + 2 * MASK_PADDING, height);
        // Moving the anchor, not the node, keeps the layer origin and every tile position at the board center.
        this.tileLayer.setAnchorPoint(0.5, (layout.height / 2 + MASK_PADDING) / height);
    }

    private onTouchStart(event: cc.Event.EventTouch): void {
        this.pressedCell = this.cellAt(event.getLocation());
        this.fingerOver(this.pressedCell);
    }

    private onTouchMove(event: cc.Event.EventTouch): void {
        const cell = this.cellAt(event.getLocation());
        if (!sameCell(cell, this.fingerCell)) {
            this.fingerOver(cell);
        }
    }

    /** A slide is not a tap: the finger has to come up over the cell it went down on. */
    private onTouchEnd(event: cc.Event.EventTouch): void {
        const pressed = this.pressedCell;
        const cell = this.cellAt(event.getLocation());
        this.liftFinger();
        if (pressed !== null && cell !== null && samePos(pressed, cell)) {
            this.cellTapped.dispatch(cell);
        }
    }

    private onTouchCancel(): void {
        this.liftFinger();
    }

    private liftFinger(): void {
        this.pressedCell = null;
        this.fingerOver(null);
    }

    /** The pressed tile looks pressed exactly while lifting the finger would tap it. */
    private fingerOver(cell: GridPos | null): void {
        this.fingerCell = cell;
        const pressed = this.pressedCell;
        this.cues.press(pressed !== null && sameCell(cell, pressed) ? this.cueTile(pressed) : null);
        if (this.fingerPoints) {
            this.point(cell);
        }
    }

    private onMouseMove(event: cc.Event.EventMouse): void {
        this.point(this.cellAt(event.getLocation()));
    }

    private onMouseLeave(): void {
        this.point(null);
    }

    private point(cell: GridPos | null): void {
        if (!sameCell(cell, this.pointedCell)) {
            this.pointedCell = cell;
            this.cellPointed.dispatch(cell);
        }
    }

    private cellAt(location: cc.Vec2): GridPos | null {
        if (this.boardLayout === null) {
            return null;
        }
        return this.layout.cellAt(this.node.convertToNodeSpaceAR(location, this.localPoint));
    }
}

function sameCell(a: GridPos | null, b: GridPos | null): boolean {
    return a === null || b === null ? a === b : samePos(a, b);
}
