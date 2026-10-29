import { BurnOutcome } from '../game/TurnStep';
import { ScoreFormula } from './ScoreFormula';

export type GameStatus = 'playing' | 'won' | 'lost';
export type LoseReason = 'outOfMoves' | 'noMoves';
export type StarCount = 0 | 1 | 2 | 3;
/** Scores for the second and the third star. The first star comes with the target score. */
export type StarScores = readonly [number, number];

export interface ProgressSnapshot {
    readonly score: number;
    readonly targetScore: number;
    readonly starScores: StarScores;
    readonly stars: StarCount;
    readonly movesLeft: number;
    readonly status: GameStatus;
    readonly loseReason: LoseReason | null;
}

/** Score, moves, stars and the win/lose verdict. Reaching the target on the last move counts as a win. */
export class LevelProgress {
    private score = 0;
    private moves: number;
    private stuck = false;

    constructor(
        private readonly targetScore: number,
        private readonly starScores: StarScores,
        moves: number,
        private readonly formula: ScoreFormula,
    ) {
        this.moves = moves;
    }

    get movesLeft(): number {
        return this.moves;
    }

    get status(): GameStatus {
        if (this.score >= this.targetScore) {
            return 'won';
        }
        return this.loseReason === null ? 'playing' : 'lost';
    }

    get loseReason(): LoseReason | null {
        if (this.score >= this.targetScore) {
            return null;
        }
        if (this.moves <= 0) {
            return 'outOfMoves';
        }
        return this.stuck ? 'noMoves' : null;
    }

    get stars(): StarCount {
        if (this.score >= this.starScores[1]) {
            return 3;
        }
        if (this.score >= this.starScores[0]) {
            return 2;
        }
        return this.score >= this.targetScore ? 1 : 0;
    }

    /** Returns the points it added. */
    addBurn(burn: BurnOutcome): number {
        const points = this.formula.pointsFor(burn);
        this.score += points;
        return points;
    }

    spendMove(): void {
        if (this.moves <= 0) {
            throw new Error('No moves left');
        }
        this.moves--;
    }

    markStuck(): void {
        this.stuck = true;
    }

    snapshot(): ProgressSnapshot {
        return {
            score: this.score,
            targetScore: this.targetScore,
            starScores: this.starScores,
            stars: this.stars,
            movesLeft: this.moves,
            status: this.status,
            loseReason: this.loseReason,
        };
    }
}
