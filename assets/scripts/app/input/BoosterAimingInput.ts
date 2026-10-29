import { GridPos, samePos } from '../../core/board/GridPos';
import { CellRelease } from '../CellRelease';
import { InputCommands, InputCues, InputQueries, InputState } from './InputState';

/**
 * Collects as many cells as the booster asks for, then fires it.
 * Works for the one-target bomb and the two-target teleport alike.
 */
export class BoosterAimingInput implements InputState {
    readonly offersHint = false;
    readonly acceptsTaps = true;
    private readonly targets: GridPos[] = [];

    constructor(
        private readonly commands: InputCommands,
        private readonly queries: InputQueries,
        private readonly cues: InputCues,
        private readonly boosterId: string,
    ) {}

    enter(): void {
        this.cues.selectBooster(this.boosterId);
    }

    exit(): void {
        this.cues.selectBooster(null);
        this.cues.showTargets([]);
        this.cues.showBoosterPreview([]);
    }

    /** The pick is where the finger comes up, so a slide under the preview glow corrects the aim. */
    onCellReleased(release: CellRelease): void {
        const cell = release.released;
        const last = this.targets[this.targets.length - 1];
        if (last !== undefined && samePos(last, cell)) {
            this.targets.pop();
            this.cues.showTargets(this.targets);
            return;
        }

        this.targets.push(cell);
        if (this.targets.length < this.queries.boosterTargetCount(this.boosterId)) {
            this.cues.showTargets(this.targets);
            return;
        }
        if (!this.commands.useBooster(this.boosterId, this.targets.slice())) {
            // Only the last pick was refused: the ones before it stand, and aiming goes on.
            this.targets.pop();
            this.cues.showTargets(this.targets);
        }
    }

    onCellPointed(cell: GridPos | null): void {
        if (cell === null) {
            this.cues.showBoosterPreview([]);
            return;
        }
        // Over the last pick a release takes it back, so the preview shows that cell as a fresh pick.
        const last = this.targets[this.targets.length - 1];
        const picked = last !== undefined && samePos(last, cell) ? this.targets.slice(0, -1) : this.targets;
        this.cues.showBoosterPreview(this.queries.boosterPreview(this.boosterId, picked, cell));
    }

    /** The same booster again cancels aiming. An empty one is refused, and aiming goes on. */
    onBoosterPressed(id: string): void {
        if (id === this.boosterId) {
            this.commands.enterIdle();
        } else if (this.queries.boosterCharges(id) <= 0) {
            this.cues.rejectBooster(id);
        } else {
            this.commands.enterAiming(id);
        }
    }
}
