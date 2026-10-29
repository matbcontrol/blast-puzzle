import { SoundBoard } from './SoundBoard';

const { ccclass, property } = cc._decorator;

/** Press feedback of the icon: seconds and scale. */
export const MuteButtonFeel = {
    pressedScale: 0.86,
    press: 0.06,
    release: 0.24,
};

/** Round sound toggle. The icon follows the SoundBoard it is given, so a mute restored from storage shows at once. */
@ccclass
export class MuteButton extends cc.Component {
    @property({ type: cc.Sprite, tooltip: 'Scaled on press; the node with this component keeps the touch area' })
    icon: cc.Sprite = null!;

    @property(cc.SpriteFrame)
    onFrame: cc.SpriteFrame = null!;

    @property(cc.SpriteFrame)
    offFrame: cc.SpriteFrame = null!;

    private sound: SoundBoard | null = null;

    setSound(sound: SoundBoard): void {
        this.sound = sound;
        this.render();
    }

    onLoad(): void {
        this.node.on(cc.Node.EventType.TOUCH_START, this.onTouchStart, this);
        this.node.on(cc.Node.EventType.TOUCH_END, this.onTouchEnd, this);
        this.node.on(cc.Node.EventType.TOUCH_CANCEL, this.release, this);
    }

    onDestroy(): void {
        this.node.targetOff(this);
    }

    private onTouchStart(): void {
        this.scaleIcon(MuteButtonFeel.pressedScale, MuteButtonFeel.press, 'quadOut');
    }

    private onTouchEnd(): void {
        this.release();
        this.toggle();
    }

    private release(): void {
        this.scaleIcon(1, MuteButtonFeel.release, 'backOut');
    }

    private toggle(): void {
        const sound = this.sound;
        if (sound === null) {
            return;
        }
        sound.setMuted(!sound.muted);
        // Muting is silent by definition; unmuting answers, so the player hears that it worked.
        if (!sound.muted) {
            sound.play('click');
        }
        this.render();
    }

    private render(): void {
        if (this.sound !== null) {
            this.icon.spriteFrame = this.sound.muted ? this.offFrame : this.onFrame;
        }
    }

    private scaleIcon(scale: number, duration: number, easing: string): void {
        const node = this.icon.node;
        cc.Tween.stopAllByTarget(node);
        cc.tween(node).to(duration, { scale }, { easing }).start();
    }
}
