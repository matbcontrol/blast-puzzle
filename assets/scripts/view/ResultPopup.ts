import { ResultPresenter } from '../app/GameViews';
import { Signal } from '../app/Signal';
import { ProgressSnapshot } from '../core/rules/LevelProgress';
import { NoEffects, NoSound } from './animation/Silent';
import { Timings } from './animation/Timings';
import { SoundBoard } from './audio/SoundBoard';
import { BoardEffects } from './fx/BoardEffects';
import { Texts } from './Texts';

const { ccclass, property } = cc._decorator;

/** Seconds and scales of the result popup beyond the shared Timings. */
export const PopupFeel = {
    /** A win lets the confetti fly over the board before the shade covers it. */
    celebrate: 1.3,
    panelFrom: 0.6,
    buttonPressed: 0.92,
    buttonPress: 0.05,
    buttonRelease: 0.22,
};

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
    /** The restart button is invisible while a win celebrates, and must not catch the last tap of the turn. */
    private ready = false;
    private sound: SoundBoard = new NoSound();
    private effects: BoardEffects = new NoEffects();

    setSound(sound: SoundBoard): void {
        this.sound = sound;
    }

    setEffects(effects: BoardEffects): void {
        this.effects = effects;
    }

    onLoad(): void {
        this.restartButton.on(cc.Node.EventType.TOUCH_START, this.onPressRestart, this);
        this.restartButton.on(cc.Node.EventType.TOUCH_END, this.onRestart, this);
        this.restartButton.on(cc.Node.EventType.TOUCH_CANCEL, this.releaseRestart, this);
    }

    onDestroy(): void {
        this.restartButton.targetOff(this);
        this.restartRequested.clear();
    }

    /** Active at once, so BlockInputEvents holds the board while a win celebrates under a still clear shade. */
    show(progress: ProgressSnapshot): void {
        const won = progress.status === 'won';
        this.titleLabel.string = won ? Texts.won : Texts.lost;
        this.detailsLabel.string = won
            ? Texts.score(progress.score, progress.targetScore)
            : Texts.loseReason(progress.loseReason);
        if (won) {
            this.sound.play('win');
            this.effects.confetti();
        } else {
            this.sound.play('lose');
        }

        const delay = won ? PopupFeel.celebrate : 0;
        cc.Tween.stopAllByTarget(this.node);
        cc.Tween.stopAllByTarget(this.panel);
        this.closing = false;
        this.ready = false;
        this.node.active = true;
        this.node.opacity = 0;
        this.panel.setScale(PopupFeel.panelFrom);
        this.restartButton.setScale(1);
        cc.tween(this.node)
            .delay(delay)
            .call(() => {
                this.ready = true;
            })
            .to(Timings.popupFadeIn, { opacity: 255 })
            .start();
        cc.tween(this.panel).delay(delay).to(Timings.popupPop, { scale: 1 }, { easing: 'backOut' }).start();
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

    private onPressRestart(): void {
        this.scaleButton(PopupFeel.buttonPressed, PopupFeel.buttonPress, 'quadOut');
    }

    private releaseRestart(): void {
        this.scaleButton(1, PopupFeel.buttonRelease, 'backOut');
    }

    private onRestart(): void {
        this.releaseRestart();
        // A second tap during the fade must not start yet another game.
        if (this.ready && !this.closing) {
            this.sound.play('click');
            this.restartRequested.dispatch();
        }
    }

    private scaleButton(scale: number, duration: number, easing: string): void {
        const button = this.restartButton;
        cc.Tween.stopAllByTarget(button);
        cc.tween(button).to(duration, { scale }, { easing }).start();
    }
}
