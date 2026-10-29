import { ProgressSnapshot } from '../core/rules/LevelProgress';

/** The scores a goal bar marks: the target and the scores of the second and the third star. */
export type GoalMarks = Pick<ProgressSnapshot, 'targetScore' | 'starScores'>;

/**
 * Maps a score onto a goal bar with three star marks: the target, then the scores of the second and the third star.
 * Each mark sits at a fixed place on the bar whatever its score, so the stars of any level stay apart,
 * and the fill runs linearly from one mark to the next.
 */
export class GoalScale {
    private readonly marks: ReadonlyArray<number>;

    /** places: where the marks sit on the bar, 0..1, rising, one per mark. */
    constructor(
        goal: GoalMarks,
        private readonly places: ReadonlyArray<number>,
    ) {
        this.marks = [goal.targetScore, goal.starScores[0], goal.starScores[1]];
        if (places.length !== this.marks.length) {
            throw new Error(`GoalScale: ${this.marks.length} star marks need as many places, got ${places.length}`);
        }
    }

    /** Share of the bar the fill covers at this score. */
    fraction(score: number): number {
        let fromScore = 0;
        let fromPlace = 0;
        for (let i = 0; i < this.marks.length; i++) {
            const mark = this.marks[i];
            const place = this.places[i];
            if (score < mark) {
                return fromPlace + ((place - fromPlace) * (score - fromScore)) / (mark - fromScore);
            }
            fromScore = mark;
            fromPlace = place;
        }
        return fromPlace;
    }

    /** How many star marks the fill has reached: the model's stars, read off the bar. */
    reached(score: number): number {
        return this.marks.filter((mark) => score >= mark).length;
    }
}
