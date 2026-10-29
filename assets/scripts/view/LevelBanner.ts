import { BannerPresenter } from '../app/GameViews';
import { ProgressSnapshot } from '../core/rules/LevelProgress';
import { Texts } from './Texts';
import { TweenSlot } from './TweenSlot';

const { ccclass, property } = cc._decorator;

/** Seconds and the band opacity. The goal takes about 1.4 s from the first frame to the last. */
export const BannerFeel = {
    /** The deal shows on its own for a moment before the band covers the middle rows. */
    goalDelay: 0.3,
    goalHold: 0.5,
    finaleHold: 0.45,
    open: 0.18,
    /** The text starts sliding in this long after the band starts opening. */
    textLag: 0.06,
    enter: 0.34,
    leave: 0.24,
    close: 0.2,
    bandOpacity: 215,
};

/**
 * A dark band across the board with a message sliding through it. The text enters from beyond the right edge
 * of the visible area and leaves past the left one, whatever the screen's width. Takes no touches itself:
 * a tap on the board below sends it away early.
 */
@ccclass
export class LevelBanner extends cc.Component implements BannerPresenter {
    @property({ type: cc.Node, tooltip: 'Band behind the text; opens and closes vertically' })
    band: cc.Node = null!;

    @property(cc.Label)
    goalLabel: cc.Label = null!;

    /** Settles the promise of the banner on screen; null when none is up. */
    private finish: (() => void) | null = null;
    private leaving = false;
    private readonly sequence = new TweenSlot();
    private readonly bandMotion = new TweenSlot();
    private readonly textMotion = new TweenSlot();

    onDestroy(): void {
        this.stopMotion();
    }

    showGoal(progress: ProgressSnapshot): Promise<void> {
        return this.present(
            Texts.goal(progress.targetScore, progress.movesLeft),
            BannerFeel.goalDelay,
            BannerFeel.goalHold,
        );
    }

    showFinale(movesLeft: number): Promise<void> {
        return this.present(Texts.finale(movesLeft), 0, BannerFeel.finaleHold);
    }

    dismiss(): void {
        if (this.finish !== null && !this.leaving) {
            this.leave();
        }
    }

    private present(text: string, delay: number, hold: number): Promise<void> {
        this.complete();
        const node = this.node;
        node.active = true;
        // Under an inactive parent the tweens would never run, and the game waits for this promise.
        if (!node.activeInHierarchy) {
            node.active = false;
            return Promise.resolve();
        }
        const label = this.goalLabel.node;
        this.goalLabel.string = text;
        this.band.scaleY = 0;
        this.band.opacity = 0;
        label.opacity = 0;
        label.x = this.offscreenX();

        return new Promise<void>((resolve) => {
            this.finish = resolve;
            const feel = BannerFeel;
            this.sequence.play(
                cc
                    .tween(node)
                    .delay(delay)
                    .call(() => this.openBand())
                    .delay(feel.textLag)
                    .call(() => this.enterText())
                    .delay(feel.enter + hold)
                    .call(() => this.leave()),
            );
        });
    }

    private openBand(): void {
        this.bandMotion.play(
            cc
                .tween(this.band)
                .to(BannerFeel.open, { scaleY: 1, opacity: BannerFeel.bandOpacity }, { easing: 'backOut' }),
        );
    }

    private enterText(): void {
        const label = this.goalLabel.node;
        label.opacity = 255;
        this.textMotion.play(cc.tween(label).to(BannerFeel.enter, { x: 0 }, { easing: 'backOut' }));
    }

    private leave(): void {
        const feel = BannerFeel;
        this.leaving = true;
        this.textMotion.play(
            cc.tween(this.goalLabel.node).to(feel.leave, { x: -this.offscreenX(), opacity: 0 }, { easing: 'quadIn' }),
        );
        this.bandMotion.play(cc.tween(this.band).to(feel.close, { scaleY: 0, opacity: 0 }, { easing: 'quadIn' }));
        this.sequence.play(
            cc
                .tween(this.node)
                .delay(Math.max(feel.leave, feel.close))
                .call(() => this.complete()),
        );
    }

    /** Takes the banner down at once and settles its promise. */
    private complete(): void {
        this.stopMotion();
        this.leaving = false;
        this.node.active = false;
        const finish = this.finish;
        this.finish = null;
        if (finish !== null) {
            finish();
        }
    }

    private stopMotion(): void {
        [this.sequence, this.bandMotion, this.textMotion].forEach((slot) => slot.stop());
    }

    /** Just past the edge of the visible area, which on a wide window lies far beyond the design width. */
    private offscreenX(): number {
        return cc.view.getVisibleSize().width / 2 + this.goalLabel.node.width / 2;
    }
}
