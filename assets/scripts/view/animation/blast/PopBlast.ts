import { BurnWave } from '../../../core/burn/BurnResolver';
import { groupBurst, groupWeight, shakeForGroup } from '../GroupImpact';
import { popWave, PopStyles } from '../PopMotion';
import { TileStage } from '../TileStage';
import { Timings } from '../Timings';
import { BlastPresenter } from './BlastPresenters';

/** The plain pop: tiles squeeze and burst in a ripple from the tapped cell. */
export class PopBlast implements BlastPresenter {
    play(wave: BurnWave, stage: TileStage): Promise<void> {
        const size = wave.tiles.length;
        stage.sound.play('pop', groupWeight(size));
        shakeForGroup(stage, size);
        return popWave(
            stage,
            wave,
            (at) => stage.layout.distance(wave.origin, at) * Timings.burnRipplePerCell,
            PopStyles.group,
            groupBurst(size),
        );
    }
}
