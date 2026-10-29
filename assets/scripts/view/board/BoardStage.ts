import { Clock } from '../../app/Clock';
import { Tile } from '../../core/tiles/Tile';
import { TileStage } from '../animation/TileStage';
import { NoSound, SoundPlayer } from '../audio/SoundPlayer';
import { BoardLayout } from '../BoardLayout';
import { BoardEffects } from '../fx/BoardEffects';
import { NoEffects } from '../fx/NoEffects';
import { TILE_BEVEL } from '../TileArt';
import { BoardShake } from './BoardShake';
import { TileDepth } from './TileCues';
import { TileNodePool } from './TileNodePool';

/** Added to the row order, so lifted tiles draw above resting ones and keep their order among themselves. */
const FRONT_Z = 1000;

/** The tile nodes of the board by tile id, and everything the animations may do with them. */
export class BoardStage implements TileStage, TileDepth {
    effects: BoardEffects = new NoEffects();
    sound: SoundPlayer = new NoSound();
    private boardLayout: BoardLayout | null = null;
    private readonly nodes = new Map<number, cc.Node>();

    constructor(
        private readonly pool: TileNodePool,
        private readonly shaker: BoardShake,
        private readonly clock: Clock,
    ) {}

    get layout(): BoardLayout {
        if (this.boardLayout === null) {
            throw new Error('BoardView.render() was not called');
        }
        return this.boardLayout;
    }

    /** A new board: every tile node goes back to the pool. */
    reset(layout: BoardLayout): void {
        this.nodes.forEach((node) => this.pool.release(node));
        this.nodes.clear();
        this.shaker.stop();
        this.boardLayout = layout;
    }

    /** Valid only between turns: during a turn the model is already ahead of the nodes. */
    find(tileId: number): cc.Node | null {
        return this.nodes.get(tileId) || null;
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
        this.shaker.shake(strength);
    }

    wait(seconds: number): Promise<void> {
        return new Promise<void>((resolve) => {
            this.clock.schedule(seconds, () => resolve());
        });
    }

    destroy(): void {
        this.shaker.stop();
        this.pool.clear();
    }
}
