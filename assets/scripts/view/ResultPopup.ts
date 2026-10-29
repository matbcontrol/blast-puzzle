import { ResultPresenter } from '../app/GameViews';
import { Signal } from '../app/Signal';
import { ProgressSnapshot } from '../core/rules/LevelProgress';
import { NoSound, SoundPlayer } from './audio/SoundPlayer';
import { BoardEffects } from './fx/BoardEffects';
import { NoEffects } from './fx/NoEffects';
import { ScreenConfetti } from './fx/ScreenConfetti';
import { PressFeedback } from './PressFeedback';
import { GoalBar } from './GoalBar';
import { ScoreCounter } from './ScoreCounter';
import { Texts } from './Texts';
import { punch, shakeX } from './Tweens';
import { TweenSlot } from './TweenSlot';

const { ccclass, property } = cc._decorator;

/** Seconds, scales and px of the win moment and the result panel. */
export const PopupFeel = {
    /** The win moment before the bonus round: the praise and the screen confetti carry it. */
    celebrate: 1.0,
    fadeIn: 0.2,
    panelFrom: 0.6,
    panelPop: 0.35,
    fadeOut: 0.3,
    /** Once the panel lands, a win stamps its title in and a loss shakes it. */
    titleStamp: { peak: 1.25, rise: 0.22, settle: 0.13 },
    titleShake: { offset: 6, duration: 0.3 },
    /** The score counts up from zero once the panel lands. Nothing flies in, so nothing is waited for. */
    count: { catchUp: 5, creditWait: 0 },
    /** Each star the count reaches pops with a higher note. */
    starNotes: [0.6, 0.8, 1],
    /** A loss with at least this share of the target reads "almost". */
    almost: 0.8,
    /** The restart button breathes once it takes taps. */
    restartPulse: { peak: 1.05, rest: 1, rise: 0.6, fall: 0.6 },
};

/**
 * The win moment and the result panel. Stays active itself, so its timers run while the panel is down;
 * the overlay under it holds the shade and the panel, and blocks every touch while it is up.
 */
@ccclass
export class ResultPopup extends cc.Component implements ResultPresenter {
    @property({ type: cc.Node, tooltip: 'Shade and panel. Active only while the result is up, holding all touches' })
    overlay: cc.Node = null!;

    @property(cc.Node)
    panel: cc.Node = null!;

    @property(cc.Label)
    titleLabel: cc.Label = null!;

    @property({ type: cc.Label, tooltip: 'The counting score on a win, why and by how much on a loss' })
    detailsLabel: cc.Label = null!;

    @property(GoalBar)
    goalBar: GoalBar = null!;

    @property(PressFeedback)
    restartButton: PressFeedback = null!;

    @property({ type: ScreenConfetti, tooltip: 'Fires over the whole screen at the win' })
    confetti: ScreenConfetti = null!;

    readonly restartRequested = new Signal<void>();

    private sound: SoundPlayer = new NoSound();
    private effects: BoardEffects = new NoEffects();
    private readonly counter = new ScoreCounter(PopupFeel.count);
    private verdict: ProgressSnapshot | null = null;
    /** The restart button is invisible until the panel lands, and must not catch the last tap of the turn. */
    private ready = false;
    private titleX = 0;
    /** Ends the running celebration early; null when none runs. */
    private celebrating: (() => void) | null = null;
    private closing: Promise<void> | null = null;
    private closed: (() => void) | null = null;
    private readonly fade = new TweenSlot();
    private readonly panelMotion = new TweenSlot();
    private readonly titleMotion = new TweenSlot();

    setSound(sound: SoundPlayer): void {
        this.sound = sound;
    }

    setEffects(effects: BoardEffects): void {
        this.effects = effects;
    }

    onLoad(): void {
        this.titleX = this.titleLabel.node.x;
        this.overlay.active = false;
        this.restartButton.pressed.add(() => this.onRestart());
        this.goalBar.starReached.add((star) => this.sound.play('pop', PopupFeel.starNotes[star]));
    }

    onDestroy(): void {
        [this.fade, this.panelMotion, this.titleMotion].forEach((slot) => slot.stop());
        this.restartRequested.clear();
    }

    update(dt: number): void {
        const verdict = this.verdict;
        if (verdict === null || !this.counter.step(dt)) {
            return;
        }
        const score = this.counter.shown;
        this.goalBar.show(score);
        if (verdict.status === 'won') {
            this.detailsLabel.string = Texts.total(score);
        }
    }

    celebrate(): Promise<void> {
        this.endCelebration();
        this.sound.play('win');
        this.confetti.burst();
        this.effects.praise(Texts.praise.levelDone);
        return new Promise<void>((resolve) => {
            const end = (): void => {
                this.unschedule(end);
                this.celebrating = null;
                resolve();
            };
            this.celebrating = end;
            this.scheduleOnce(end, PopupFeel.celebrate);
        });
    }

    show(progress: ProgressSnapshot): void {
        this.endCelebration();
        this.endClosing();
        const won = progress.status === 'won';
        this.verdict = progress;
        this.ready = false;
        this.counter.reset(0);
        this.restartButton.setIdle(null);

        this.titleLabel.string = verdictTitle(progress);
        this.titleLabel.node.setScale(won ? 0 : 1);
        this.titleLabel.node.x = this.titleX;
        this.detailsLabel.string = won ? Texts.total(0) : lossDetails(progress);
        if (!won) {
            this.sound.play('lose');
        }

        const overlay = this.overlay;
        overlay.active = true;
        overlay.opacity = 0;
        this.goalBar.setGoal(progress, 0);
        this.panel.setScale(PopupFeel.panelFrom);
        this.fade.play(cc.tween(overlay).to(PopupFeel.fadeIn, { opacity: 255 }));
        this.panelMotion.play(
            cc
                .tween(this.panel)
                .to(PopupFeel.panelPop, { scale: 1 }, { easing: 'backOut' })
                .call(() => this.panelLanded(progress)),
        );
    }

    /** Stays up while it fades, so the overlay keeps the rest of a double tap off the new board. */
    hide(): Promise<void> {
        this.endCelebration();
        if (this.closing !== null) {
            return this.closing;
        }
        if (!this.overlay.active) {
            return Promise.resolve();
        }
        this.ready = false;
        this.restartButton.setIdle(null);
        this.closing = new Promise<void>((resolve) => {
            this.closed = resolve;
            this.fade.play(
                cc
                    .tween(this.overlay)
                    .to(PopupFeel.fadeOut, { opacity: 0 })
                    .call(() => this.endClosing()),
            );
        });
        return this.closing;
    }

    private panelLanded(progress: ProgressSnapshot): void {
        this.ready = true;
        this.restartButton.setIdle(PopupFeel.restartPulse);
        this.counter.setTotal(progress.score);
        this.counter.creditAll();
        const title = this.titleLabel.node;
        const shake = PopupFeel.titleShake;
        this.titleMotion.play(
            progress.status === 'won'
                ? punch(title, PopupFeel.titleStamp)
                : shakeX(title, this.titleX, shake.offset, shake.duration),
        );
    }

    private onRestart(): void {
        // A second tap during the fade must not start yet another game.
        if (this.ready && this.closing === null) {
            this.sound.play('click');
            this.restartRequested.dispatch();
        }
    }

    private endCelebration(): void {
        if (this.celebrating !== null) {
            this.celebrating();
        }
    }

    /** Takes the panel down at once and settles a running fade's promise. */
    private endClosing(): void {
        const closed = this.closed;
        if (closed === null) {
            return;
        }
        this.fade.stop();
        this.overlay.active = false;
        this.closing = null;
        this.closed = null;
        closed();
    }
}

function verdictTitle(progress: ProgressSnapshot): string {
    if (progress.status === 'won') {
        return Texts.won;
    }
    return progress.score >= PopupFeel.almost * progress.targetScore ? Texts.almost : Texts.lost;
}

function lossDetails(progress: ProgressSnapshot): string {
    const short = Texts.shortBy(progress.targetScore - progress.score);
    const reason = Texts.loseReason(progress.loseReason);
    return reason === '' ? short : `${reason}\n${short}`;
}
