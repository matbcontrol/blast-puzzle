import { BoosterPresenter } from '../app/GameViews';
import { Signal } from '../app/Signal';
import { NoSound } from './animation/Silent';
import { AimCaption } from './AimCaption';
import { SoundBoard } from './audio/SoundBoard';
import { BoosterButton } from './BoosterButton';
import { Texts } from './Texts';

const { ccclass, property } = cc._decorator;

@ccclass
export class BoosterPanel extends cc.Component implements BoosterPresenter {
    @property([BoosterButton])
    buttons: BoosterButton[] = [];

    @property({ type: AimCaption, tooltip: 'Says what the selected booster wants, over the buttons' })
    caption: AimCaption = null!;

    readonly boosterPressed = new Signal<string>();

    private selected: string | null = null;
    private sound: SoundBoard = new NoSound();

    setSound(sound: SoundBoard): void {
        this.sound = sound;
    }

    onLoad(): void {
        this.buttons.forEach((button) => button.pressed.add((id) => this.boosterPressed.dispatch(id)));
    }

    onDestroy(): void {
        this.boosterPressed.clear();
    }

    showCharges(id: string, charges: number): void {
        const button = this.find(id);
        if (button !== null) {
            button.showCharges(charges);
        }
    }

    /** Only picking a booster sounds: the selection also clears when a booster fires, under its own sound. */
    select(id: string | null): void {
        if (id !== null && id !== this.selected) {
            this.sound.play('select');
        }
        this.selected = id;
        this.buttons.forEach((button) => button.setSelected(button.boosterId === id));
        this.caption.show(id === null ? null : Texts.aimCaption(id));
    }

    rejectPress(id: string): void {
        const button = this.find(id);
        if (button !== null) {
            this.sound.play('reject');
            button.reject();
        }
    }

    private find(id: string): BoosterButton | null {
        for (const button of this.buttons) {
            if (button.boosterId === id) {
                return button;
            }
        }
        return null;
    }
}
