import { GridPos, samePos } from '../../core/board/GridPos';
import { InputContext, InputState } from './InputState';

/**
 * Collects as many cells as the booster asks for, then fires it.
 * Works for the one-target bomb and the two-target teleport alike.
 */
export class BoosterAimingInput implements InputState {
    readonly offersHint = false;
    private readonly targets: GridPos[] = [];

    constructor(
        private readonly ctx: InputContext,
        private readonly boosterId: string,
    ) {}

    enter(): void {
        this.ctx.selectBooster(this.boosterId);
        this.ctx.markTargets([]);
        this.ctx.showTapPreview([]);
    }

    onCellTapped(cell: GridPos): void {
        const last = this.targets[this.targets.length - 1];
        if (last !== undefined && samePos(last, cell)) {
            this.targets.pop();
            this.ctx.markTargets(this.targets);
            return;
        }

        this.targets.push(cell);
        if (this.targets.length < this.ctx.boosterTargetCount(this.boosterId)) {
            this.ctx.markTargets(this.targets);
            return;
        }
        this.ctx.useBooster(this.boosterId, this.targets.slice());
    }

    onCellPointed(cell: GridPos | null): void {
        this.ctx.showBoosterPreview(cell === null ? [] : this.ctx.boosterPreview(this.boosterId, cell));
    }

    /** The same booster again cancels aiming. An empty one is refused, and aiming goes on. */
    onBoosterPressed(id: string): void {
        if (id === this.boosterId) {
            this.ctx.enterIdle();
        } else if (this.ctx.boosterCharges(id) <= 0) {
            this.ctx.rejectBooster(id);
        } else {
            this.ctx.enterAiming(id);
        }
    }
}
