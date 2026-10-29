import { GridPos } from '../../core/board/GridPos';
import { CellRelease, isTap } from '../CellRelease';
import { InputCommands, InputCues, InputQueries, InputState } from './InputState';

export class IdleInput implements InputState {
    readonly offersHint = true;
    readonly acceptsTaps = true;

    constructor(
        private readonly commands: InputCommands,
        private readonly queries: InputQueries,
        private readonly cues: InputCues,
    ) {}

    enter(): void {}

    exit(): void {
        this.cues.showTapPreview([]);
    }

    onCellReleased(release: CellRelease): void {
        if (isTap(release)) {
            this.commands.tap(release.released);
        }
    }

    onCellPointed(cell: GridPos | null): void {
        this.cues.showTapPreview(cell === null ? [] : this.queries.tapPreview(cell));
    }

    onBoosterPressed(id: string): void {
        if (this.queries.boosterCharges(id) > 0) {
            this.commands.enterAiming(id);
        } else {
            this.cues.rejectBooster(id);
        }
    }
}
