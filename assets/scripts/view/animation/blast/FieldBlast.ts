import { BlastWave } from '../../../core/burn/BurnResolver';
import { Feel } from '../Feel';
import { chainWeight } from '../Impact';
import { popWave, PopStyles } from '../PopMotion';
import { TileStage } from '../TileStage';
import { Timings } from '../Timings';
import { BlastLook } from './BurnLooks';

/** The whole board goes: a flash and a wave of pops rolling out from the origin. */
export class FieldBlast implements BlastLook {
    play(wave: BlastWave, stage: TileStage, chain: number): Promise<void> {
        stage.effects.flash();
        stage.sound.play('field', chainWeight(chain));
        stage.shake(Feel.fieldShake);
        return popWave(
            stage,
            wave,
            (at) => stage.layout.distance(wave.origin, at) * Timings.fieldRipplePerCell,
            PopStyles.hit,
            Feel.fieldBurst,
        );
    }
}
