import { TileColor } from '../../core/tiles/Tile';
import { Point } from '../BoardLayout';

/**
 * Effects drawn above the tiles and outside the mask, in board-local coordinates (BoardLayout points).
 * All fire-and-forget: no turn waits for an effect, so a lost one can never stall the game.
 */
export interface BoardEffects {
    /**
     * Glow, shards and sparkles where a tile burned. strength 0..1 scales the amount. crowd is how many tiles burst
     * in the same wave (1 by default): they share the particle budget, so the last of a 90-tile blast still bursts.
     */
    burst(at: Point, color: TileColor | null, strength: number, crowd?: number): void;
    /**
     * "+N" popping up over a burn, kept inside the board. chain is how many waves the burn set off (1 by default):
     * from 2 the popup grows and shows an "xN" badge. With a score target set, it then flies into the HUD score.
     */
    scorePopup(at: Point, points: number, chain?: number): void;
    /** Big praise word with a glow, above at when given, else in the upper part of the board. Always inside it. */
    praise(text: string, at?: Point): void;
    /** Expanding ring, used by bombs. */
    shockwave(at: Point, radius: number): void;
    /** Short full-board flash, used by the whole-field super tile. */
    flash(): void;
    /** A rocket head flying from one point to another in duration seconds, leaving a trail. */
    rocket(from: Point, to: Point, duration: number): void;
}
