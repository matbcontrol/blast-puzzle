const { ccclass, property } = cc._decorator;

/** Seconds and scales of the aiming caption. */
export const CaptionFeel = {
    fade: 0.16,
    popFrom: 0.8,
    /** A slow breath while it waits for the player, so the eye finds it. */
    breathScale: 1.04,
    breath: 1.2,
};

/** Tells the player what an aimed booster wants, in place of the static title above the booster buttons. */
@ccclass
export class AimCaption extends cc.Component {
    @property(cc.Label)
    label: cc.Label = null!;

    @property({ type: cc.Node, tooltip: 'Static title the caption stands in for while a booster is aimed' })
    title: cc.Node | null = null;

    private text: string | null = null;

    onLoad(): void {
        this.label.node.opacity = 0;
    }

    /** null puts the title back. */
    show(text: string | null): void {
        if (text === this.text) {
            return;
        }
        this.text = text;
        const caption = this.label.node;
        cc.Tween.stopAllByTarget(caption);
        if (text === null) {
            cc.tween(caption).to(CaptionFeel.fade, { opacity: 0 }, { easing: 'quadIn' }).start();
            this.fadeTitle(255);
            return;
        }
        this.label.string = text;
        caption.opacity = 0;
        caption.setScale(CaptionFeel.popFrom);
        cc.tween(caption)
            .to(CaptionFeel.fade, { opacity: 255, scale: 1 }, { easing: 'backOut' })
            .call(() => this.breathe(caption))
            .start();
        this.fadeTitle(0);
    }

    /** A tween of its own: inside a sequence a repeatForever never repeats. */
    private breathe(caption: cc.Node): void {
        cc.tween(caption)
            .repeatForever(
                cc
                    .tween<cc.Node>()
                    .to(CaptionFeel.breath / 2, { scale: CaptionFeel.breathScale }, { easing: 'sineInOut' })
                    .to(CaptionFeel.breath / 2, { scale: 1 }, { easing: 'sineInOut' }),
            )
            .start();
    }

    private fadeTitle(opacity: number): void {
        const title = this.title;
        if (title !== null) {
            cc.Tween.stopAllByTarget(title);
            cc.tween(title).to(CaptionFeel.fade, { opacity }).start();
        }
    }
}
