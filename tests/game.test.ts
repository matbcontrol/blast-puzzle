import { ActivateSuperAction } from '../assets/scripts/core/actions/ActivateSuperAction';
import { AreaBurnAction } from '../assets/scripts/core/actions/AreaBurnAction';
import { BonusSuperAction } from '../assets/scripts/core/actions/BonusSuperAction';
import { PlayerAction } from '../assets/scripts/core/actions/PlayerAction';
import { SwapAction } from '../assets/scripts/core/actions/SwapAction';
import { gridPos } from '../assets/scripts/core/board/GridPos';
import { BoosterIds } from '../assets/scripts/core/boosters/BoosterIds';
import { RadiusArea } from '../assets/scripts/core/burn/RadiusArea';
import { LevelConfig } from '../assets/scripts/core/config/LevelConfig';
import { createBlastGame } from '../assets/scripts/core/game/BlastGameFactory';
import { SeededRandom } from '../assets/scripts/core/random/SeededRandom';
import { GroupRules } from '../assets/scripts/core/rules/GroupRules';
import { SuperKinds } from '../assets/scripts/core/tiles/SuperKinds';
import { TileFactory } from '../assets/scripts/core/tiles/TileFactory';
import { boardFromText, boardToText } from './helpers/boardText';
import { alwaysRed, ScriptedRandom, testConfig, testResolver } from './helpers/fixtures';
import { blastsOf, firstBurn, stepTypes } from './helpers/steps';

function gameOn(lines: string[], overrides: Partial<LevelConfig> = {}, random = alwaysRed()) {
    const config = testConfig({ cols: lines[0].length, rows: lines.length, ...overrides });
    return createBlastGame(config, random, boardFromText(lines));
}

describe('BlastGame: tapping', () => {
    it('burns the group, drops tiles, refills and counts score and moves', () => {
        const game = gameOn([
            'GBY', //
            'RRB',
            'YGY',
        ]);

        const result = game.tap(gridPos(0, 1));

        expect(stepTypes(result)).toEqual(['burn', 'fall', 'refill']);
        expect(boardToText(game.currentBoard)).toEqual(['RRY', 'GBB', 'YGY']);
        expect(result!.scoreGained).toBe(30);
        expect(result!.progress.movesLeft).toBe(9);
    });

    it('reports a tapped group as a group burn from the tapped cell, with its points', () => {
        const game = gameOn(['GBY', 'RRB', 'YGY']);

        const burn = firstBurn(game.tap(gridPos(1, 1)));

        expect(burn).toMatchObject({ cause: 'group', collapseTo: null, points: 30 });
        expect(burn.cause === 'group' && burn.group.origin).toEqual(gridPos(1, 1));
    });

    it('ignores a lonely tile and does not spend a move', () => {
        const game = gameOn(['RG', 'GR', 'BB']);

        expect(game.tap(gridPos(0, 2))).toBeNull();
        expect(game.progressSnapshot.movesLeft).toBe(10);
    });

    it('turns a big group into a super tile at the tapped cell', () => {
        const game = gameOn(['RRRG', 'BGBY'], { superTiles: [{ minGroupSize: 3, kinds: [SuperKinds.Column] }] });

        const result = game.tap(gridPos(1, 1));

        expect(stepTypes(result)).toEqual(['burn', 'superCreated', 'refill']);
        expect(game.currentBoard.tileAt(gridPos(1, 1))!.superKind).toBe(SuperKinds.Column);
        expect(firstBurn(result)).toMatchObject({ cause: 'group', collapseTo: gridPos(1, 1) });
    });

    it('fires a super tile on tap and spends a move', () => {
        const game = gameOn(['GBYG', 'Y-BY', 'BGRB']);

        const result = game.tap(gridPos(1, 1));

        expect(result!.scoreGained).toBe(40);
        expect(result!.progress.movesLeft).toBe(9);
        expect(firstBurn(result)).toMatchObject({ cause: 'blast', points: 40 });
        expect(blastsOf(result)).toEqual([SuperKinds.Row]);
    });

    it('adds up to the score exactly what the burn steps report, chain reactions included', () => {
        const game = gameOn(['GBYG', 'Y-B|', 'BGRB'], { targetScore: 10_000, starScores: [20_000, 30_000] });

        const result = game.tap(gridPos(1, 1));
        const burn = firstBurn(result);

        expect(blastsOf(result)).toEqual([SuperKinds.Row, SuperKinds.Column]);
        expect(burn.points).toBe(result!.scoreGained);
        expect(result!.progress.score).toBe(burn.points);
    });
});

describe('BlastGame: boosters', () => {
    it('bomb spends a charge but not a move and goes off as a bomb explosion', () => {
        const game = gameOn(['GBY', 'YGB', 'BYG'], { bombCharges: 1 });

        const result = game.useBooster(BoosterIds.Bomb, [gridPos(1, 1)]);

        expect(result!.scoreGained).toBe(90);
        expect(blastsOf(result)).toEqual([SuperKinds.Bomb]);
        expect(result!.progress.movesLeft).toBe(10);
        expect(game.boosterCharges(BoosterIds.Bomb)).toBe(0);
        expect(game.useBooster(BoosterIds.Bomb, [gridPos(1, 1)])).toBeNull();
    });

    it('teleport swaps two tiles and does not burn anything', () => {
        const game = gameOn(['RG', 'GG']);

        const result = game.useBooster(BoosterIds.Teleport, [gridPos(0, 1), gridPos(1, 0)]);

        expect(stepTypes(result)).toEqual(['swap']);
        expect(boardToText(game.currentBoard)).toEqual(['GG', 'GR']);
        expect(game.boosterCharges(BoosterIds.Teleport)).toBe(1);
    });

    it('rejects a teleport onto the same cell and keeps the charge', () => {
        const game = gameOn(['RG', 'GG']);

        expect(game.useBooster(BoosterIds.Teleport, [gridPos(0, 0), gridPos(0, 0)])).toBeNull();
        expect(game.boosterCharges(BoosterIds.Teleport)).toBe(2);
    });

    it('rejects a teleport between tiles that look the same and keeps the charge', () => {
        const game = gameOn([
            'R|', //
            'GR',
            '|G',
        ]);

        expect(game.useBooster(BoosterIds.Teleport, [gridPos(0, 2), gridPos(1, 1)])).toBeNull();
        expect(game.useBooster(BoosterIds.Teleport, [gridPos(1, 2), gridPos(0, 0)])).toBeNull();
        expect(boardToText(game.currentBoard)).toEqual(['R|', 'GR', '|G']);
        expect(game.boosterCharges(BoosterIds.Teleport)).toBe(2);
    });

    it('teleports a super tile onto a regular one', () => {
        const game = gameOn(['R|', 'GB']);

        expect(game.useBooster(BoosterIds.Teleport, [gridPos(1, 1), gridPos(0, 0)])).not.toBeNull();
        expect(boardToText(game.currentBoard)).toEqual(['RG', '|B']);
    });

    it('does not use a booster once the level is over', () => {
        const game = gameOn(['RRB', 'GBG'], { targetScore: 30 });
        game.tap(gridPos(0, 1));

        expect(game.useBooster(BoosterIds.Bomb, [gridPos(1, 1)])).toBeNull();
        expect(game.boosterCharges(BoosterIds.Bomb)).toBe(2);
    });
});

describe('PlayerAction', () => {
    it('previews nothing and throws from apply() when canApply() is false, leaving the board alone', () => {
        const burner = testResolver();
        const board = boardFromText(['RR', 'G|']);
        const refused: PlayerAction[] = [
            new SwapAction(gridPos(0, 1), gridPos(1, 1)),
            new AreaBurnAction(gridPos(2, 0), new RadiusArea(1), burner, SuperKinds.Bomb),
            new ActivateSuperAction(gridPos(0, 0), burner),
            new BonusSuperAction(gridPos(1, 0), SuperKinds.Row, new TileFactory(alwaysRed(), 5), burner),
        ];

        for (const action of refused) {
            expect(action.canApply(board)).toBe(false);
            expect(action.previewCells(board)).toEqual([]);
            expect(() => action.apply(board)).toThrow();
        }
        expect(boardToText(board)).toEqual(['RR', 'G|']);
    });
});

describe('BlastGame: win and lose', () => {
    it('wins when the target is reached, even on the last move', () => {
        const game = gameOn(['RRB', 'GBG'], { targetScore: 30, moves: 1 });

        expect(game.tap(gridPos(0, 1))!.progress).toMatchObject({ status: 'won', stars: 1 });
        expect(game.tap(gridPos(0, 1))).toBeNull();
    });

    it('loses when moves run out', () => {
        const game = gameOn(['RRB', 'GBG'], { targetScore: 1000, moves: 1 });

        const progress = game.tap(gridPos(0, 1))!.progress;

        expect(progress).toMatchObject({ status: 'lost', loseReason: 'outOfMoves', stars: 0 });
    });

    it('shuffles a dead board automatically', () => {
        // Burning the top GG pair refills it with R and G, which leaves no pair anywhere.
        const random = new ScriptedRandom([0, 0.3]);
        const game = gameOn(['GGBY', 'BYRG', 'RGBY'], { colorCount: 4 }, random);

        const result = game.tap(gridPos(0, 2));

        expect(stepTypes(result)).toContain('shuffle');
        expect(new GroupRules(2).hasMove(game.currentBoard)).toBe(true);
        expect(game.shufflesLeft).toBe(2);
    });

    it('loses with no moves once shuffles are used up', () => {
        const random = new ScriptedRandom([0, 0.3]);
        const game = gameOn(['GGBY', 'BYRG', 'RGBY'], { colorCount: 4, maxShuffles: 0 }, random);

        const progress = game.tap(gridPos(0, 2))!.progress;

        expect(progress.status).toBe('lost');
        expect(progress.loseReason).toBe('noMoves');
    });
});

describe('createBlastGame', () => {
    const config = testConfig({ cols: 9, rows: 9, colorCount: 5 });

    it('always starts on a full board with at least one move', () => {
        for (let seed = 0; seed < 100; seed++) {
            const game = createBlastGame(config, new SeededRandom(seed));
            expect(game.currentBoard.positions().every((p) => game.currentBoard.tileAt(p) !== null)).toBe(true);
            expect(new GroupRules(2).hasMove(game.currentBoard)).toBe(true);
        }
    });

    it('is deterministic for a given seed', () => {
        const a = createBlastGame(config, new SeededRandom(42));
        const b = createBlastGame(config, new SeededRandom(42));
        expect(boardToText(a.currentBoard)).toEqual(boardToText(b.currentBoard));
    });
});

describe('BlastGame: hints', () => {
    const earnsRowAt = (minGroupSize: number) => ({ superTiles: [{ minGroupSize, kinds: [SuperKinds.Row] }] });

    it('hints the biggest group', () => {
        const game = gameOn([
            'RRGB', //
            'YGGB',
            'YGBY',
        ]);

        const hint = game.hint();

        expect(hint).toHaveLength(4);
        expect(hint).toEqual(expect.arrayContaining([gridPos(2, 2), gridPos(1, 1), gridPos(2, 1), gridPos(1, 0)]));
    });

    it('hints a group that earns a super tile before firing one', () => {
        const game = gameOn(['RRRB', 'YG*Y'], earnsRowAt(3));

        expect(game.hint()).toEqual(expect.arrayContaining([gridPos(0, 1), gridPos(1, 1), gridPos(2, 1)]));
        expect(game.hint()).toHaveLength(3);
    });

    it('hints a super tile before a group too small to earn one', () => {
        const game = gameOn(['RRRB', 'YG*Y'], earnsRowAt(4));

        expect(game.hint()).toEqual([gridPos(2, 0)]);
    });

    it('hints nothing once the level is over', () => {
        const game = gameOn(['RRB', 'GBG'], { targetScore: 30 });
        game.tap(gridPos(0, 1));

        expect(game.hint()).toEqual([]);
    });
});

describe('BlastGame: previews', () => {
    it('previews the group a tap would burn, and nothing for a lonely tile or a cell off the board', () => {
        const game = gameOn(['RRB', 'G-Y']);

        expect(game.tapPreview(gridPos(1, 1))).toEqual(expect.arrayContaining([gridPos(0, 1), gridPos(1, 1)]));
        expect(game.tapPreview(gridPos(2, 1))).toEqual([]);
        expect(game.tapPreview(gridPos(5, 5))).toEqual([]);
    });

    it('previews the whole area of a super tile, as aiming the bomb booster does', () => {
        const game = gameOn(['RRB', 'G-Y']);

        expect(game.tapPreview(gridPos(1, 0))).toEqual([gridPos(0, 0), gridPos(1, 0), gridPos(2, 0)]);
    });

    it('previews exactly the cells where a tap is legal', () => {
        const rules = new GroupRules(2);
        const layout = ['-....', '..*..', '.....', '...|.', '#....'];
        for (let seed = 0; seed < 30; seed++) {
            const game = createBlastGame(
                testConfig({ cols: 5, rows: 5 }),
                new SeededRandom(seed),
                boardFromText(layout),
            );
            for (const p of game.currentBoard.positions()) {
                expect(game.tapPreview(p).length > 0).toBe(rules.canTap(game.currentBoard, p));
            }
        }
    });

    it('previews the square of the bomb, clipped by the board edge', () => {
        const game = gameOn(['GBY', 'YGB', 'BYG']);

        expect(game.boosterPreview(BoosterIds.Bomb, [], gridPos(1, 1))).toHaveLength(9);
        expect(game.boosterPreview(BoosterIds.Bomb, [], gridPos(0, 0))).toEqual(
            expect.arrayContaining([gridPos(0, 0), gridPos(1, 0), gridPos(0, 1), gridPos(1, 1)]),
        );
        expect(game.boosterPreview(BoosterIds.Bomb, [], gridPos(0, 0))).toHaveLength(4);
        expect(game.boosterPreview(BoosterIds.Bomb, [], gridPos(3, 0))).toEqual([]);
    });

    it('previews the one tile a teleport would pick', () => {
        const game = gameOn(['RG', 'GB']);

        expect(game.boosterPreview(BoosterIds.Teleport, [], gridPos(0, 1))).toEqual([gridPos(0, 1)]);
        expect(game.boosterPreview(BoosterIds.Teleport, [], gridPos(2, 1))).toEqual([]);
    });

    it('previews nothing for a second teleport pick the swap would refuse', () => {
        const game = gameOn(['RGG', 'GBR']);
        const green = gridPos(0, 0);

        expect(game.boosterPreview(BoosterIds.Teleport, [green], gridPos(1, 1))).toEqual([]);
        expect(game.boosterPreview(BoosterIds.Teleport, [green], gridPos(0, 1))).toEqual([gridPos(0, 1)]);
    });

    it('badges the groups that would earn a super tile, and none once the level is over', () => {
        const game = gameOn(['RRRRRRB', 'GBGBGBG'], {
            targetScore: 60,
            superTiles: [{ minGroupSize: 6, kinds: [SuperKinds.Bomb] }],
        });

        expect(game.rewards()).toEqual([{ cells: expect.arrayContaining([gridPos(0, 1)]), kinds: [SuperKinds.Bomb] }]);
        game.tap(gridPos(0, 1));
        expect(game.rewards()).toEqual([]);
    });

    it('previews nothing once the level is over', () => {
        const game = gameOn(['RRB', 'GBG'], { targetScore: 30 });
        game.tap(gridPos(0, 1));

        expect(game.tapPreview(gridPos(0, 1))).toEqual([]);
        expect(game.boosterPreview(BoosterIds.Bomb, [], gridPos(1, 1))).toEqual([]);
    });
});
