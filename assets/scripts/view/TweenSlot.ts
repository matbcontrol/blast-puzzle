/**
 * Holds one running tween. Playing the next one stops it and nothing else on the target,
 * so tweens of different properties on one node run side by side.
 */
export class TweenSlot {
    private running: cc.Tween | null = null;

    play(tween: cc.Tween): void {
        this.stop();
        this.running = tween;
        tween.start();
    }

    stop(): void {
        if (this.running !== null) {
            this.running.stop();
            this.running = null;
        }
    }
}
