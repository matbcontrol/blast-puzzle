import { BoosterPresenter } from '../app/GameViews';
import { Signal } from '../app/Signal';
import { BoosterButton } from './BoosterButton';

const { ccclass, property } = cc._decorator;

@ccclass
export class BoosterPanel extends cc.Component implements BoosterPresenter {
    @property([BoosterButton])
    buttons: BoosterButton[] = [];

    readonly boosterPressed = new Signal<string>();

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

    select(id: string | null): void {
        this.buttons.forEach((button) => button.setSelected(button.boosterId === id));
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
