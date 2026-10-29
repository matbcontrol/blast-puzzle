import { BurnWave } from '../../../core/burn/BurnResolver';
import { Texts } from '../../Texts';
import { Feel } from '../Feel';
import { popWave, PopStyles } from '../PopMotion';
import { TileStage } from '../TileStage';
import { Timings } from '../Timings';
import { BlastPresenter } from './BlastPresenters';

/** The whole board goes: a flash, the loudest praise and a wave of pops rolling out from the origin. */
export class FieldBlast implements BlastPresenter {
    play(wave: BurnWave, stage: TileStage): Promise<void> {
        stage.effects.flash();
        stage.effects.praise(Texts.praise.incredible);
        stage.sound.play('field');
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
