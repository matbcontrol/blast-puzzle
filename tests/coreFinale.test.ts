import { FinaleActionFactory } from '../assets/scripts/core/actions/FinaleActionFactory';
import { gridPos } from '../assets/scripts/core/board/GridPos';
import { LevelConfig } from '../assets/scripts/core/config/LevelConfig';
import { BlastGame, TurnResult } from '../assets/scripts/core/game/BlastGame';
import { createBlastGame } from '../assets/scripts/core/game/BlastGameFactory';
import { BonusSuperStep } from '../assets/scripts/core/game/TurnStep';
import { SeededRandom } from '../assets/scripts/core/random/SeededRandom';
import { SuperKinds } from '../assets/scripts/core/tiles/SuperKinds';
import { TileFactory } from '../assets/scripts/core/tiles/TileFactory';
import { boardFromText } from './helpers/boardText';
import { alwaysRed, testConfig, testResolver } from './helpers/fixtures';
import { firstBurn, stepTypes } from './helpers/steps';

/** Won on the first tap (30 points) with two moves to spare. */
function wonGame(overrides: Partial<LevelConfig> = {}): BlastGame {
    const config = testConfig({ cols: 3, rows: 2, targetScore: 30, starScores: [100, 200], moves: 3, ...overrides });
    const game = createBlastGame(config, alwaysRed(), boardFromText(['RRB', 'GBG']));
    game.tap(gridPos(0, 1));
    return game;
}

function bonusOf(result: TurnResult): BonusSuperStep {
    const step = result.steps[0];
    if (step.type !== 'bonusSuper') {
        throw new Error(`Expected a bonus super tile first, got "${step.type}"`);
    }
    return step;
}

function playWholeFinale(game: BlastGame): TurnResult[] {
    const results: TurnResult[] = [];
    for (let result = game.playFinale(); result !== null; result = game.playFinale()) {
        results.push(result);
    }
    return results;
}

describe('BlastGame: finale', () => {
    it('turns a move left into a row or column super tile that fires at once', () => {
        const game = wonGame();
        const scoreBefore = game.progressSnapshot.score;

        const result = game.playFinale()!;
        const bonus = bonusOf(result);
        const burn = firstBurn(result);

        expect(stepTypes(result)).toEqual(['bonusSuper', 'burn', 'fall', 'refill']);
        expect(bonus.replaced.isSuper).toBe(false);
        expect([SuperKinds.Row, SuperKinds.Column]).toContain(bonus.tile.superKind);
        expect(burn.cause === 'blast' && burn.waves[0]).toMatchObject({
            origin: bonus.at,
            blast: bonus.tile.superKind,
        });
        expect(burn.cause === 'blast' && burn.waves[0].tiles.map((burned) => burned.tile.id)).toContain(bonus.tile.id);
        expect(result.scoreGained).toBe(burn.points);
        expect(result.progress).toMatchObject({ status: 'won', movesLeft: 1, score: scoreBefore + burn.points });
    });

    it('spends one move per call and stops when none is left', () => {
        const game = wonGame();

        expect(playWholeFinale(game)).toHaveLength(2);
        expect(game.progressSnapshot).toMatchObject({ status: 'won', movesLeft: 0 });
        expect(game.playFinale()).toBeNull();
    });

    it('can earn the stars the winning move did not', () => {
        const game = wonGame({ starScores: [50, 80] });
        expect(game.progressSnapshot.stars).toBe(1);

        playWholeFinale(game);

        expect(game.progressSnapshot.stars).toBe(3);
    });

    it('does nothing while the level is still being played or after a loss', () => {
        const playing = createBlastGame(testConfig({ cols: 3, rows: 2 }), alwaysRed(), boardFromText(['RRB', 'GBG']));
        expect(playing.playFinale()).toBeNull();
        expect(playing.progressSnapshot.movesLeft).toBe(10);

        const lost = createBlastGame(
            testConfig({ cols: 3, rows: 2, moves: 1 }),
            alwaysRed(),
            boardFromText(['RRB', 'GBG']),
        );
        lost.tap(gridPos(0, 1));
        expect(lost.progressSnapshot.status).toBe('lost');
        expect(lost.playFinale()).toBeNull();
    });

    it('plays the same finale for the same seed', () => {
        const finaleOf = (seed: number): TurnResult[] => {
            const config = testConfig({ cols: 6, rows: 6, targetScore: 40, starScores: [400, 800], moves: 8 });
            const game = createBlastGame(config, new SeededRandom(seed));
            while (game.progressSnapshot.status === 'playing') {
                const board = game.currentBoard;
                game.tap(board.positions().filter((p) => game.tapPreview(p).length > 0)[0]);
            }
            return playWholeFinale(game);
        };

        const first = finaleOf(5);

        expect(first.length).toBeGreaterThan(0);
        expect(JSON.stringify(finaleOf(5))).toBe(JSON.stringify(first));
        expect(JSON.stringify(finaleOf(6))).not.toBe(JSON.stringify(first));
    });

    it('has nothing to turn on a board of super tiles only', () => {
        const finale = new FinaleActionFactory(
            alwaysRed(),
            [SuperKinds.Row],
            new TileFactory(alwaysRed(), 5),
            testResolver(),
        );

        expect(finale.create(boardFromText(['-|', '*#']))).toBeNull();
    });
});
