import { PressFeedback } from '../PressFeedback';
import { NoSound, SoundPlayer } from './SoundPlayer';
import { NoSoundSwitch, SoundSwitch } from './SoundSwitch';

const { ccclass, property } = cc._decorator;

/** Round sound toggle. The icon follows the switch it is given, so a mute restored from storage shows at once. */
@ccclass
export class MuteButton extends cc.Component {
    @property({ type: PressFeedback, tooltip: 'On this node, sinking the icon: the touch area stays put' })
    press: PressFeedback = null!;

    @property(cc.Sprite)
    icon: cc.Sprite = null!;

    @property(cc.SpriteFrame)
    onFrame: cc.SpriteFrame = null!;

    @property(cc.SpriteFrame)
    offFrame: cc.SpriteFrame = null!;

    private muteSwitch: SoundSwitch = new NoSoundSwitch();
    private player: SoundPlayer = new NoSound();

    /** The player is for the click that confirms unmuting. */
    setSound(sound: SoundSwitch & SoundPlayer): void {
        this.muteSwitch = sound;
        this.player = sound;
        this.render();
    }

    onLoad(): void {
        this.press.pressed.add(() => this.toggle());
    }

    private toggle(): void {
        this.muteSwitch.setMuted(!this.muteSwitch.muted);
        // Muting is silent by definition; unmuting answers, so the player hears that it worked.
        if (!this.muteSwitch.muted) {
            this.player.play('click');
        }
        this.render();
    }

    private render(): void {
        this.icon.spriteFrame = this.muteSwitch.muted ? this.offFrame : this.onFrame;
    }
}
