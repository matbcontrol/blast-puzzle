import { GridPos } from '../../core/board/GridPos';

/** State pattern for player input: the same tap means different things while idle, aiming or animating. */
export interface InputState {
    /** The board suggests a move after a while in this state. */
    readonly offersHint: boolean;
    enter(): void;
    onCellTapped(cell: GridPos): void;
    /** Also called right after enter(), with wherever the pointer already is. */
    onCellPointed(cell: GridPos | null): void;
    onBoosterPressed(id: string): void;
}

/**
 * The part of the controller that input states may drive.
 * States ask for transitions by name and never import each other.
 */
export interface InputContext {
    enterIdle(): void;
    enterAiming(boosterId: string): void;
    tap(at: GridPos): void;
    useBooster(id: string, targets: ReadonlyArray<GridPos>): void;
    boosterCharges(id: string): number;
    boosterTargetCount(id: string): number;
    tapPreview(at: GridPos): GridPos[];
    boosterPreview(id: string, at: GridPos): GridPos[];
    selectBooster(id: string | null): void;
    rejectBooster(id: string): void;
    markTargets(cells: ReadonlyArray<GridPos>): void;
    showTapPreview(cells: ReadonlyArray<GridPos>): void;
    showBoosterPreview(cells: ReadonlyArray<GridPos>): void;
}
