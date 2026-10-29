import { Signal } from '../app/Signal';
import { Timings } from './animation/Timings';

const { ccclass, property } = cc._decorator;

@ccclass
export class BoosterButton extends cc.Component {
    @property({ tooltip: 'Booster id from the model: bomb, teleport' })
    boosterId = '';

    @property(cc.Label)
    chargesLabel: cc.Label = null!;

    readonly pressed = new Signal<string>();

    onLoad(): void {
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
        this.node.opacity = charges > 0 ? 255 : 140;
    }

    setSelected(selected: boolean): void {
        cc.Tween.stopAllByTarget(this.node);
        this.node.setScale(1);
        if (selected) {
            cc.tween(this.node)
                .repeatForever(
                    cc
                        .tween()
                        .to(Timings.boosterPulse / 2, { scale: 1.08 })
                        .to(Timings.boosterPulse / 2, { scale: 1 }),
                )
                .start();
        }
    }

    private onTouchStart(): void {
        this.node.setScale(0.94);
    }

    private onTouchEnd(): void {
        this.release();
        this.pressed.dispatch(this.boosterId);
    }

    private release(): void {
        this.node.setScale(1);
    }
}
