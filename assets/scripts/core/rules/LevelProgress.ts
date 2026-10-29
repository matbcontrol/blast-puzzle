import { TurnStep } from '../game/TurnStep';
import { ScoreFormula } from './ScoreFormula';

export type GameStatus = 'playing' | 'won' | 'lost';
export type LoseReason = 'outOfMoves' | 'noMoves';

export interface ProgressSnapshot {
    readonly score: number;
    readonly targetScore: number;
    readonly movesLeft: number;
    readonly status: GameStatus;
    readonly loseReason: LoseReason | null;
}

/** Score, moves and the win/lose verdict. Reaching the target on the last move counts as a win. */
export class LevelProgress {
    private score = 0;
    private movesLeft: number;
    private stuck = false;

    constructor(
        private readonly targetScore: number,
        moves: number,
        private readonly formula: ScoreFormula,
    ) {
        this.movesLeft = moves;
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
        if (this.movesLeft <= 0) {
            return 'outOfMoves';
        }
        return this.stuck ? 'noMoves' : null;
    }

    addScore(steps: ReadonlyArray<TurnStep>): number {
        let points = 0;
        for (const step of steps) {
            if (step.type === 'burn') {
                points += this.formula.pointsFor(step);
            }
        }
        this.score += points;
        return points;
    }

    spendMove(): void {
        if (this.movesLeft <= 0) {
            throw new Error('No moves left');
        }
        this.movesLeft--;
    }

    markStuck(): void {
        this.stuck = true;
    }

    snapshot(): ProgressSnapshot {
        return {
            score: this.score,
            targetScore: this.targetScore,
            movesLeft: this.movesLeft,
            status: this.status,
            loseReason: this.loseReason,
        };
    }
}
