import { FinaleActionFactory } from '../actions/FinaleActionFactory';
import { PlayerAction } from '../actions/PlayerAction';
import { TapActionFactory } from '../actions/TapActionFactory';
import { Board, ReadonlyBoard } from '../board/Board';
import { BoardFiller } from '../board/BoardFiller';
import { dropTiles } from '../board/Gravity';
import { GridPos } from '../board/GridPos';
import { BoosterInventory } from '../boosters/BoosterInventory';
import { AutoShuffle } from '../rules/AutoShuffle';
import { GroupRules } from '../rules/GroupRules';
import { HintPolicy } from '../rules/HintPolicy';
import { LevelProgress, ProgressSnapshot } from '../rules/LevelProgress';
import { RewardGroup, SuperTileRewards } from '../rules/SuperTileRewards';
import { TurnStep } from './TurnStep';

export interface TurnResult {
    readonly steps: ReadonlyArray<TurnStep>;
    readonly scoreGained: number;
    readonly progress: ProgressSnapshot;
}

/** Everything a game is made of, assembled by createBlastGame. */
export interface BlastGameParts {
    readonly board: Board;
    readonly progress: LevelProgress;
    readonly rules: GroupRules;
    readonly tapActions: TapActionFactory;
    readonly finale: FinaleActionFactory;
    readonly boosters: BoosterInventory;
    readonly filler: BoardFiller;
    readonly autoShuffle: AutoShuffle;
    readonly hints: HintPolicy;
    readonly rewards: SuperTileRewards;
}

/**
 * Entry point of the game model. Knows the order of a turn and nothing about rendering:
 * action -> score -> moves -> gravity -> refill -> dead board check.
 */
export class BlastGame {
    private readonly board: Board;
    private readonly progress: LevelProgress;
    private readonly rules: GroupRules;
    private readonly tapActions: TapActionFactory;
    private readonly finale: FinaleActionFactory;
    private readonly boosters: BoosterInventory;
    private readonly filler: BoardFiller;
    private readonly autoShuffle: AutoShuffle;
    private readonly hints: HintPolicy;
    private readonly rewardScout: SuperTileRewards;

    constructor(parts: BlastGameParts) {
        this.board = parts.board;
        this.progress = parts.progress;
        this.rules = parts.rules;
        this.tapActions = parts.tapActions;
        this.finale = parts.finale;
        this.boosters = parts.boosters;
        this.filler = parts.filler;
        this.autoShuffle = parts.autoShuffle;
        this.hints = parts.hints;
        this.rewardScout = parts.rewards;
    }

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

    /** The cells a tap here hits first: the group, or the area of a super tile. Empty when the tap does nothing. */
    tapPreview(at: GridPos): GridPos[] {
        return this.isPlaying ? this.tapActions.create(this.board, at).previewCells(this.board) : [];
    }

    /**
     * What aiming the booster at `at` would hit, after the cells already picked. Empty when that pick does nothing,
     * including a last pick that completes targets the game would refuse, like a teleport between two blue tiles.
     */
    boosterPreview(id: string, picked: ReadonlyArray<GridPos>, at: GridPos): GridPos[] {
        if (!this.isPlaying) {
            return [];
        }
        const booster = this.boosters.get(id);
        const completes = picked.length + 1 === booster.targetCount;
        if (completes && !booster.createAction(picked.concat([at])).canApply(this.board)) {
            return [];
        }
        return booster.previewCells(this.board, at);
    }

    /** A move to suggest to a player who hesitates. Empty without a move or once the level is over. */
    hint(): GridPos[] {
        return this.isPlaying ? this.hints.suggest(this.board) : [];
    }

    /** The groups a tap would turn into a super tile, with the kinds each may become. Empty once the level is over. */
    rewards(): RewardGroup[] {
        return this.isPlaying ? this.rewardScout.find(this.board) : [];
    }

    /** Returns null when the tap does nothing: an empty cell, a lonely tile, or the game is over. */
    tap(at: GridPos): TurnResult | null {
        return this.isPlaying ? this.play(this.tapActions.create(this.board, at), true) : null;
    }

    /** Boosters cost a charge, not a move. */
    useBooster(id: string, targets: ReadonlyArray<GridPos>): TurnResult | null {
        const booster = this.boosters.get(id);
        if (targets.length !== booster.targetCount) {
            throw new Error(`Booster "${id}" needs ${booster.targetCount} targets, got ${targets.length}`);
        }
        if (!this.isPlaying || this.boosters.chargesOf(id) <= 0) {
            return null;
        }
        const result = this.play(booster.createAction(targets), false);
        if (result !== null) {
            this.boosters.spend(id);
        }
        return result;
    }

    /**
     * Spends one move left after a win on a bonus super tile that fires at once. Call it until it returns null:
     * when no move is left, when the level was not won, or in the rare case no regular tile is left to turn.
     */
    playFinale(): TurnResult | null {
        if (this.progress.status !== 'won' || this.progress.movesLeft <= 0) {
            return null;
        }
        const action = this.finale.create(this.board);
        return action === null ? null : this.play(action, true);
    }

    private get isPlaying(): boolean {
        return this.progress.status === 'playing';
    }

    private play(action: PlayerAction, spendsMove: boolean): TurnResult | null {
        if (!action.canApply(this.board)) {
            return null;
        }

        const steps: TurnStep[] = [];
        let scoreGained = 0;
        for (const step of action.apply(this.board)) {
            if (step.type === 'burn') {
                const points = this.progress.addBurn(step);
                scoreGained += points;
                steps.push({ ...step, points });
            } else {
                steps.push(step);
            }
        }
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
