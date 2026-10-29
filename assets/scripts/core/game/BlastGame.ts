import { PlayerAction } from '../actions/PlayerAction';
import { TapActionFactory } from '../actions/TapActionFactory';
import { Board, ReadonlyBoard } from '../board/Board';
import { BoardFiller } from '../board/BoardFiller';
import { dropTiles } from '../board/Gravity';
import { GridPos, posKey } from '../board/GridPos';
import { BoosterInventory } from '../boosters/BoosterInventory';
import { AutoShuffle } from '../rules/AutoShuffle';
import { GroupRules } from '../rules/GroupRules';
import { LevelProgress, ProgressSnapshot } from '../rules/LevelProgress';
import { ActionStep, TurnStep } from './TurnStep';

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

    /** The cells a tap here would burn: the group, or a super tile alone. Empty when the tap does nothing. */
    tapPreview(at: GridPos): GridPos[] {
        const tile = this.board.tileAt(at);
        if (this.progress.status !== 'playing' || tile === null) {
            return [];
        }
        if (tile.isSuper) {
            return [at];
        }
        return this.rules.burnableGroupAt(this.board, at) || [];
    }

    boosterPreview(id: string, at: GridPos): GridPos[] {
        return this.boosters.get(id).previewCells(this.board, at);
    }

    /** A move to suggest to a player who hesitates: any super tile, else the biggest group. Null without a move. */
    hint(): GridPos[] | null {
        return this.progress.status === 'playing' ? bestMove(this.board, this.rules) : null;
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

        const steps = action.apply(this.board).map((step) => this.scored(step));
        if (spendsMove) {
            this.progress.spendMove();
        }
        this.settle(steps);

        return { steps, scoreGained: totalPoints(steps), progress: this.progress.snapshot() };
    }

    private scored(step: ActionStep): TurnStep {
        return step.type === 'burn' ? this.progress.scoreBurn(step) : step;
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

function totalPoints(steps: ReadonlyArray<TurnStep>): number {
    return steps.reduce((sum, step) => sum + (step.type === 'burn' ? step.points : 0), 0);
}

function bestMove(board: ReadonlyBoard, rules: GroupRules): GridPos[] | null {
    let best: GridPos[] | null = null;
    const counted = new Set<string>();
    for (const p of board.positions()) {
        const tile = board.tileAt(p);
        if (tile === null || counted.has(posKey(p))) {
            continue;
        }
        if (tile.isSuper) {
            return [p];
        }
        const group = rules.burnableGroupAt(board, p);
        if (group !== null) {
            group.forEach((member) => counted.add(posKey(member)));
            if (best === null || group.length > best.length) {
                best = group;
            }
        }
    }
    return best;
}
