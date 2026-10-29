import { CellRelease } from '../app/CellRelease';
import { BoardPresenter } from '../app/GameViews';
import { Signal } from '../app/Signal';
import { ReadonlyBoard } from '../core/board/Board';
import { GridPos } from '../core/board/GridPos';
import { TurnStep } from '../core/game/TurnStep';
import { RewardGroup } from '../core/rules/SuperTileRewards';
import { dealIn } from './animation/DealAnimation';
import { createTurnPlayer } from './animation/TurnAnimations';
import { TurnPlayer } from './animation/TurnPlayer';
import { SoundPlayer } from './audio/SoundPlayer';
import { BoardStage } from './board/BoardStage';
import { BoardPointer } from './board/BoardPointer';
import { BoardShake } from './board/BoardShake';
import { bindPointer } from './board/PointerEvents';
import { RestingCues, RestingTile } from './board/RestingCues';
import { TileNodePool } from './board/TileNodePool';
import { BoardLayout } from './BoardLayout';
import { BoardEffects } from './fx/BoardEffects';
import { SchedulerClock } from './SchedulerClock';
import { TILE_BEVEL } from './TileArt';
import { TileSkins } from './TileSkins';

const { ccclass, property } = cc._decorator;

/** Room for pops and shakes around the tile mask. Not on top, where refilled tiles wait hidden. */
const MASK_PADDING = 16;

/**
 * The board on screen. Assembles the stage the animations play on, the cues of the resting board and the pointer,
 * and sizes the board to its frame. The model is the source of truth: render() redraws from it at any time.
 */
@ccclass
export class BoardView extends cc.Component implements BoardPresenter {
    @property(TileSkins)
    skins: TileSkins = null!;

    @property({ type: cc.Node, tooltip: 'Masked container the tiles live in' })
    tileLayer: cc.Node = null!;

    @property({ type: cc.SpriteFrame, tooltip: 'Nine-sliced rounded panel, lit over booster targets and the hint' })
    glowFrame: cc.SpriteFrame | null = null;

    @property({ type: cc.SpriteFrame, tooltip: 'Soft round glow, lit behind resting super tiles' })
    superGlowFrame: cc.SpriteFrame | null = null;

    @property
    stepX = 100;

    @property
    stepY = 100;

    @property({ tooltip: 'Width inside the frame, in design px. A wider board is scaled down' })
    maxWidth = 900;

    @property({ tooltip: 'Height inside the frame, in design px, the bevel of the top row included' })
    maxHeight = 1012;

    // The engine sends no mouse events on phones (CCInputManager), so there the finger is the only pointer.
    private readonly fingerOnly = cc.sys.isMobile;
    private readonly pointer = new BoardPointer(this.fingerOnly);
    private stage: BoardStage = null!;
    private player: TurnPlayer = null!;
    private cues: RestingCues = null!;
    private board: ReadonlyBoard | null = null;
    private unbindPointer: () => void = () => undefined;
    /** Reused by every pointer event: mouse moves arrive many times a second. */
    private readonly localPoint = new cc.Vec2();

    get cellReleased(): Signal<CellRelease> {
        return this.pointer.released;
    }

    get cellPointed(): Signal<GridPos | null> {
        return this.pointer.pointed;
    }

    /** Until this is called the board plays without effects. */
    setEffects(effects: BoardEffects): void {
        this.stage.effects = effects;
    }

    /** Until this is called the board plays without sound. */
    setSound(sound: SoundPlayer): void {
        this.stage.sound = sound;
    }

    onLoad(): void {
        const clock = new SchedulerClock(this);
        this.stage = new BoardStage(
            new TileNodePool(this.skins, this.tileLayer),
            new BoardShake(this.tileLayer),
            clock,
        );
        this.player = createTurnPlayer(this.stage);
        const under = this.addLayer('UnderTiles', this.tileLayer.getSiblingIndex());
        const over = this.addLayer('OverTiles', this.tileLayer.getSiblingIndex() + 1);
        this.cues = new RestingCues(
            this.stage,
            { under, over },
            { panel: this.glowFrame, glow: this.superGlowFrame, superFrame: (kind) => this.skins.superFrame(kind) },
            clock,
            !this.fingerOnly,
        );
        this.warnAboutMissingArt();
        this.pointer.pressing.add((cell) => this.cues.press(cell));
        this.unbindPointer = bindPointer(this.node, this.pointer, (location) => this.cellAt(location));
    }

    onDestroy(): void {
        this.unbindPointer();
        this.pointer.clear();
        this.stage.destroy();
    }

    render(board: ReadonlyBoard): void {
        this.cues.settle();
        this.pointer.reset();
        this.board = board;
        const layout = new BoardLayout(board.cols, board.rows, this.stepX, this.stepY);
        this.stage.reset(layout);
        this.fitToFrame(layout);
        this.fitMask(layout);
        board.positions().forEach((p) => {
            const tile = board.tileAt(p);
            if (tile !== null) {
                this.stage.spawn(tile, p.col, p.row);
            }
        });
        this.rest(board);
    }

    intro(): Promise<void> {
        return this.animate((board) => dealIn(this.stage, board));
    }

    play(steps: ReadonlyArray<TurnStep>): Promise<void> {
        return this.animate(() => this.player.play(steps));
    }

    rejectTap(at: GridPos): void {
        if (this.cues.reject(at)) {
            this.stage.sound.play('reject');
        }
    }

    setAcceptingTaps(accepting: boolean): void {
        this.pointer.setAccepting(accepting);
    }

    showTargets(cells: ReadonlyArray<GridPos>): void {
        this.cues.showTargets(cells);
    }

    showTapPreview(cells: ReadonlyArray<GridPos>): void {
        this.cues.showTapPreview(cells);
    }

    showBoosterPreview(cells: ReadonlyArray<GridPos>): void {
        this.cues.showBoosterPreview(cells);
    }

    showHint(cells: ReadonlyArray<GridPos>): void {
        this.cues.showHint(cells);
    }

    /** Badges the groups that earn a super tile. Shown while the board rests, gone when the next turn starts. */
    showRewards(rewards: ReadonlyArray<RewardGroup>): void {
        this.cues.showRewards(rewards);
    }

    /** The cues let go of the tiles first, and take them back once the animation settles, failed or not. */
    private animate(run: (board: ReadonlyBoard) => Promise<void>): Promise<void> {
        const board = this.board;
        if (board === null) {
            return Promise.reject(new Error('BoardView.render() was not called'));
        }
        this.cues.settle();
        // Through a promise, so a synchronous throw also gives the tiles back.
        return new Promise<void>((resolve) => resolve(run(board))).then(
            () => this.rest(board),
            (error: unknown) => {
                this.rest(board);
                throw error;
            },
        );
    }

    /** The nodes agree with the model again, so the cues may take the tiles. */
    private rest(board: ReadonlyBoard): void {
        if (!this.isValid) {
            return;
        }
        const layout = this.stage.layout;
        const tiles: RestingTile[] = [];
        board.positions().forEach((cell) => {
            const tile = board.tileAt(cell);
            const node = tile === null ? null : this.stage.find(tile.id);
            if (tile !== null && node !== null) {
                const rest = layout.cellCenter(cell.col, cell.row);
                tiles.push({ node, cell, row: cell.row, rest, superKind: tile.superKind });
            }
        });
        this.cues.rest(tiles, layout);
    }

    /** Big boards shrink to fit the frame. Touches go through convertToNodeSpaceAR, so they follow the scale. */
    private fitToFrame(layout: BoardLayout): void {
        this.node.setContentSize(layout.width, layout.height);
        this.node.setScale(Math.min(1, this.maxWidth / layout.width, this.maxHeight / (layout.height + TILE_BEVEL)));
    }

    private fitMask(layout: BoardLayout): void {
        const height = layout.height + TILE_BEVEL + MASK_PADDING;
        this.tileLayer.setContentSize(layout.width + 2 * MASK_PADDING, height);
        // Moving the anchor, not the node, keeps the layer origin and every tile position at the board center.
        this.tileLayer.setAnchorPoint(0.5, (layout.height / 2 + MASK_PADDING) / height);
    }

    private addLayer(name: string, siblingIndex: number): cc.Node {
        const layer = new cc.Node(name);
        layer.parent = this.node;
        layer.setSiblingIndex(siblingIndex);
        return layer;
    }

    private cellAt(location: cc.Vec2): GridPos | null {
        if (this.board === null) {
            return null;
        }
        return this.stage.layout.cellAt(this.node.convertToNodeSpaceAR(location, this.localPoint));
    }

    /** Cues are decoration: missing art leaves one invisible, it does not stop the game. */
    private warnAboutMissingArt(): void {
        if (this.glowFrame === null) {
            cc.warn('BoardView: no glowFrame, booster targets and the hint glow stay invisible');
        }
        if (this.superGlowFrame === null) {
            cc.warn('BoardView: no superGlowFrame, super tiles rest without their glow');
        }
    }
}
