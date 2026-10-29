/**
 * Balance check: bots play the real model many times and report the score they reach,
 * then play the real level to the end, bonus round included, and report the stars.
 * The target and the star scores are picked from these numbers, not by feel.
 *
 *   npm run simulate -- assets/configs/level1.json 2000
 */
import { readFileSync } from 'fs';
import { ReadonlyBoard } from '../assets/scripts/core/board/Board';
import { findColorGroup } from '../assets/scripts/core/board/ColorGroup';
import { GridPos } from '../assets/scripts/core/board/GridPos';
import { parseLevelConfig } from '../assets/scripts/core/config/parseLevelConfig';
import { LevelConfig } from '../assets/scripts/core/config/LevelConfig';
import { createBlastGame } from '../assets/scripts/core/game/BlastGameFactory';
import { Random, randomItem } from '../assets/scripts/core/random/Random';
import { SeededRandom } from '../assets/scripts/core/random/SeededRandom';
import { GroupRules } from '../assets/scripts/core/rules/GroupRules';

type Strategy = (board: ReadonlyBoard, pick: Random) => GridPos;

// Above any group a board of at most 20x20 can hold, so the greedy bot fires a super tile first.
const SUPER_FIRST = 1000;

const legalTaps = (board: ReadonlyBoard, rules: GroupRules) => board.positions().filter((p) => rules.canTap(board, p));

const strategies: { [name: string]: (rules: GroupRules) => Strategy } = {
    random: (rules) => (board, pick) => randomItem(pick, legalTaps(board, rules)),
    greedy: (rules) => (board) => {
        const options = legalTaps(board, rules);
        const size = (p: GridPos) => (board.tileAt(p)!.isSuper ? SUPER_FIRST : findColorGroup(board, p).length);
        return options.reduce((best, p) => (size(p) > size(best) ? p : best), options[0]);
    },
};

function playOnce(config: LevelConfig, seed: number, strategy: Strategy) {
    const game = createBlastGame(config, new SeededRandom(seed));
    const pick = new SeededRandom(seed * 7919);
    while (game.progressSnapshot.status === 'playing') {
        game.tap(strategy(game.currentBoard, pick));
    }
    while (game.playFinale() !== null) {
        // Saved super tiles go off first, then every move left becomes a bonus rocket.
    }
    return game.progressSnapshot;
}

const share = (count: number, runs: number) => `${((count / runs) * 100).toFixed(0)}%`;

function percentile(sorted: number[], p: number): number {
    return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];
}

const [configPath = 'assets/configs/level1.json', runsArg = '1000'] = process.argv.slice(2);
const config = parseLevelConfig(JSON.parse(readFileSync(configPath, 'utf8')));
const runs = Number(runsArg);
const rules = new GroupRules(config.minGroupSize);
// Bots never stop early, so the target is lifted out of reach to see the full score distribution.
const open = { ...config, targetScore: Number.MAX_SAFE_INTEGER };

console.log(`${configPath}: ${config.cols}x${config.rows}, ${config.colorCount} colors, ${config.moves} moves`);
for (const name of Object.keys(strategies)) {
    const scores: number[] = [];
    const starCounts = [0, 0, 0, 0];
    let stuck = 0;
    for (let seed = 1; seed <= runs; seed++) {
        const result = playOnce(open, seed, strategies[name](rules));
        scores.push(result.score);
        if (result.loseReason === 'noMoves') {
            stuck++;
        }
        starCounts[playOnce(config, seed, strategies[name](rules)).stars]++;
    }
    scores.sort((a, b) => a - b);
    const winRate = scores.filter((s) => s >= config.targetScore).length / runs;
    console.log(
        `${name.padEnd(7)} p10 ${percentile(scores, 0.1)}  p50 ${percentile(scores, 0.5)}  p90 ${percentile(scores, 0.9)}` +
            `  wins at target ${config.targetScore}: ${(winRate * 100).toFixed(0)}%  stuck: ${stuck}`,
    );
    const atLeast = (stars: number) => starCounts.slice(stars).reduce((sum, count) => sum + count, 0);
    console.log(
        `${''.padEnd(7)} with the bonus round: 1+ star ${share(atLeast(1), runs)}  2+ stars ${share(atLeast(2), runs)}` +
            `  3 stars ${share(atLeast(3), runs)}`,
    );
}
