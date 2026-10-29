import { Signal } from '../app/Signal';
import { Timings } from './animation/Timings';
import { TweenSlot } from './TweenSlot';

const { ccclass, property } = cc._decorator;

/** Scales, px and seconds of a booster button. */
export const BoosterButtonFeel = {
    pressedScale: 0.92,
    press: 0.05,
    release: 0.24,
    selectedScale: 1.08,
    emptyOpacity: 140,
    rejectOffset: 10,
    reject: 0.3,
};

@ccclass
export class BoosterButton extends cc.Component {
    @property({ tooltip: 'Booster id from the model: bomb, teleport' })
    boosterId = '';

    @property(cc.Label)
    chargesLabel: cc.Label = null!;

    readonly pressed = new Signal<string>();

    private selected = false;
    private restX = 0;
    private readonly scaling = new TweenSlot();
    private readonly shaking = new TweenSlot();

    onLoad(): void {
        this.restX = this.node.x;
        this.node.on(cc.Node.EventType.TOUCH_START, this.onTouchStart, this);
        this.node.on(cc.Node.EventType.TOUCH_END, this.onTouchEnd, this);
        this.node.on(cc.Node.EventType.TOUCH_CANCEL, this.release, this);
    }

    onDestroy(): void {
        this.node.targetOff(this);
        this.pressed.clear();
    }

    showCharges(charges: number): void {
        this.chargesLabel.string = String(charges);
        this.node.opacity = charges > 0 ? 255 : BoosterButtonFeel.emptyOpacity;
    }

    setSelected(selected: boolean): void {
        if (selected !== this.selected) {
            this.selected = selected;
            this.release();
        }
    }

    /** No charges left: a short "no" shake. */
    reject(): void {
        const feel = BoosterButtonFeel;
        const x = this.restX;
        this.node.x = x;
        this.shaking.play(
            cc
                .tween(this.node)
                .to(feel.reject / 4, { x: x - feel.rejectOffset })
                .to(feel.reject / 2, { x: x + feel.rejectOffset })
                .to(feel.reject / 4, { x }),
        );
    }

    private onTouchStart(): void {
        this.scaling.play(
            cc
                .tween(this.node)
                .to(BoosterButtonFeel.press, { scale: BoosterButtonFeel.pressedScale }, { easing: 'quadOut' }),
        );
    }

    private onTouchEnd(): void {
        this.release();
        this.pressed.dispatch(this.boosterId);
    }

    /** Springs back to rest, or into the pulse of a selected booster. */
    private release(): void {
        const node = this.node;
        if (!this.selected) {
            this.scaling.play(cc.tween(node).to(BoosterButtonFeel.release, { scale: 1 }, { easing: 'backOut' }));
            return;
        }
        this.scaling.play(
            cc.tween(node).repeatForever(
                cc
                    .tween<cc.Node>()
                    .to(Timings.boosterPulse / 2, { scale: BoosterButtonFeel.selectedScale }, { easing: 'sineInOut' })
                    .to(Timings.boosterPulse / 2, { scale: 1 }, { easing: 'sineInOut' }),
            ),
        );
    }
}
