import { HudPresenter } from '../app/GameViews';
import { ProgressSnapshot } from '../core/rules/LevelProgress';
import { Timings } from './animation/Timings';
import { Texts } from './Texts';

const { ccclass, property } = cc._decorator;

/** Count-up speed: the shown score closes this share of the gap every second. */
const SCORE_CATCH_UP = 6;

@ccclass
export class HudView extends cc.Component implements HudPresenter {
    @property(cc.Label)
    movesLabel: cc.Label = null!;

    @property(cc.Label)
    scoreLabel: cc.Label = null!;

    private shownScore = 0;
    private score = 0;
    private target = 0;

    showProgress(progress: ProgressSnapshot): void {
        if (progress.score < this.score) {
            this.shownScore = progress.score;
        }
        this.score = progress.score;
        this.target = progress.targetScore;

        if (this.movesLabel.string !== String(progress.movesLeft)) {
            this.movesLabel.string = String(progress.movesLeft);
            this.bump(this.movesLabel.node);
        }
        this.renderScore();
    }

    update(dt: number): void {
        if (this.shownScore === this.score) {
            return;
        }
        const step = Math.max(1, Math.ceil((this.score - this.shownScore) * Math.min(1, dt * SCORE_CATCH_UP)));
        this.shownScore = Math.min(this.score, this.shownScore + step);
        this.renderScore();
    }

    private renderScore(): void {
        this.scoreLabel.string = Texts.score(this.shownScore, this.target);
    }

    private bump(node: cc.Node): void {
        cc.Tween.stopAllByTarget(node);
        node.setScale(1);
        cc.tween(node)
            .to(Timings.hudBump * 0.4, { scale: 1.2 })
            .to(Timings.hudBump * 0.6, { scale: 1 })
            .start();
    }
}
