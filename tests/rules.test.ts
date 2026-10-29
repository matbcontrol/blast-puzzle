import { parseLevelConfig } from '../assets/scripts/core/config/parseLevelConfig';
import { LevelProgress } from '../assets/scripts/core/rules/LevelProgress';
import { ProgressiveScore } from '../assets/scripts/core/rules/ScoreFormula';
import { SuperTilePicker } from '../assets/scripts/core/tiles/SuperTilePicker';
import { alwaysRed, testConfig } from './helpers/fixtures';

describe('ProgressiveScore', () => {
    it('rewards bigger groups more than linearly', () => {
        const score = new ProgressiveScore(10);
        expect(score.pointsFor(0)).toBe(0);
        expect(score.pointsFor(2)).toBe(30);
        expect(score.pointsFor(5)).toBe(150);
        expect(score.pointsFor(10)).toBeGreaterThan(2 * score.pointsFor(5));
    });
});

describe('LevelProgress', () => {
    const progress = (target: number, moves: number) => new LevelProgress(target, moves, new ProgressiveScore(10));

    it('prefers a win over running out of moves', () => {
        const level = progress(30, 1);
        level.addBurned(2);
        level.spendMove();
        expect(level.snapshot()).toMatchObject({ status: 'won', loseReason: null, movesLeft: 0 });
    });

    it('does not allow spending moves that are gone', () => {
        const level = progress(100, 1);
        level.spendMove();
        expect(() => level.spendMove()).toThrow();
    });
});

describe('SuperTilePicker', () => {
    const picker = new SuperTilePicker(
        [
            { minGroupSize: 6, kinds: ['row'] },
            { minGroupSize: 10, kinds: ['field'] },
            { minGroupSize: 8, kinds: ['bomb'] },
        ],
        alwaysRed(),
    );

    it('gives the strongest reward the group qualifies for', () => {
        expect(picker.pick(5)).toBeNull();
        expect(picker.pick(6)).toBe('row');
        expect(picker.pick(9)).toBe('bomb');
        expect(picker.pick(15)).toBe('field');
    });
});

describe('parseLevelConfig', () => {
    it('accepts a valid config', () => {
        const raw = JSON.parse(JSON.stringify(testConfig({ seed: 7 })));
        expect(parseLevelConfig(raw)).toEqual(testConfig({ seed: 7 }));
    });

    it('lists every problem at once', () => {
        const raw = { ...testConfig(), cols: 0, moves: 'ten', superTiles: [{ minGroupSize: 1, kinds: [] }] };
        let message = '';
        try {
            parseLevelConfig(raw);
        } catch (e) {
            message = (e as Error).message;
        }
        expect(message).toContain('cols');
        expect(message).toContain('moves');
        expect(message).toContain('superTiles[0].minGroupSize');
        expect(message).toContain('superTiles[0].kinds');
    });

    it('rejects a board too small to guarantee a group after shuffling', () => {
        const raw = { ...testConfig(), cols: 2, rows: 2, colors: 5 };
        expect(() => parseLevelConfig(raw)).toThrow('too small');
    });
});
