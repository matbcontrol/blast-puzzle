import { Signal } from '../app/Signal';
import { GoalMarks, GoalScale } from './GoalScale';
import { punch } from './Tweens';

const { ccclass, property } = cc._decorator;

/** Places along the bar, px and the pop of a star. */
export const GoalBarFeel = {
    /** Where the target and the two star scores sit, as shares of the bar. */
    starPlaces: [0.6, 0.8, 1],
    /** The fill sits this far inside the track on every side. */
    inset: 3,
    /** Narrower than this, the fill art's rounded caps would overlap. */
    minFill: 18,
    starPop: { peak: 1.3, rise: 0.08, settle: 0.2 },
};

/**
 * A goal bar with the three star marks on it. The node is the sliced track; the fill and the stars are its children
 * and are laid out from its size, so the scene only sizes the track. The fill follows the score it is shown,
 * and a star pops alight as the fill reaches it.
 */
@ccclass
export class GoalBar extends cc.Component {
    @property({ type: cc.Node, tooltip: 'Sliced fill, a child of this track' })
    fill: cc.Node = null!;

    @property({ type: [cc.Sprite], tooltip: 'Star marks, children of this track: the target first' })
    stars: cc.Sprite[] = [];

    @property(cc.SpriteFrame)
    starFull: cc.SpriteFrame = null!;

    @property(cc.SpriteFrame)
    starEmpty: cc.SpriteFrame = null!;

    /** Index of the star the fill has just reached. */
    readonly starReached = new Signal<number>();

    private scale: GoalScale | null = null;
    private lit = 0;

    onLoad(): void {
        const places = GoalBarFeel.starPlaces;
        if (this.stars.length !== places.length) {
            cc.warn(`GoalBar: ${places.length} stars expected, the scene has ${this.stars.length}`);
        }
        const track = this.node;
        const inset = GoalBarFeel.inset;
        this.fill.setAnchorPoint(0, 0.5);
        this.fill.setPosition(-track.width / 2 + inset, 0);
        this.fill.height = track.height - 2 * inset;
        this.stars.forEach((star, i) => star.node.setPosition(-track.width / 2 + places[i] * track.width, 0));
    }

    onDestroy(): void {
        this.stars.forEach((star) => cc.Tween.stopAllByTarget(star.node));
        this.starReached.clear();
    }

    /** A new goal: the bar stands at score with the stars it has reached, without a pop. */
    setGoal(goal: GoalMarks, score: number): void {
        const scale = new GoalScale(goal, GoalBarFeel.starPlaces);
        this.scale = scale;
        this.lit = scale.reached(score);
        this.stars.forEach((star, i) => {
            cc.Tween.stopAllByTarget(star.node);
            star.node.setScale(1);
            star.spriteFrame = i < this.lit ? this.starFull : this.starEmpty;
        });
        this.fillTo(scale.fraction(score));
    }

    show(score: number): void {
        const scale = this.scale;
        if (scale === null) {
            return;
        }
        this.fillTo(scale.fraction(score));
        const reached = Math.min(scale.reached(score), this.stars.length);
        while (this.lit < reached) {
            this.light(this.lit);
            this.lit++;
        }
    }

    private light(index: number): void {
        const star = this.stars[index];
        star.spriteFrame = this.starFull;
        // The pop is the only tween a star has.
        cc.Tween.stopAllByTarget(star.node);
        punch(star.node, GoalBarFeel.starPop).start();
        this.starReached.dispatch(index);
    }

    private fillTo(fraction: number): void {
        const width = fraction * (this.node.width - 2 * GoalBarFeel.inset);
        this.fill.active = width > 0;
        this.fill.width = Math.max(GoalBarFeel.minFill, width);
    }
}
