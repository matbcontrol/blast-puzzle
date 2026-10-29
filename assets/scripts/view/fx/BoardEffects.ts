import { TileColor } from '../../core/tiles/Tile';
import { Point } from '../BoardLayout';

/**
 * Effects drawn above the tiles and outside the mask, in board-local coordinates.
 * Fire-and-forget, except where a Promise tells the caller when the effect is done.
 */
export interface BoardEffects {
    /** Shards and sparkles where a tile burned. strength 0..1 scales the amount. */
    burst(at: Point, color: TileColor | null, strength: number): void;
    /** "+N" rising from the burn and fading out. */
    scorePopup(at: Point, points: number): void;
    /** Big praise text in the middle of the board ("Отлично!"). */
    praise(text: string): void;
    /** Expanding ring, used by bombs. */
    shockwave(at: Point, radius: number): void;
    /** Short full-board flash, used by the whole-field super tile. */
    flash(): void;
    /** A rocket flying from one point to another with a trail. Resolves when it arrives. */
    rocket(from: Point, to: Point, duration: number): Promise<void>;
    /** Celebration over the whole board. */
    confetti(): void;
}
