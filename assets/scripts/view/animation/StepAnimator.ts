import { TurnStep } from '../../core/game/TurnStep';
import { TurnStage } from './TileStage';

export type StepType = TurnStep['type'];
export type StepOfType<K extends StepType> = Extract<TurnStep, { type: K }>;

/** Plays one kind of turn step. A new step type means a new animator, the player stays untouched. */
export interface StepAnimator<K extends StepType = StepType> {
    readonly type: K;
    play(step: StepOfType<K>, stage: TurnStage): Promise<void>;
}

/**
 * Resolves when the tween ends. A destroyed node never runs its tween, so it resolves at once:
 * a turn must not hang and leave input locked forever.
 * Invariant: nothing stops a tween that is being awaited (stopAllByTarget drops the final call).
 */
export function playTween(node: cc.Node, tween: cc.Tween): Promise<void> {
    if (!node.isValid) {
        return Promise.resolve();
    }
    return new Promise<void>((resolve) => {
        tween.call(() => resolve()).start();
    });
}
