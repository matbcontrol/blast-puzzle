import { parseLevelConfig } from '../assets/scripts/core/config/parseLevelConfig';
import { LevelProgress } from '../assets/scripts/core/rules/LevelProgress';
import { gridPos } from '../assets/scripts/core/board/GridPos';
import { BurnStep } from '../assets/scripts/core/game/TurnStep';
import { BlastScore } from '../assets/scripts/core/rules/ScoreFormula';
import { Tile } from '../assets/scripts/core/tiles/Tile';
import { SuperTilePicker } from '../assets/scripts/core/tiles/SuperTilePicker';
import { alwaysRed, testConfig } from './helpers/fixtures';

function burn(fromGroup: boolean, ...waveSizes: number[]): BurnStep {
    const waves = waveSizes.map((size) => ({
        origin: gridPos(0, 0),
        tiles: Array.from({ length: size }, (_, i) => ({ tile: Tile.ofColor(i, 0), at: gridPos(i, 0) })),
    }));
    return { type: 'burn', waves, fromGroup };
}

describe('BlastScore', () => {
    const score = new BlastScore(10);

    it('rewards bigger tapped groups more than linearly', () => {
        expect(score.pointsFor(burn(true, 2))).toBe(30);
        expect(score.pointsFor(burn(true, 5))).toBe(150);
        expect(score.pointsFor(burn(true, 10))).toBeGreaterThan(2 * score.pointsFor(burn(true, 5)));
    });

    it('pays explosions per tile so a whole-board blast does not break the level', () => {
        expect(score.pointsFor(burn(false, 90))).toBe(900);
        expect(score.pointsFor(burn(true, 3, 9))).toBe(60 + 90);
    });
});

describe('LevelProgress', () => {
    const progress = (target: number, moves: number) => new LevelProgress(target, moves, new BlastScore(10));

    it('prefers a win over running out of moves', () => {
        const level = progress(30, 1);
        level.addScore([burn(true, 2)]);
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

    it('names colorCount when it is missing, as in configs written before the rename', () => {
        const raw: { [key: string]: unknown } = { ...testConfig(), colors: 5 };
        delete raw.colorCount;
        expect(() => parseLevelConfig(raw)).toThrow('colorCount: expected an integer');
    });

    it('rejects a board too small to guarantee a group after shuffling', () => {
        const raw = { ...testConfig(), cols: 2, rows: 2, colorCount: 5 };
        expect(() => parseLevelConfig(raw)).toThrow('too small');
    });
});
