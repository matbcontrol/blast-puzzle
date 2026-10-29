import { Signal } from '../app/Signal';
import { PressFeedback } from './PressFeedback';
import { shakeX } from './Tweens';
import { TweenSlot } from './TweenSlot';

const { ccclass, property } = cc._decorator;

/** Opacity, px and seconds of a booster button. The press itself feels like every button: PressFeel. */
export const BoosterButtonFeel = {
    emptyOpacity: 140,
    /** The selected booster breathes until it fires or is put back. */
    selected: { peak: 1.1, rest: 1, rise: 0.4, fall: 0.4 },
    rejectOffset: 10,
    reject: 0.3,
};

@ccclass
export class BoosterButton extends cc.Component {
    @property({ tooltip: 'Booster id from the model: bomb, teleport' })
    boosterId = '';

    @property(cc.Label)
    chargesLabel: cc.Label = null!;

    @property({ type: PressFeedback, tooltip: 'On this node' })
    press: PressFeedback = null!;

    readonly pressed = new Signal<string>();

    private selected = false;
    private restX = 0;
    private readonly shaking = new TweenSlot();

    onLoad(): void {
        this.restX = this.node.x;
        this.press.pressed.add(() => this.pressed.dispatch(this.boosterId));
    }

    onDestroy(): void {
        this.shaking.stop();
        this.pressed.clear();
    }

    showCharges(charges: number): void {
        this.chargesLabel.string = String(charges);
        this.node.opacity = charges > 0 ? 255 : BoosterButtonFeel.emptyOpacity;
    }

    setSelected(selected: boolean): void {
        if (selected !== this.selected) {
            this.selected = selected;
            this.press.setIdle(selected ? BoosterButtonFeel.selected : null);
        }
    }

    /** No charges left: a short "no" shake. */
    reject(): void {
        this.node.x = this.restX;
        this.shaking.play(shakeX(this.node, this.restX, BoosterButtonFeel.rejectOffset, BoosterButtonFeel.reject));
    }
}
