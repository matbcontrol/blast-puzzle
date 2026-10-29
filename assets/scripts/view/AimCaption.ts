import { pulse } from './Tweens';
import { TweenSlot } from './TweenSlot';

const { ccclass, property } = cc._decorator;

/** Seconds and scales of the aiming caption. */
export const CaptionFeel = {
    fade: 0.16,
    popFrom: 0.8,
    /** A slow breath while it waits for the player, so the eye finds it. */
    breath: { peak: 1.04, rest: 1, rise: 0.6, fall: 0.6 },
};

/** Tells the player what an aimed booster wants, in place of the static title above the booster buttons. */
@ccclass
export class AimCaption extends cc.Component {
    @property(cc.Label)
    label: cc.Label = null!;

    @property({ type: cc.Node, tooltip: 'Static title the caption stands in for while a booster is aimed' })
    title: cc.Node | null = null;

    private text: string | null = null;
    private readonly motion = new TweenSlot();
    private readonly titleFade = new TweenSlot();

    onLoad(): void {
        this.label.node.opacity = 0;
    }

    onDestroy(): void {
        this.motion.stop();
        this.titleFade.stop();
    }

    /** null puts the title back. */
    show(text: string | null): void {
        if (text === this.text) {
            return;
        }
        this.text = text;
        const caption = this.label.node;
        if (text === null) {
            this.motion.play(cc.tween(caption).to(CaptionFeel.fade, { opacity: 0 }, { easing: 'quadIn' }));
            this.fadeTitle(255);
            return;
        }
        this.label.string = text;
        caption.opacity = 0;
        caption.setScale(CaptionFeel.popFrom);
        this.motion.play(
            cc
                .tween(caption)
                .to(CaptionFeel.fade, { opacity: 255, scale: 1 }, { easing: 'backOut' })
                // A loop inside a sequence never repeats, so the breath takes the slot over as its own tween.
                .call(() => this.motion.play(pulse(caption, 'scale', CaptionFeel.breath))),
        );
        this.fadeTitle(0);
    }

    private fadeTitle(opacity: number): void {
        if (this.title !== null) {
            this.titleFade.play(cc.tween(this.title).to(CaptionFeel.fade, { opacity }));
        }
    }
}
