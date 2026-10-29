import { GridPos } from '../../../core/board/GridPos';
import { BurnWave } from '../../../core/burn/BurnResolver';
import { Feel } from '../Feel';
import { popWave, PopStyles } from '../PopMotion';
import { TileStage } from '../TileStage';
import { Timings } from '../Timings';
import { BlastPresenter } from './BlastPresenters';

/** A shockwave from the origin, the tiles pop ring by ring, and the board shakes hard. */
export class BombBlast implements BlastPresenter {
    play(wave: BurnWave, stage: TileStage): Promise<void> {
        const layout = stage.layout;
        // Bombs burn a square, so a ring is every cell at the same Chebyshev distance.
        const ringOf = (at: GridPos) =>
            Math.max(Math.abs(at.col - wave.origin.col), Math.abs(at.row - wave.origin.row));
        const rings = wave.tiles.reduce((most, burned) => Math.max(most, ringOf(burned.at)), 0);
        // Out to the far edge of the last ring.
        const reach = (rings + 0.5) * Math.max(layout.stepX, layout.stepY);

        stage.effects.shockwave(layout.cellCenter(wave.origin.col, wave.origin.row), reach);
        stage.sound.play('bomb');
        stage.shake(Feel.bombShake);
        return popWave(stage, wave, (at) => ringOf(at) * Timings.bombRing, PopStyles.hit, Feel.hitBurst);
    }
}
