import { HudPresenter } from '../app/GameViews';
import { ProgressSnapshot } from '../core/rules/LevelProgress';
import { Timings } from './animation/Timings';
import { toCcColor } from './fx/FxColors';
import { Texts } from './Texts';
import { TweenSlot } from './TweenSlot';

const { ccclass, property } = cc._decorator;

/** How the HUD reacts. Seconds, scales, tints as 0xRRGGBB. */
export const HudFeel = {
    /** Count-up speed: the shown score closes this share of the gap every second. */
    scoreCatchUp: 6,
    /** The moves number pops on every move: peak scale, and the share of Timings.hudBump spent rising. */
    bumpScale: 1.2,
    bumpRise: 0.4,
    /** From this many moves left the bubble beats like a heart and the number turns warm red. */
    lowMoves: 5,
    lowMovesTint: 0xff7a52,
    normalTint: 0xffffff,
    /** One heartbeat: two beats of these scales and times, then a rest. */
    beats: [
        { scale: 1.12, up: 0.09, down: 0.11 },
        { scale: 1.06, up: 0.08, down: 0.14 },
    ],
    beatRest: 0.45,
    goalTint: 0xffd86b,
    goalPunchScale: 1.35,
    goalPunch: 0.12,
    goalSettle: 0.35,
};

@ccclass
export class HudView extends cc.Component implements HudPresenter {
    @property(cc.Label)
    movesLabel: cc.Label = null!;

    @property({ type: cc.Node, tooltip: 'Bubble behind the moves number; beats when moves run low' })
    movesBubble: cc.Node = null!;

    @property(cc.Label)
    scoreLabel: cc.Label = null!;

    private shownScore = 0;
    private score = 0;
    private target = 0;
    private lowOnMoves = false;
    private readonly heartbeat = new TweenSlot();

    showProgress(progress: ProgressSnapshot): void {
        if (progress.score < this.score) {
            // A new game: the score starts over without counting down.
            this.shownScore = progress.score;
            this.tintScore(HudFeel.normalTint);
        }
        this.score = progress.score;
        this.target = progress.targetScore;

        if (this.movesLabel.string !== String(progress.movesLeft)) {
            this.movesLabel.string = String(progress.movesLeft);
            this.bump(this.movesLabel.node);
        }
        this.warnAboutMoves(progress.movesLeft <= HudFeel.lowMoves);
        this.renderScore();
    }

    update(dt: number): void {
        if (this.shownScore === this.score) {
            return;
        }
        const before = this.shownScore;
        const step = Math.max(1, Math.ceil((this.score - this.shownScore) * Math.min(1, dt * HudFeel.scoreCatchUp)));
        this.shownScore = Math.min(this.score, this.shownScore + step);
        this.renderScore();
        // In step with the count-up, so the flash lands when the shown number crosses the goal.
        if (before < this.target && this.shownScore >= this.target) {
            this.flashGoal();
        }
    }

    private renderScore(): void {
        this.scoreLabel.string = Texts.score(this.shownScore, this.target);
    }

    private bump(node: cc.Node): void {
        cc.Tween.stopAllByTarget(node);
        node.setScale(1);
        cc.tween(node)
            .to(Timings.hudBump * HudFeel.bumpRise, { scale: HudFeel.bumpScale })
            .to(Timings.hudBump * (1 - HudFeel.bumpRise), { scale: 1 })
            .start();
    }

    /** Both labels cache glyphs per color, so a tint is switched once and never tweened. */
    private warnAboutMoves(low: boolean): void {
        if (low === this.lowOnMoves) {
            return;
        }
        this.lowOnMoves = low;
        this.movesLabel.node.color = toCcColor(low ? HudFeel.lowMovesTint : HudFeel.normalTint);
        const bubble = this.movesBubble;
        if (!low) {
            this.heartbeat.stop();
            bubble.setScale(1);
            return;
        }
        const beat = HudFeel.beats.reduce(
            (tween, pulse) =>
                tween
                    .to(pulse.up, { scale: pulse.scale }, { easing: 'quadOut' })
                    .to(pulse.down, { scale: 1 }, { easing: 'quadIn' }),
            cc.tween<cc.Node>(),
        );
        this.heartbeat.play(cc.tween(bubble).repeatForever(beat.delay(HudFeel.beatRest)));
    }

    private flashGoal(): void {
        const node = this.scoreLabel.node;
        this.tintScore(HudFeel.goalTint);
        cc.Tween.stopAllByTarget(node);
        node.setScale(1);
        cc.tween(node)
            .to(HudFeel.goalPunch, { scale: HudFeel.goalPunchScale }, { easing: 'quadOut' })
            .to(HudFeel.goalSettle, { scale: 1 }, { easing: 'backOut' })
            .start();
    }

    private tintScore(tint: number): void {
        this.scoreLabel.node.color = toCcColor(tint);
    }
}
