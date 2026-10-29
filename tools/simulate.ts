/**
 * Balance check: bots play the real model many times and report the score they reach.
 * The level target is picked from these numbers, not by feel.
 *
 *   npm run simulate -- assets/configs/level1.json 2000
 */
import { readFileSync } from 'fs';
import { ReadonlyBoard } from '../assets/scripts/core/board/Board';
import { findColorGroup } from '../assets/scripts/core/board/ColorGroup';
import { GridPos } from '../assets/scripts/core/board/GridPos';
import { parseLevelConfig } from '../assets/scripts/core/config/parseLevelConfig';
import { LevelConfig } from '../assets/scripts/core/config/LevelConfig';
import { BlastGame } from '../assets/scripts/core/game/BlastGame';
import { createBlastGame } from '../assets/scripts/core/game/BlastGameFactory';
import { randomItem } from '../assets/scripts/core/random/Random';
import { SeededRandom } from '../assets/scripts/core/random/SeededRandom';

type Strategy = (board: ReadonlyBoard, game: BlastGame, pick: SeededRandom) => GridPos;

const playable = (board: ReadonlyBoard, min: number) =>
    board.positions().filter((p) => {
        const tile = board.tileAt(p);
        return tile !== null && (tile.isSuper || findColorGroup(board, p).length >= min);
    });

const strategies: { [name: string]: (config: LevelConfig) => Strategy } = {
    random: (config) => (board, _game, pick) => randomItem(pick, playable(board, config.minGroupSize)),
    greedy: (config) => (board) => {
        const options = playable(board, config.minGroupSize);
        const size = (p: GridPos) => (board.tileAt(p)!.isSuper ? 1000 : findColorGroup(board, p).length);
        return options.reduce((best, p) => (size(p) > size(best) ? p : best), options[0]);
    },
};

function playOnce(config: LevelConfig, seed: number, strategy: Strategy) {
    const game = createBlastGame(config, new SeededRandom(seed));
    const pick = new SeededRandom(seed * 7919);
    while (game.progressSnapshot.status === 'playing') {
        game.tap(strategy(game.currentBoard, game, pick));
    }
    return game.progressSnapshot;
}

function percentile(sorted: number[], p: number): number {
    return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];
}

const [configPath = 'assets/configs/level1.json', runsArg = '1000'] = process.argv.slice(2);
const config = parseLevelConfig(JSON.parse(readFileSync(configPath, 'utf8')));
const runs = Number(runsArg);
// Bots never stop early, so the target is lifted out of reach to see the full score distribution.
const open = { ...config, targetScore: Number.MAX_SAFE_INTEGER };

console.log(`${configPath}: ${config.cols}x${config.rows}, ${config.colors} colors, ${config.moves} moves`);
for (const name of Object.keys(strategies)) {
    const scores: number[] = [];
    let stuck = 0;
    for (let seed = 1; seed <= runs; seed++) {
        const result = playOnce(open, seed, strategies[name](config));
        scores.push(result.score);
        if (result.loseReason === 'noMoves') {
            stuck++;
        }
    }
    scores.sort((a, b) => a - b);
    const winRate = scores.filter((s) => s >= config.targetScore).length / runs;
    console.log(
        `${name.padEnd(7)} p10 ${percentile(scores, 0.1)}  p50 ${percentile(scores, 0.5)}  p90 ${percentile(scores, 0.9)}` +
            `  wins at target ${config.targetScore}: ${(winRate * 100).toFixed(0)}%  stuck: ${stuck}`,
    );
}
