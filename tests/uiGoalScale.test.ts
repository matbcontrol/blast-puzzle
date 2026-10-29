import { LevelProgress } from '../assets/scripts/core/rules/LevelProgress';
import { GoalScale } from '../assets/scripts/view/GoalScale';
import { bottomRow, groupBurn } from './helpers/steps';

const goal = { targetScore: 3200, starScores: [3750, 4400] as const };
const places = [0.6, 0.8, 1];

describe('GoalScale', () => {
    const scale = new GoalScale(goal, places);

    it('puts each star mark at its place, whatever its score', () => {
        expect(scale.fraction(0)).toBe(0);
        expect(scale.fraction(3200)).toBeCloseTo(0.6);
        expect(scale.fraction(3750)).toBeCloseTo(0.8);
        expect(scale.fraction(4400)).toBeCloseTo(1);
    });

    it('fills linearly between the marks and stops at the end', () => {
        expect(scale.fraction(1600)).toBeCloseTo(0.3);
        expect(scale.fraction((3750 + 4400) / 2)).toBeCloseTo(0.9);
        expect(scale.fraction(9000)).toBe(1);
    });

    it('rises with the score', () => {
        const fractions = Array.from({ length: 50 }, (_, i) => scale.fraction(i * 100));
        fractions.slice(1).forEach((f, i) => expect(f).toBeGreaterThanOrEqual(fractions[i]));
    });

    it('lights exactly the stars the model awards', () => {
        const level = new LevelProgress(goal.targetScore, goal.starScores, 1000, { pointsFor: () => 50 });
        for (let turn = 0; turn < 100; turn++) {
            const snapshot = level.snapshot();
            expect(scale.reached(snapshot.score)).toBe(snapshot.stars);
            level.addBurn(groupBurn(bottomRow(2)));
        }
    });

    it('wants one place per mark', () => {
        expect(() => new GoalScale(goal, [0.5, 1])).toThrow(/3 star marks/);
    });
});
