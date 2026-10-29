import { TurnStep } from '../../core/game/TurnStep';
import { StepAnimator, StepType } from './StepAnimator';
import { TileStage } from './TileStage';

/**
 * A step listed here starts together with the previous one when that one is of the given type:
 * new tiles fall in while old ones are still falling. Any other step waits for everything before it.
 */
const STARTS_WITH: { readonly [K in StepType]?: StepType } = { refill: 'fall' };

export class TurnPlayer {
    private readonly animators = new Map<StepType, StepAnimator>();

    constructor(private readonly stage: TileStage) {}

    register(animator: StepAnimator): this {
        this.animators.set(animator.type, animator);
        return this;
    }

    async play(steps: ReadonlyArray<TurnStep>): Promise<void> {
        let running: Array<Promise<void>> = [];
        let previous: StepType | null = null;
        for (const step of steps) {
            if (STARTS_WITH[step.type] !== previous) {
                await Promise.all(running);
                running = [];
            }
            running.push(this.animatorFor(step.type).play(step, this.stage));
            previous = step.type;
        }
        await Promise.all(running);
    }

    private animatorFor(type: StepType): StepAnimator {
        const animator = this.animators.get(type);
        if (animator === undefined) {
            throw new Error(`No animator registered for "${type}" steps`);
        }
        return animator;
    }
}
