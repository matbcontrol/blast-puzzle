import { PlayerAction } from '../actions/PlayerAction';
import { TapActionFactory } from '../actions/TapActionFactory';
import { Board, ReadonlyBoard } from '../board/Board';
import { BoardFiller } from '../board/BoardFiller';
import { dropTiles } from '../board/Gravity';
import { GridPos } from '../board/GridPos';
import { BoosterInventory } from '../boosters/BoosterInventory';
import { AutoShuffle } from '../rules/AutoShuffle';
import { GroupRules } from '../rules/GroupRules';
import { LevelProgress, ProgressSnapshot } from '../rules/LevelProgress';
import { countBurned, TurnStep } from './TurnStep';

export interface TurnResult {
    readonly steps: ReadonlyArray<TurnStep>;
    readonly scoreGained: number;
    readonly progress: ProgressSnapshot;
}

/**
 * Entry point of the game model. Knows the order of a turn and nothing about rendering:
 * action -> gravity -> refill -> score and moves -> dead board check.
 */
export class BlastGame {
    constructor(
        private readonly board: Board,
        private readonly progress: LevelProgress,
        private readonly rules: GroupRules,
        private readonly tapActions: TapActionFactory,
        private readonly boosters: BoosterInventory,
        private readonly filler: BoardFiller,
        private readonly autoShuffle: AutoShuffle,
    ) {}

    get currentBoard(): ReadonlyBoard {
        return this.board;
    }

    get progressSnapshot(): ProgressSnapshot {
        return this.progress.snapshot();
    }

    get shufflesLeft(): number {
        return this.autoShuffle.remaining;
    }

    boosterIds(): string[] {
        return this.boosters.ids();
    }

    boosterCharges(id: string): number {
        return this.boosters.chargesOf(id);
    }

    boosterTargetCount(id: string): number {
        return this.boosters.get(id).targetCount;
    }

    /** Returns null when the tap does nothing: an empty cell, a lonely tile, or the game is over. */
    tap(at: GridPos): TurnResult | null {
        return this.play(this.tapActions.create(this.board, at), true);
    }

    /** Boosters cost a charge, not a move. */
    useBooster(id: string, targets: ReadonlyArray<GridPos>): TurnResult | null {
        const booster = this.boosters.get(id);
        if (targets.length !== booster.targetCount) {
            throw new Error(`Booster "${id}" needs ${booster.targetCount} targets, got ${targets.length}`);
        }
        if (this.boosters.chargesOf(id) <= 0) {
            return null;
        }
        const result = this.play(booster.createAction(targets), false);
        if (result !== null) {
            this.boosters.spend(id);
        }
        return result;
    }

    private play(action: PlayerAction, spendsMove: boolean): TurnResult | null {
        if (this.progress.status !== 'playing' || !action.canApply(this.board)) {
            return null;
        }

        const steps = action.apply(this.board);
        const scoreGained = this.progress.addBurned(countBurned(steps));
        if (spendsMove) {
            this.progress.spendMove();
        }
        this.settle(steps);

        return { steps, scoreGained, progress: this.progress.snapshot() };
    }

    private settle(steps: TurnStep[]): void {
        const fallen = dropTiles(this.board);
        if (fallen.length > 0) {
            steps.push({ type: 'fall', moves: fallen });
        }
        const spawned = this.filler.fillEmpty(this.board);
        if (spawned.length > 0) {
            steps.push({ type: 'refill', tiles: spawned });
        }

        if (this.progress.status !== 'playing' || this.rules.hasMove(this.board)) {
            return;
        }
        const shuffled = this.autoShuffle.tryShuffle(this.board);
        if (shuffled === null) {
            this.progress.markStuck();
        } else {
            steps.push({ type: 'shuffle', moves: shuffled });
        }
    }
}
