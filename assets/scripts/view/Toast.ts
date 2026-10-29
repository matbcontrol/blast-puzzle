import { TweenSlot } from './TweenSlot';

const { ccclass, property } = cc._decorator;

/** Seconds, scale and px of a toast. */
export const ToastFeel = {
    popFrom: 0.6,
    appear: 0.22,
    /** Long enough to read a short sentence at a glance. */
    hold: 1.1,
    leave: 0.25,
    rise: 30,
};

/** A short message on a plate that pops up, stays a moment and floats away. It takes no touches. */
@ccclass
export class Toast extends cc.Component {
    @property(cc.Label)
    label: cc.Label = null!;

    private restY = 0;
    private readonly motion = new TweenSlot();

    onLoad(): void {
        this.restY = this.node.y;
        this.node.opacity = 0;
    }

    onDestroy(): void {
        this.motion.stop();
    }

    show(text: string): void {
        const node = this.node;
        this.label.string = text;
        node.setPosition(node.x, this.restY);
        node.setScale(ToastFeel.popFrom);
        node.opacity = 0;
        this.motion.play(
            cc
                .tween(node)
                .to(ToastFeel.appear, { scale: 1, opacity: 255 }, { easing: 'backOut' })
                .delay(ToastFeel.hold)
                .to(ToastFeel.leave, { y: this.restY + ToastFeel.rise, opacity: 0 }, { easing: 'quadIn' }),
        );
    }

    hide(): void {
        this.motion.stop();
        this.node.opacity = 0;
    }
}
