import { Signal } from '../app/Signal';
import { pressDown, pulse, PulseShape, springTo } from './Tweens';
import { TweenSlot } from './TweenSlot';

const { ccclass, property } = cc._decorator;

/** How every button answers a finger: the scale it sinks to and the seconds down and back. */
export const PressFeel = {
    pressedScale: 0.9,
    press: 0.05,
    release: 0.24,
};

/**
 * The one press feel of every button. Sits on the node that takes the touches and sinks its target under the finger;
 * on release the target springs back to rest, or into the idle pulse its button set.
 */
@ccclass
export class PressFeedback extends cc.Component {
    @property({
        type: cc.Node,
        tooltip: 'Sinks under the finger. Empty: this node. A child keeps the touch area still',
    })
    target: cc.Node | null = null;

    /** A press let go over the button. */
    readonly pressed = new Signal<void>();

    private idle: PulseShape | null = null;
    private readonly scaling = new TweenSlot();

    onLoad(): void {
        this.node.on(cc.Node.EventType.TOUCH_START, this.sink, this);
        this.node.on(cc.Node.EventType.TOUCH_END, this.release, this);
        this.node.on(cc.Node.EventType.TOUCH_CANCEL, this.settle, this);
    }

    onDestroy(): void {
        this.node.targetOff(this);
        this.scaling.stop();
        this.pressed.clear();
    }

    /** The pulse the target breathes in between presses, or null to rest still. Takes over at once. */
    setIdle(shape: PulseShape | null): void {
        this.idle = shape;
        this.settle();
    }

    private sink(): void {
        this.scaling.play(pressDown(this.scaled, PressFeel.pressedScale, PressFeel.press));
    }

    private release(): void {
        this.settle();
        this.pressed.dispatch();
    }

    private settle(): void {
        const node = this.scaled;
        this.scaling.play(this.idle === null ? springTo(node, 1, PressFeel.release) : pulse(node, 'scale', this.idle));
    }

    private get scaled(): cc.Node {
        return this.target === null ? this.node : this.target;
    }
}
