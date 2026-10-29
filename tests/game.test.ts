import { ActivateSuperAction } from '../assets/scripts/core/actions/ActivateSuperAction';
import { AreaBurnAction } from '../assets/scripts/core/actions/AreaBurnAction';
import { PlayerAction } from '../assets/scripts/core/actions/PlayerAction';
import { SwapAction } from '../assets/scripts/core/actions/SwapAction';
import { gridPos } from '../assets/scripts/core/board/GridPos';
import { BurnResolver } from '../assets/scripts/core/burn/BurnResolver';
import { RadiusArea } from '../assets/scripts/core/burn/RadiusArea';
import { SuperTileCatalog } from '../assets/scripts/core/burn/SuperTileCatalog';
import { LevelConfig } from '../assets/scripts/core/config/LevelConfig';
import { createBlastGame } from '../assets/scripts/core/game/BlastGameFactory';
import { TurnResult } from '../assets/scripts/core/game/BlastGame';
import { TurnStep } from '../assets/scripts/core/game/TurnStep';
import { SeededRandom } from '../assets/scripts/core/random/SeededRandom';
import { GroupRules } from '../assets/scripts/core/rules/GroupRules';
import { boardFromText, boardToText } from './helpers/boardText';
import { alwaysRed, ScriptedRandom, testConfig } from './helpers/fixtures';

const stepTypes = (result: TurnResult | null) => result!.steps.map((s: TurnStep) => s.type);

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

    it('ignores a lonely tile and does not spend a move', () => {
        const game = gameOn(['RG', 'GR', 'BB']);

        expect(game.tap(gridPos(0, 2))).toBeNull();
        expect(game.progressSnapshot.movesLeft).toBe(10);
    });

    it('turns a big group into a super tile at the tapped cell', () => {
        const game = gameOn(['RRRG', 'BGBY'], { superTiles: [{ minGroupSize: 3, kinds: ['column'] }] });

        const result = game.tap(gridPos(1, 1));

        expect(stepTypes(result)).toEqual(['burn', 'superCreated', 'refill']);
        expect(game.currentBoard.tileAt(gridPos(1, 1))!.superKind).toBe('column');
    });

    it('fires a super tile on tap and spends a move', () => {
        const game = gameOn(['GBYG', 'Y-BY', 'BGRB']);

        const result = game.tap(gridPos(1, 1));

        expect(result!.scoreGained).toBe(40);
        expect(result!.progress.movesLeft).toBe(9);
    });
});

describe('BlastGame: boosters', () => {
    it('bomb spends a charge but not a move', () => {
        const game = gameOn(['GBY', 'YGB', 'BYG'], { bombCharges: 1 });

        const result = game.useBooster('bomb', [gridPos(1, 1)]);

        expect(result!.scoreGained).toBe(90);
        expect(result!.progress.movesLeft).toBe(10);
        expect(game.boosterCharges('bomb')).toBe(0);
        expect(game.useBooster('bomb', [gridPos(1, 1)])).toBeNull();
    });

    it('teleport swaps two tiles and does not burn anything', () => {
        const game = gameOn(['RG', 'GG']);

        const result = game.useBooster('teleport', [gridPos(0, 1), gridPos(1, 0)]);

        expect(stepTypes(result)).toEqual(['swap']);
        expect(boardToText(game.currentBoard)).toEqual(['GG', 'GR']);
        expect(game.boosterCharges('teleport')).toBe(1);
    });

    it('rejects a teleport onto the same cell and keeps the charge', () => {
        const game = gameOn(['RG', 'GG']);

        expect(game.useBooster('teleport', [gridPos(0, 0), gridPos(0, 0)])).toBeNull();
        expect(game.boosterCharges('teleport')).toBe(2);
    });

    it('rejects a teleport between tiles that look the same and keeps the charge', () => {
        const game = gameOn([
            'R|', //
            'GR',
            '|G',
        ]);

        expect(game.useBooster('teleport', [gridPos(0, 2), gridPos(1, 1)])).toBeNull();
        expect(game.useBooster('teleport', [gridPos(1, 2), gridPos(0, 0)])).toBeNull();
        expect(boardToText(game.currentBoard)).toEqual(['R|', 'GR', '|G']);
        expect(game.boosterCharges('teleport')).toBe(2);
    });

    it('teleports a super tile onto a regular one', () => {
        const game = gameOn(['R|', 'GB']);

        expect(game.useBooster('teleport', [gridPos(1, 1), gridPos(0, 0)])).not.toBeNull();
        expect(boardToText(game.currentBoard)).toEqual(['RG', '|B']);
    });
});

describe('PlayerAction', () => {
    it('throws from apply() when canApply() is false and leaves the board alone', () => {
        const burner = new BurnResolver(new SuperTileCatalog());
        const board = boardFromText(['RR', 'GB']);
        const refused: PlayerAction[] = [
            new SwapAction(gridPos(0, 1), gridPos(1, 1)),
            new AreaBurnAction(gridPos(2, 0), new RadiusArea(1), burner),
            new ActivateSuperAction(gridPos(0, 0), burner),
        ];

        for (const action of refused) {
            expect(action.canApply(board)).toBe(false);
            expect(() => action.apply(board)).toThrow();
        }
        expect(boardToText(board)).toEqual(['RR', 'GB']);
    });
});

describe('BlastGame: win and lose', () => {
    it('wins when the target is reached, even on the last move', () => {
        const game = gameOn(['RRB', 'GBG'], { targetScore: 30, moves: 1 });

        expect(game.tap(gridPos(0, 1))!.progress.status).toBe('won');
        expect(game.tap(gridPos(0, 1))).toBeNull();
    });

    it('loses when moves run out', () => {
        const game = gameOn(['RRB', 'GBG'], { targetScore: 1000, moves: 1 });

        const progress = game.tap(gridPos(0, 1))!.progress;

        expect(progress.status).toBe('lost');
        expect(progress.loseReason).toBe('outOfMoves');
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

    it('rejects a config that references an unknown super tile', () => {
        const broken = testConfig({ superTiles: [{ minGroupSize: 5, kinds: ['rainbow'] }] });
        expect(() => createBlastGame(broken, new SeededRandom(1))).toThrow('unknown super tile "rainbow"');
    });
});
