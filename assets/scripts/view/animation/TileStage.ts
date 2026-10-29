import { Tile } from '../../core/tiles/Tile';
import { SoundPlayer } from '../audio/SoundPlayer';
import { BoardLayout } from '../BoardLayout';
import { BoardEffects } from '../fx/BoardEffects';

/** What tile animations may do with the board view. Narrow on purpose: move tile nodes, fire effects and sounds. */
export interface TileStage {
    readonly layout: BoardLayout;
    /** Particles, popups and flashes above the tiles, at BoardLayout points. */
    readonly effects: BoardEffects;
    readonly sound: SoundPlayer;
    nodeOf(tileId: number): cc.Node;
    spawn(tile: Tile, col: number, row: number): cc.Node;
    remove(tileId: number): void;
    sortByRow(node: cc.Node, row: number): void;
    /** Draws the node above every resting tile until the next sortByRow. */
    bringToFront(node: cc.Node): void;
    /** strength 0..1. A weaker shake does not cut a stronger one short. */
    shake(strength: number): void;
    /** Driven by the engine clock, so it pauses together with the game. */
    wait(seconds: number): Promise<void>;
}

/** The stage while a turn plays. */
export interface TurnStage extends TileStage {
    /** Resolves once nothing that started earlier in the turn still burns or appears in this column. */
    columnSettled(col: number): Promise<void>;
}
