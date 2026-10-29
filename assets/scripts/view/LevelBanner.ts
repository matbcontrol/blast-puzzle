import { BannerPresenter } from '../app/GameViews';
import { ProgressSnapshot } from '../core/rules/LevelProgress';
import { Texts } from './Texts';

const { ccclass, property } = cc._decorator;

/** The goal banner, in seconds and design px. About 1.4 s from the first frame to the last. */
export const BannerFeel = {
    open: 0.18,
    /** The text starts sliding in this long after the band starts opening. */
    textLag: 0.06,
    enter: 0.34,
    hold: 0.7,
    leave: 0.24,
    close: 0.2,
    /** How far off center the text enters from the right and leaves to the left. */
    slide: 760,
    bandOpacity: 215,
};

/** A dark band across the board with the goal sliding through it, while the board is dealt underneath. */
@ccclass
export class LevelBanner extends cc.Component implements BannerPresenter {
    @property({ type: cc.Node, tooltip: 'Band behind the text; opens and closes vertically' })
    band: cc.Node = null!;

    @property(cc.Label)
    goalLabel: cc.Label = null!;

    showGoal(progress: ProgressSnapshot): Promise<void> {
        const feel = BannerFeel;
        const node = this.node;
        const band = this.band;
        const text = this.goalLabel.node;
        this.goalLabel.string = Texts.goal(progress.targetScore, progress.movesLeft);

        [node, band, text].forEach((target) => cc.Tween.stopAllByTarget(target));
        node.active = true;
        // Under an inactive parent the tweens would never run, and the game waits for this promise.
        if (!node.activeInHierarchy) {
            node.active = false;
            return Promise.resolve();
        }
        band.scaleY = 0;
        band.opacity = 0;
        text.setPosition(feel.slide, 0);
        text.opacity = 255;

        return new Promise<void>((resolve) => {
            cc.tween(node)
                .call(() => this.openBand())
                .delay(feel.textLag)
                .call(() => {
                    cc.tween(text).to(feel.enter, { x: 0 }, { easing: 'backOut' }).start();
                })
                .delay(feel.enter + feel.hold)
                .call(() => {
                    cc.tween(text).to(feel.leave, { x: -feel.slide, opacity: 0 }, { easing: 'quadIn' }).start();
                    cc.tween(band).to(feel.close, { scaleY: 0, opacity: 0 }, { easing: 'quadIn' }).start();
                })
                .delay(Math.max(feel.leave, feel.close))
                .call(() => {
                    node.active = false;
                    resolve();
                })
                .start();
        });
    }

    private openBand(): void {
        cc.tween(this.band)
            .to(BannerFeel.open, { scaleY: 1, opacity: BannerFeel.bandOpacity }, { easing: 'backOut' })
            .start();
    }
}
