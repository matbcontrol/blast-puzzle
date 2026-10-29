import { ResultPresenter } from '../app/GameViews';
import { Signal } from '../app/Signal';
import { ProgressSnapshot } from '../core/rules/LevelProgress';
import { Timings } from './animation/Timings';
import { Texts } from './Texts';

const { ccclass, property } = cc._decorator;

@ccclass
export class ResultPopup extends cc.Component implements ResultPresenter {
    @property(cc.Node)
    panel: cc.Node = null!;

    @property(cc.Label)
    titleLabel: cc.Label = null!;

    @property(cc.Label)
    detailsLabel: cc.Label = null!;

    @property(cc.Node)
    restartButton: cc.Node = null!;

    readonly restartRequested = new Signal<void>();

    private closing = false;

    onLoad(): void {
        this.restartButton.on(cc.Node.EventType.TOUCH_END, this.onRestart, this);
    }

    onDestroy(): void {
        this.restartButton.targetOff(this);
        this.restartRequested.clear();
    }

    show(progress: ProgressSnapshot): void {
        const won = progress.status === 'won';
        this.titleLabel.string = won ? Texts.won : Texts.lost;
        this.detailsLabel.string = won
            ? Texts.score(progress.score, progress.targetScore)
            : Texts.loseReason(progress.loseReason);

        cc.Tween.stopAllByTarget(this.node);
        this.closing = false;
        this.node.active = true;
        this.node.opacity = 0;
        this.panel.setScale(0.6);
        cc.tween(this.node).to(Timings.popupFadeIn, { opacity: 255 }).start();
        cc.tween(this.panel).to(Timings.popupPop, { scale: 1 }, { easing: 'backOut' }).start();
    }

    /** Stays active while it fades out, so BlockInputEvents keeps the rest of a double tap off the new board. */
    hide(): void {
        if (!this.node.active || this.closing) {
            return;
        }
        this.closing = true;
        cc.Tween.stopAllByTarget(this.node);
        cc.tween(this.node)
            .to(Timings.popupFadeOut, { opacity: 0 })
            .call(() => {
                this.closing = false;
                this.node.active = false;
            })
            .start();
    }

    private onRestart(): void {
        // A second tap during the fade must not start yet another game.
        if (!this.closing) {
            this.restartRequested.dispatch();
        }
    }
}
