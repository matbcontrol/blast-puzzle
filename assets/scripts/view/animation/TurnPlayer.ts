import { TurnStep } from '../../core/game/TurnStep';
import { StepAnimator, StepType } from './StepAnimator';
import { TileStage } from './TileStage';

/** Steps that start together with the previous one: new tiles fall in while old ones are still falling. */
const RUNS_WITH_PREVIOUS: StepType[] = ['refill'];

export class TurnPlayer {
    private readonly animators = new Map<StepType, StepAnimator>();

    constructor(private readonly stage: TileStage) {}

    register(animator: StepAnimator): this {
        this.animators.set(animator.type, animator);
        return this;
    }

    async play(steps: ReadonlyArray<TurnStep>): Promise<void> {
        let running: Array<Promise<void>> = [];
        for (const step of steps) {
            if (RUNS_WITH_PREVIOUS.indexOf(step.type) < 0) {
                await Promise.all(running);
                running = [];
            }
            running.push(this.animatorFor(step.type).play(step, this.stage));
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
