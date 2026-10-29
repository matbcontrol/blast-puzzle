import { SuperKinds } from '../../core/tiles/SuperKinds';
import { BlastPresenters } from './blast/BlastPresenters';
import { BombBlast } from './blast/BombBlast';
import { FieldBlast } from './blast/FieldBlast';
import { PopBlast } from './blast/PopBlast';
import { RocketBlast } from './blast/RocketBlast';
import { BurnAnimator } from './BurnAnimator';
import { FallAnimator } from './FallAnimator';
import { RefillAnimator } from './RefillAnimator';
import { ShuffleAnimator } from './ShuffleAnimator';
import { SuperCreatedAnimator } from './SuperCreatedAnimator';
import { SwapAnimator } from './SwapAnimator';
import { TileStage } from './TileStage';
import { TurnPlayer } from './TurnPlayer';

/**
 * Composition root of the turn animations: one register() per step type and one per blast look.
 * The bomb booster reports the same blast id as the bomb super tile, so the two share a look.
 */
export function createTurnPlayer(stage: TileStage): TurnPlayer {
    const blasts = new BlastPresenters(new PopBlast())
        .register(SuperKinds.Row, new RocketBlast('row'))
        .register(SuperKinds.Column, new RocketBlast('column'))
        .register(SuperKinds.Bomb, new BombBlast())
        .register(SuperKinds.Field, new FieldBlast());

    return new TurnPlayer(stage)
        .register(new BurnAnimator(blasts))
        .register(new SuperCreatedAnimator())
        .register(new SwapAnimator())
        .register(new FallAnimator())
        .register(new RefillAnimator())
        .register(new ShuffleAnimator());
}
