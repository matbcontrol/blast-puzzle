import { GridPos, samePos } from '../../core/board/GridPos';
import { InputContext, InputState } from './InputState';

/**
 * Collects as many cells as the booster asks for, then fires it.
 * Works for the one-target bomb and the two-target teleport alike.
 */
export class BoosterAimingInput implements InputState {
    private readonly targets: GridPos[] = [];

    constructor(
        private readonly ctx: InputContext,
        private readonly boosterId: string,
    ) {}

    enter(): void {
        this.ctx.selectBooster(this.boosterId);
        this.ctx.markTargets([]);
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

    onBoosterPressed(id: string): void {
        if (id === this.boosterId || this.ctx.boosterCharges(id) <= 0) {
            this.ctx.enterIdle();
            return;
        }
        this.ctx.enterAiming(id);
    }
}
