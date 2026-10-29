import { ResultPresenter } from '../app/GameViews';
import { Signal } from '../app/Signal';
import { ProgressSnapshot } from '../core/rules/LevelProgress';
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

        this.node.active = true;
        this.node.opacity = 0;
        this.panel.setScale(0.6);
        cc.tween(this.node).to(0.2, { opacity: 255 }).start();
        cc.tween(this.panel).to(0.35, { scale: 1 }, { easing: 'backOut' }).start();
    }

    hide(): void {
        this.node.active = false;
    }

    private onRestart(): void {
        this.restartRequested.dispatch();
    }
}
