import { GridPos } from '../../core/board/GridPos';
import { BurnedTile, BurnWave } from '../../core/burn/BurnResolver';
import { Feel } from './Feel';
import { playTween } from './StepAnimator';
import { TileStage } from './TileStage';
import { Timings } from './Timings';

export interface PopStyle {
    /** Scale the tile swells to before it pops. */
    readonly swell: number;
    readonly swellTime: number;
    readonly popTime: number;
}

export const PopStyles = {
    /** A tapped group squeezes first, so the tap reads as the cause. */
    group: { swell: Feel.burnSqueezeScale, swellTime: Timings.burnSqueeze, popTime: Timings.burnPop },
    /** Caught in an explosion: hardly any wind-up. */
    hit: { swell: Feel.hitSwellScale, swellTime: Timings.hitSwell, popTime: Timings.hitPop },
    /** Picked by a leftover move: a big bright swell, so the eye finds the tile before its rocket goes. */
    bonus: { swell: Feel.bonusSwellScale, swellTime: Timings.bonusSwell, popTime: Timings.bonusPop },
};

/**
 * Swells the tile, bursts it at the peak and shrinks it away. Resolves once the node is back in the pool.
 * crowd is how many tiles burst in the same wave: they share the particle budget.
 */
export function popTile(
    stage: TileStage,
    burned: BurnedTile,
    delay: number,
    style: PopStyle,
    strength: number,
    crowd = 1,
): Promise<void> {
    const node = stage.nodeOf(burned.tile.id);
    const at = stage.layout.cellCenter(burned.at.col, burned.at.row);
    stage.bringToFront(node);
    return playTween(
        node,
        cc
            .tween(node)
            .delay(delay)
            .to(style.swellTime, { scale: style.swell }, { easing: 'quadOut' })
            .call(() => stage.effects.burst(at, burned.tile.color, strength, crowd))
            .to(style.popTime, { scale: 0, opacity: 0 }, { easing: 'backIn' }),
    ).then(() => stage.remove(burned.tile.id));
}

/** Pops every tile of the wave, each after its own delay, which is how blasts differ in rhythm. */
export async function popWave(
    stage: TileStage,
    wave: BurnWave,
    delayOf: (at: GridPos) => number,
    style: PopStyle,
    strength: number,
): Promise<void> {
    const crowd = wave.tiles.length;
    await Promise.all(wave.tiles.map((burned) => popTile(stage, burned, delayOf(burned.at), style, strength, crowd)));
}
