import { GridPos } from '../../core/board/GridPos';
import { BurnedTile } from '../../core/burn/BurnResolver';
import { BurnStep } from '../../core/game/TurnStep';
import { playTween, StepAnimator } from './StepAnimator';
import { TileStage } from './TileStage';
import { Timings } from './Timings';

const SHAKE_FROM_TILES = 6;

/** Tiles pop and shrink in a ripple from the origin. Chain reactions play wave after wave. */
export class BurnAnimator implements StepAnimator<'burn'> {
    readonly type = 'burn';

    async play(step: BurnStep, stage: TileStage): Promise<void> {
        const waves = step.waves.filter((wave) => wave.tiles.length > 0);
        for (let i = 0; i < waves.length; i++) {
            const wave = waves[i];
            if (i > 0) {
                await stage.wait(Timings.waveGap);
            }
            if (wave.tiles.length >= SHAKE_FROM_TILES) {
                stage.shake(Math.min(1, wave.tiles.length / 20));
            }
            await Promise.all(wave.tiles.map((burned) => this.burnTile(stage, burned, wave.origin)));
        }
    }

    private burnTile(stage: TileStage, burned: BurnedTile, origin: GridPos): Promise<void> {
        const node = stage.nodeOf(burned.tile.id);
        const delay = stage.layout.distance(origin, burned.at) * Timings.burnRipplePerCell;
        stage.bringToFront(node);
        return playTween(
            node,
            cc
                .tween(node)
                .delay(delay)
                .to(Timings.burnPop, { scale: 1.18 }, { easing: 'quadOut' })
                .to(Timings.burnShrink, { scale: 0, opacity: 0 }, { easing: 'backIn' }),
        ).then(() => stage.remove(burned.tile.id));
    }
}
