import { GridPos } from '../../core/board/GridPos';

/** State pattern for player input: the same tap means different things while idle, aiming or animating. */
export interface InputState {
    enter(): void;
    onCellTapped(cell: GridPos): void;
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
    selectBooster(id: string | null): void;
    markTargets(cells: ReadonlyArray<GridPos>): void;
}
