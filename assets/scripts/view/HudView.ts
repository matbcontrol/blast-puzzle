import { HudPresenter } from '../app/GameViews';
import { ProgressSnapshot } from '../core/rules/LevelProgress';
import { Point } from './BoardLayout';
import { toCcColor } from './fx/FxColors';
import { ScoreTarget } from './fx/ScoreTarget';
import { GoalBar } from './GoalBar';
import { punch } from './Tweens';
import { ScoreCounter } from './ScoreCounter';
import { Texts } from './Texts';
import { Toast } from './Toast';
import { TweenSlot } from './TweenSlot';

const { ccclass, property } = cc._decorator;

const DIGITS = '0123456789';

/** How the HUD reacts. Seconds, scales, px, tints as 0xRRGGBB. */
export const HudFeel = {
    /** The moves number pops on every move. */
    movesBump: { peak: 1.2, rise: 0.08, settle: 0.12 },
    /** The score number pops as each score popup lands in it. */
    scoreBump: { peak: 1.12, rise: 0.08, settle: 0.16 },
    count: { catchUp: 6, creditWait: 1.5 },
    normalTint: 0xffffff,
    goalTint: 0xffd86b,
    goalPunch: { peak: 1.35, rise: 0.12, settle: 0.35 },
    /** Low on moves: the number stays white inside a dark red rim, and the bubble turns red and beats. */
    warning: {
        bubbleTint: 0xff5a5a,
        outline: 0x7a0019,
        outlineWidth: 4,
        /** One heartbeat: two beats of these scales and times, then a rest. */
        beats: [
            { scale: 1.12, up: 0.09, down: 0.11 },
            { scale: 1.06, up: 0.08, down: 0.14 },
        ],
        beatRest: 0.45,
    },
};

/** Moves, score and the goal bar. Score popups fly into the score, and it counts up as they land. */
@ccclass
export class HudView extends cc.Component implements HudPresenter, ScoreTarget {
    @property(cc.Label)
    movesLabel: cc.Label = null!;

    @property({ type: cc.Node, tooltip: 'Bubble behind the moves number; beats when moves run low' })
    movesBubble: cc.Node = null!;

    @property(cc.Label)
    scoreLabel: cc.Label = null!;

    @property({ type: GoalBar, tooltip: 'Goal bar with the star marks, under the score' })
    goalBar: GoalBar = null!;

    @property({ type: Toast, tooltip: 'Says once that moves run low' })
    toast: Toast = null!;

    private readonly counter = new ScoreCounter(HudFeel.count);
    private target = 0;
    private warning = false;
    private movesOutline: cc.LabelOutline = null!;
    private readonly movesPop = new TweenSlot();
    private readonly scorePop = new TweenSlot();
    private readonly heartbeat = new TweenSlot();

    onLoad(): void {
        // Added here and only switched on, so its color and width stay with the rest of the warning look.
        const outline = this.movesLabel.node.addComponent(cc.LabelOutline);
        outline.color = toCcColor(HudFeel.warning.outline);
        outline.width = HudFeel.warning.outlineWidth;
        outline.enabled = false;
        this.movesOutline = outline;
    }

    /** Draws the warning and goal looks of the digits in the first frame, not in the frame the look first shows. */
    start(): void {
        const warmUps = [
            warmGlyphs(this.movesLabel, DIGITS, HudFeel.normalTint, this.movesOutline),
            warmGlyphs(this.scoreLabel, `${DIGITS}/`, HudFeel.goalTint, null),
        ];
        this.scheduleOnce(() => warmUps.forEach((node) => node.destroy()), 0);
    }

    onDestroy(): void {
        [this.movesPop, this.scorePop, this.heartbeat].forEach((slot) => slot.stop());
    }

    reset(progress: ProgressSnapshot): void {
        this.counter.reset(progress.score);
        this.target = progress.targetScore;
        this.goalBar.setGoal(progress, progress.score);
        this.scoreLabel.node.color = toCcColor(HudFeel.normalTint);
        this.scorePop.stop();
        this.scoreLabel.node.setScale(1);
        this.stopWarning();
        this.toast.hide();
        this.movesLabel.string = String(progress.movesLeft);
        this.renderScore();
    }

    showProgress(progress: ProgressSnapshot): void {
        this.counter.setTotal(progress.score);
        const moves = String(progress.movesLeft);
        if (this.movesLabel.string !== moves) {
            this.movesLabel.string = moves;
            this.movesPop.play(punch(this.movesLabel.node, HudFeel.movesBump));
        }
        // The warning is about the turns left in a live game; a won or lost level has none.
        if (progress.status !== 'playing') {
            this.stopWarning();
        }
    }

    warnLowMoves(movesLeft: number): void {
        this.startWarning();
        this.toast.show(Texts.lowMoves(movesLeft));
    }

    scoreWorldPoint(): Point {
        const point = this.scoreLabel.node.convertToWorldSpaceAR(cc.Vec2.ZERO);
        return { x: point.x, y: point.y };
    }

    scoreArrived(points: number): void {
        this.counter.credit(points);
        this.scorePop.play(punch(this.scoreLabel.node, HudFeel.scoreBump));
    }

    update(dt: number): void {
        const before = this.counter.shown;
        if (!this.counter.step(dt)) {
            return;
        }
        this.renderScore();
        // In step with the count-up, so the flash lands when the shown number crosses the goal.
        if (before < this.target && this.counter.shown >= this.target) {
            this.flashGoal();
        }
    }

    private renderScore(): void {
        const shown = this.counter.shown;
        this.scoreLabel.string = Texts.score(shown, this.target);
        this.goalBar.show(shown);
    }

    /** Labels cache glyphs per color and outline, so the warning look is switched, never tweened. */
    private startWarning(): void {
        if (this.warning) {
            return;
        }
        this.warning = true;
        const warning = HudFeel.warning;
        this.movesOutline.enabled = true;
        this.movesBubble.color = toCcColor(warning.bubbleTint);
        const beat = warning.beats.reduce(
            (tween, pulse) =>
                tween
                    .to(pulse.up, { scale: pulse.scale }, { easing: 'quadOut' })
                    .to(pulse.down, { scale: 1 }, { easing: 'quadIn' }),
            cc.tween<cc.Node>(),
        );
        this.heartbeat.play(cc.tween(this.movesBubble).repeatForever(beat.delay(warning.beatRest)));
    }

    private stopWarning(): void {
        if (!this.warning) {
            return;
        }
        this.warning = false;
        this.movesOutline.enabled = false;
        this.movesBubble.color = toCcColor(HudFeel.normalTint);
        this.heartbeat.stop();
        this.movesBubble.setScale(1);
    }

    private flashGoal(): void {
        this.scoreLabel.node.color = toCcColor(HudFeel.goalTint);
        this.scorePop.play(punch(this.scoreLabel.node, HudFeel.goalPunch));
    }
}

/**
 * A copy of the label's text style in this tint and outline, drawing the glyphs into the shared character atlas
 * on the next frame. The caller destroys it once that frame is drawn.
 */
function warmGlyphs(like: cc.Label, glyphs: string, tint: number, outline: cc.LabelOutline | null): cc.Node {
    const node = new cc.Node('GlyphWarmUp');
    const label = node.addComponent(cc.Label);
    label.font = like.font;
    label.fontSize = like.fontSize;
    label.lineHeight = like.lineHeight;
    label.cacheMode = cc.Label.CacheMode.CHAR;
    if (outline !== null) {
        const copy = node.addComponent(cc.LabelOutline);
        copy.color = outline.color;
        copy.width = outline.width;
    }
    label.string = glyphs;
    node.color = toCcColor(tint);
    // The render walk skips a node at opacity 0, and then nothing would be drawn.
    node.opacity = 1;
    node.parent = like.node.parent;
    return node;
}
