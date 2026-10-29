import { BoardPresenter } from '../app/GameViews';
import { Signal } from '../app/Signal';
import { ReadonlyBoard } from '../core/board/Board';
import { GridPos, samePos } from '../core/board/GridPos';
import { TurnStep } from '../core/game/TurnStep';
import { Tile } from '../core/tiles/Tile';
import { BurnAnimator } from './animation/BurnAnimator';
import { FallAnimator } from './animation/FallAnimator';
import { RefillAnimator } from './animation/RefillAnimator';
import { ShuffleAnimator } from './animation/ShuffleAnimator';
import { SuperCreatedAnimator } from './animation/SuperCreatedAnimator';
import { SwapAnimator } from './animation/SwapAnimator';
import { TileStage } from './animation/TileStage';
import { Timings } from './animation/Timings';
import { TurnPlayer } from './animation/TurnPlayer';
import { BoardLayout, Point } from './BoardLayout';
import { TILE_BEVEL } from './TileArt';
import { TileNodePool } from './TileNodePool';
import { TileSkins } from './TileSkins';

const { ccclass, property } = cc._decorator;

/** Room for pops and shakes around the tile mask. Not on top, where refilled tiles wait hidden. */
const MASK_PADDING = 16;

/** Added to the row order, so lifted tiles draw above resting ones and keep their order among themselves. */
const FRONT_Z = 1000;

interface MarkedTile {
    readonly node: cc.Node;
    readonly rest: Point;
}

@ccclass
export class BoardView extends cc.Component implements BoardPresenter, TileStage {
    @property(TileSkins)
    skins: TileSkins = null!;

    @property({ type: cc.Node, tooltip: 'Masked container the tiles live in' })
    tileLayer: cc.Node = null!;

    @property
    stepX = 100;

    @property
    stepY = 100;

    @property({ tooltip: 'Width inside the frame, in design px. A wider board is scaled down' })
    maxWidth = 900;

    @property({ tooltip: 'Height inside the frame, in design px, the bevel of the top row included' })
    maxHeight = 1012;

    readonly cellTapped = new Signal<GridPos>();

    private boardLayout: BoardLayout | null = null;
    private board: ReadonlyBoard | null = null;
    private pool: TileNodePool = null!;
    private player: TurnPlayer = null!;
    private readonly nodes = new Map<number, cc.Node>();
    private marked: MarkedTile[] = [];
    private pressedCell: GridPos | null = null;

    get layout(): BoardLayout {
        if (this.boardLayout === null) {
            throw new Error('BoardView.render() was not called');
        }
        return this.boardLayout;
    }

    onLoad(): void {
        this.pool = new TileNodePool(this.skins, this.tileLayer);
        this.player = new TurnPlayer(this)
            .register(new BurnAnimator())
            .register(new SuperCreatedAnimator())
            .register(new SwapAnimator())
            .register(new FallAnimator())
            .register(new RefillAnimator())
            .register(new ShuffleAnimator());
        this.node.on(cc.Node.EventType.TOUCH_START, this.onTouchStart, this);
        this.node.on(cc.Node.EventType.TOUCH_END, this.onTouchEnd, this);
        this.node.on(cc.Node.EventType.TOUCH_CANCEL, this.onTouchCancel, this);
    }

    onDestroy(): void {
        this.node.targetOff(this);
        this.cellTapped.clear();
        this.pool.clear();
    }

    render(board: ReadonlyBoard): void {
        this.nodes.forEach((node) => this.pool.release(node));
        this.nodes.clear();
        this.marked = [];
        this.pressedCell = null;

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

    play(steps: ReadonlyArray<TurnStep>): Promise<void> {
        return this.player.play(steps);
    }

    rejectTap(at: GridPos): void {
        const node = this.nodeAt(at);
        if (node === null) {
            return;
        }
        // Shake around the cell, not around node.x: a fast second tap would catch the tile mid-shake.
        const rest = this.layout.cellCenter(at.col, at.row);
        this.settle(node, rest);
        cc.tween(node)
            .to(Timings.reject / 4, { x: rest.x - 8 })
            .to(Timings.reject / 2, { x: rest.x + 8 })
            .to(Timings.reject / 4, { x: rest.x })
            .start();
    }

    markTargets(cells: ReadonlyArray<GridPos>): void {
        this.marked.forEach((mark) => this.settle(mark.node, mark.rest));
        this.marked = [];
        for (const cell of cells) {
            const node = this.nodeAt(cell);
            if (node !== null) {
                cc.tween(node)
                    .repeatForever(
                        cc
                            .tween()
                            .to(Timings.targetPulse / 2, { scale: 1.12 })
                            .to(Timings.targetPulse / 2, { scale: 1 }),
                    )
                    .start();
                this.marked.push({ node, rest: this.layout.cellCenter(cell.col, cell.row) });
            }
        }
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

    /** Valid only between turns: during a turn the model is already ahead of the nodes. */
    private nodeAt(cell: GridPos): cc.Node | null {
        const tile = this.board === null ? null : this.board.tileAt(cell);
        return tile === null ? null : this.nodes.get(tile.id) || null;
    }

    private settle(node: cc.Node, rest: Point): void {
        cc.Tween.stopAllByTarget(node);
        node.setScale(1);
        node.setPosition(rest.x, rest.y);
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
        this.pressedCell = this.cellUnder(event);
    }

    /** A slide is not a tap: the finger has to come up over the cell it went down on. */
    private onTouchEnd(event: cc.Event.EventTouch): void {
        const pressed = this.pressedCell;
        this.pressedCell = null;
        const cell = this.cellUnder(event);
        if (pressed !== null && cell !== null && samePos(pressed, cell)) {
            this.cellTapped.dispatch(cell);
        }
    }

    private onTouchCancel(): void {
        this.pressedCell = null;
    }

    private cellUnder(event: cc.Event.EventTouch): GridPos | null {
        if (this.boardLayout === null) {
            return null;
        }
        return this.layout.cellAt(this.node.convertToNodeSpaceAR(event.getLocation()));
    }
}
