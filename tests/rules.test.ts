import { gridPos } from '../assets/scripts/core/board/GridPos';
import { GroupRules } from '../assets/scripts/core/rules/GroupRules';
import { parseLevelConfig } from '../assets/scripts/core/config/parseLevelConfig';
import { LevelProgress } from '../assets/scripts/core/rules/LevelProgress';
import { BlastScore } from '../assets/scripts/core/rules/ScoreFormula';
import { SuperTileRewards } from '../assets/scripts/core/rules/SuperTileRewards';
import { SuperKinds } from '../assets/scripts/core/tiles/SuperKinds';
import { SuperTilePicker } from '../assets/scripts/core/tiles/SuperTilePicker';
import { boardFromText } from './helpers/boardText';
import { alwaysRed, testConfig } from './helpers/fixtures';
import { blastBurn, blastWave, bottomRow, groupBurn } from './helpers/steps';

const bombWave = (size: number) => blastWave(SuperKinds.Bomb, gridPos(0, 0), bottomRow(size));

describe('BlastScore', () => {
    const score = new BlastScore(10);

    it('rewards bigger tapped groups more than linearly', () => {
        expect(score.pointsFor(groupBurn(bottomRow(2)))).toBe(30);
        expect(score.pointsFor(groupBurn(bottomRow(5)))).toBe(150);
        expect(score.pointsFor(groupBurn(bottomRow(10)))).toBeGreaterThan(2 * score.pointsFor(groupBurn(bottomRow(5))));
    });

    it('pays explosions per tile, chained ones included, so a whole-board blast does not break the level', () => {
        expect(score.pointsFor(blastBurn(bombWave(90)))).toBe(900);
        expect(score.pointsFor(blastBurn(bombWave(3), bombWave(9)))).toBe(120);
    });
});

describe('LevelProgress', () => {
    const progress = (target: number, moves: number) =>
        new LevelProgress(target, [2 * target, 3 * target], moves, new BlastScore(10));

    it('adds every burn to the score and returns the points it added', () => {
        const level = progress(1000, 5);

        const points = [level.addBurn(groupBurn(bottomRow(5))), level.addBurn(blastBurn(bombWave(3), bombWave(4)))];

        expect(points).toEqual([150, 70]);
        expect(level.snapshot().score).toBe(220);
    });

    it('gives the first star at the target and one more at each star score', () => {
        const level = progress(100, 5);
        const stars = [level.snapshot().stars];

        for (let i = 0; i < 3; i++) {
            level.addBurn(blastBurn(bombWave(10)));
            stars.push(level.snapshot().stars);
        }

        expect(stars).toEqual([0, 1, 2, 3]);
        expect(level.snapshot().starScores).toEqual([200, 300]);
    });

    it('prefers a win over running out of moves', () => {
        const level = progress(30, 1);
        level.addBurn(groupBurn(bottomRow(2)));
        level.spendMove();
        expect(level.snapshot()).toMatchObject({ status: 'won', loseReason: null, movesLeft: 0, stars: 1 });
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
            { minGroupSize: 6, kinds: [SuperKinds.Row] },
            { minGroupSize: 10, kinds: [SuperKinds.Field] },
            { minGroupSize: 8, kinds: [SuperKinds.Bomb] },
        ],
        alwaysRed(),
    );

    it('gives the strongest reward the group qualifies for', () => {
        expect(picker.pick(5)).toBeNull();
        expect(picker.pick(6)).toBe(SuperKinds.Row);
        expect(picker.pick(9)).toBe(SuperKinds.Bomb);
        expect(picker.pick(15)).toBe(SuperKinds.Field);
    });

    it('tells whether a group earns anything without drawing a random number', () => {
        const next = jest.fn(() => 0);
        const silent = new SuperTilePicker([{ minGroupSize: 6, kinds: [SuperKinds.Row] }], { next });

        expect([silent.earnsSuper(5), silent.earnsSuper(6)]).toEqual([false, true]);
        expect(next).not.toHaveBeenCalled();
    });
});

describe('SuperTileRewards', () => {
    const next = jest.fn(() => 0);
    const picker = new SuperTilePicker(
        [
            { minGroupSize: 6, kinds: [SuperKinds.Row, SuperKinds.Column] },
            { minGroupSize: 8, kinds: [SuperKinds.Bomb] },
            { minGroupSize: 10, kinds: [SuperKinds.Field] },
        ],
        { next },
    );
    const rewards = new SuperTileRewards(new GroupRules(2), picker);

    it('lists every group that earns a super tile with all the kinds of its strongest rule', () => {
        const found = rewards.find(
            boardFromText([
                'RRRRRBBBBBB', // 5 red earn nothing, 6 blue earn a rocket
                'GGGGGGGGYYY', // 8 green earn a bomb
                'PPPPPPPPPPY', // 10 purple earn the field
            ]),
        );
        const bySize = found.map((group) => [group.cells.length, group.kinds]).sort((a, b) => +a[0] - +b[0]);

        expect(bySize).toEqual([
            [6, [SuperKinds.Row, SuperKinds.Column]],
            [8, [SuperKinds.Bomb]],
            [10, [SuperKinds.Field]],
        ]);
        expect(next).not.toHaveBeenCalled();
    });
});

describe('parseLevelConfig', () => {
    const errorOf = (raw: unknown): string => {
        try {
            parseLevelConfig(raw);
        } catch (e) {
            return (e as Error).message;
        }
        return '';
    };

    it('accepts a valid config', () => {
        const raw = JSON.parse(JSON.stringify(testConfig({ seed: 7 })));
        expect(parseLevelConfig(raw)).toEqual(testConfig({ seed: 7 }));
    });

    it('lists every problem at once', () => {
        const message = errorOf({
            ...testConfig(),
            cols: 0,
            moves: 'ten',
            superTiles: [{ minGroupSize: 1, kinds: [] }],
        });

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

    it('rejects a super tile kind the game does not have', () => {
        const raw = { ...testConfig(), superTiles: [{ minGroupSize: 5, kinds: ['row', 'rainbow'] }] };
        expect(errorOf(raw)).toContain('superTiles[0].kinds: expected a non-empty list of row, column, bomb, field');
    });

    it.each([
        ['missing', undefined],
        ['one score', [2000]],
        ['two stars at the target', [1000, 3000]],
        ['three stars below two', [3000, 2000]],
        ['not integers', [2000.5, 3000]],
    ])('rejects star scores: %s', (_, starScores) => {
        expect(errorOf({ ...testConfig({ targetScore: 1000 }), starScores })).toContain(
            'starScores: expected 2 increasing integers above 1000',
        );
    });
});
