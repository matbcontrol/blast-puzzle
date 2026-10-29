import { GridPos } from '../../core/board/GridPos';
import { InputContext, InputState } from './InputState';

export class IdleInput implements InputState {
    readonly offersHint = true;

    constructor(private readonly ctx: InputContext) {}

    enter(): void {
        this.ctx.selectBooster(null);
        this.ctx.markTargets([]);
        this.ctx.showBoosterPreview([]);
    }

    onCellTapped(cell: GridPos): void {
        this.ctx.tap(cell);
    }

    onCellPointed(cell: GridPos | null): void {
        this.ctx.showTapPreview(cell === null ? [] : this.ctx.tapPreview(cell));
    }

    onBoosterPressed(id: string): void {
        if (this.ctx.boosterCharges(id) > 0) {
            this.ctx.enterAiming(id);
        } else {
            this.ctx.rejectBooster(id);
        }
    }
}
