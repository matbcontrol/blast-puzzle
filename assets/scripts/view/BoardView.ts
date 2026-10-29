import { BoardPresenter } from '../app/GameViews';
import { Signal } from '../app/Signal';
import { ReadonlyBoard } from '../core/board/Board';
import { GridPos } from '../core/board/GridPos';
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
import { BoardLayout } from './BoardLayout';
import { TileNodePool } from './TileNodePool';
import { TileSkins } from './TileSkins';

const { ccclass, property } = cc._decorator;

/** Bevel of the tile sprite that sticks out above the top row and must not be clipped. */
const TOP_OVERHANG = 12;

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

    readonly cellTapped = new Signal<GridPos>();

    private boardLayout: BoardLayout | null = null;
    private board: ReadonlyBoard | null = null;
    private pool: TileNodePool = null!;
    private player: TurnPlayer = null!;
    private readonly nodes = new Map<number, cc.Node>();
    private marked: cc.Node[] = [];

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
        this.node.on(cc.Node.EventType.TOUCH_END, this.onTouchEnd, this);
    }

    onDestroy(): void {
        this.node.off(cc.Node.EventType.TOUCH_END, this.onTouchEnd, this);
        this.cellTapped.clear();
        this.pool.clear();
    }

    render(board: ReadonlyBoard): void {
        this.nodes.forEach((node) => this.pool.release(node));
        this.nodes.clear();
        this.marked = [];

        this.board = board;
        this.boardLayout = new BoardLayout(board.cols, board.rows, this.stepX, this.stepY);
        this.node.setContentSize(this.layout.width, this.layout.height);
        this.tileLayer.setContentSize(this.layout.width, this.layout.height + 2 * TOP_OVERHANG);

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
        const tile = this.nodeAt(at);
        if (tile === null) {
            return;
        }
        const x = tile.x;
        cc.Tween.stopAllByTarget(tile);
        cc.tween(tile)
            .to(Timings.reject / 4, { x: x - 8 })
            .to(Timings.reject / 2, { x: x + 8 })
            .to(Timings.reject / 4, { x })
            .start();
    }

    markTargets(cells: ReadonlyArray<GridPos>): void {
        this.marked.forEach((node) => {
            cc.Tween.stopAllByTarget(node);
            node.setScale(1);
        });
        this.marked = [];
        for (const cell of cells) {
            const node = this.nodeAt(cell);
            if (node !== null) {
                cc.tween(node)
                    .repeatForever(cc.tween().to(0.35, { scale: 1.12 }).to(0.35, { scale: 1 }))
                    .start();
                this.marked.push(node);
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
        node.setPosition(center.x, center.y);
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

    /** Read only between turns, when the model and the nodes agree. */
    wait(seconds: number): Promise<void> {
        return new Promise<void>((resolve) => this.scheduleOnce(() => resolve(), seconds));
    }

    private nodeAt(cell: GridPos): cc.Node | null {
        const tile = this.board === null ? null : this.board.tileAt(cell);
        return tile === null ? null : this.nodes.get(tile.id) || null;
    }

    private onTouchEnd(event: cc.Event.EventTouch): void {
        if (this.boardLayout === null) {
            return;
        }
        const local = this.node.convertToNodeSpaceAR(event.getLocation());
        const cell = this.layout.cellAt(local);
        if (cell !== null) {
            this.cellTapped.dispatch(cell);
        }
    }
}
