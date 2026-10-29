import { GridPos } from '../../core/board/GridPos';
import { CellRelease } from '../CellRelease';
import { BoardCues, BoosterCues } from '../GameViews';

/**
 * State pattern for player input: the same tap means different things while idle, aiming or animating.
 * A state takes down in exit() every cue it put up, so no state clears another's.
 */
export interface InputState {
    /** The board suggests a move after a while in this state. */
    readonly offersHint: boolean;
    /** A tap counts here, now or once the board rests, so a pressed tile may look pressed. */
    readonly acceptsTaps: boolean;
    enter(): void;
    exit(): void;
    onCellReleased(release: CellRelease): void;
    /** Also called right after enter(), with wherever the pointer already is. */
    onCellPointed(cell: GridPos | null): void;
    onBoosterPressed(id: string): void;
}

/** What a state may ask the controller to do. States ask for transitions by name and never import each other. */
export interface InputCommands {
    enterIdle(): void;
    enterAiming(boosterId: string): void;
    tap(at: GridPos): void;
    /** False when the game refuses these targets: no charge is spent, and the state may keep aiming. */
    useBooster(id: string, targets: ReadonlyArray<GridPos>): boolean;
}

/** What a state may ask the game. The game itself is passed in, so the states see only these four. */
export interface InputQueries {
    boosterCharges(id: string): number;
    boosterTargetCount(id: string): number;
    tapPreview(at: GridPos): ReadonlyArray<GridPos>;
    boosterPreview(id: string, picked: ReadonlyArray<GridPos>, at: GridPos): ReadonlyArray<GridPos>;
}

/** The cues states draw, under the names the views give them. The hint is IdleHint's, not a state's. */
export type InputCues = Pick<BoardCues, 'showTargets' | 'showTapPreview' | 'showBoosterPreview'> & BoosterCues;
