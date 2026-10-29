import { GridPos } from '../../core/board/GridPos';
import { InputContext, InputState } from './InputState';

export class IdleInput implements InputState {
    constructor(private readonly ctx: InputContext) {}

    enter(): void {
        this.ctx.selectBooster(null);
        this.ctx.markTargets([]);
    }

    onCellTapped(cell: GridPos): void {
        this.ctx.tap(cell);
    }

    onBoosterPressed(id: string): void {
        if (this.ctx.boosterCharges(id) > 0) {
            this.ctx.enterAiming(id);
        }
    }
}
