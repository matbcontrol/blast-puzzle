import { Tile } from '../../core/tiles/Tile';
import { BoardLayout } from '../BoardLayout';

/** What step animators may do with the board view. Narrow on purpose: animators only move tile nodes. */
export interface TileStage {
    readonly layout: BoardLayout;
    nodeOf(tileId: number): cc.Node;
    spawn(tile: Tile, col: number, row: number): cc.Node;
    remove(tileId: number): void;
    sortByRow(node: cc.Node, row: number): void;
    /** Draws the node above every resting tile until the next sortByRow. */
    bringToFront(node: cc.Node): void;
    shake(strength: number): void;
    /** Driven by the engine clock, so it pauses together with the game. */
    wait(seconds: number): Promise<void>;
}
