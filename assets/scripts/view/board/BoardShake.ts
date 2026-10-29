import { Feel } from '../animation/Feel';
import { Timings } from '../animation/Timings';
import { TweenSlot } from '../TweenSlot';

/** Shakes the tile layer on both axes, dying down over Timings.shake. The layer rests at the board origin. */
export class BoardShake {
    private readonly slot = new TweenSlot();
    /** Of the shake running now, 0 when none runs. */
    private strength = 0;

    constructor(private readonly layer: cc.Node) {}

    /** strength 0..1. A weaker shake does not cut a stronger one short, so a chain keeps its biggest hit. */
    shake(strength: number): void {
        if (strength < this.strength) {
            return;
        }
        this.strength = strength;
        const feel = Feel.shake;
        const amplitude = feel.min + (feel.max - feel.min) * Math.min(1, Math.max(0, strength));
        const step = Timings.shake / feel.path.length;
        this.layer.setPosition(0, 0);
        const path = feel.path.reduce(
            (tween, key) => tween.to(step, { x: key.x * amplitude, y: key.y * amplitude }, { easing: 'sineInOut' }),
            cc.tween(this.layer),
        );
        this.slot.play(path.call(() => (this.strength = 0)));
    }

    stop(): void {
        this.slot.stop();
        this.strength = 0;
        this.layer.setPosition(0, 0);
    }
}
