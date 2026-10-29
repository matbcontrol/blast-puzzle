import { Clock } from '../app/Clock';

/** Clock on a component's scheduler: it pauses with the game and stops with the component. */
export class SchedulerClock implements Clock {
    constructor(private readonly owner: cc.Component) {}

    schedule(seconds: number, fn: () => void): () => void {
        // A fresh callback per call: the scheduler would merge a repeated function into one timer.
        const callback = (): void => fn();
        this.owner.scheduleOnce(callback, seconds);
        return () => this.owner.unschedule(callback);
    }
}
