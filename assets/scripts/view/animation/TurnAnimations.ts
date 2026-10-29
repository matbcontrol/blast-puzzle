import { SuperKinds } from '../../core/tiles/SuperKinds';
import { BombBlast } from './blast/BombBlast';
import { BlastLooks } from './blast/BurnLooks';
import { FieldBlast } from './blast/FieldBlast';
import { GroupPop } from './blast/GroupPop';
import { RocketBlast } from './blast/RocketBlast';
import { BonusSuperAnimator } from './BonusSuperAnimator';
import { BurnAnimator } from './BurnAnimator';
import { FallAnimator } from './FallAnimator';
import { RefillAnimator } from './RefillAnimator';
import { ShuffleAnimator } from './ShuffleAnimator';
import { SuperCreatedAnimator } from './SuperCreatedAnimator';
import { SwapAnimator } from './SwapAnimator';
import { TileStage } from './TileStage';
import { TurnPlayer } from './TurnPlayer';

/** One look per super tile kind. The bomb booster reports its explosion as a bomb, so it shares the bomb's look. */
export function createBlastLooks(): BlastLooks {
    return {
        [SuperKinds.Row]: new RocketBlast('row'),
        [SuperKinds.Column]: new RocketBlast('column'),
        [SuperKinds.Bomb]: new BombBlast(),
        [SuperKinds.Field]: new FieldBlast(),
    };
}

/** Composition root of the turn animations: one register() per step type. */
export function createTurnPlayer(stage: TileStage): TurnPlayer {
    return new TurnPlayer(stage)
        .register(new BurnAnimator(new GroupPop(), createBlastLooks()))
        .register(new SuperCreatedAnimator())
        .register(new BonusSuperAnimator())
        .register(new SwapAnimator())
        .register(new FallAnimator())
        .register(new RefillAnimator())
        .register(new ShuffleAnimator());
}
