import { SuperTileRule } from '../tiles/SuperTilePicker';
import { LevelConfig } from './LevelConfig';

type Json = { [key: string]: unknown };

class FieldReader {
    constructor(
        private readonly source: Json,
        private readonly errors: string[],
        private readonly path: string,
    ) {}

    int(name: string, min: number, max: number = Number.MAX_SAFE_INTEGER): number {
        const value = this.source[name];
        if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max) {
            this.errors.push(
                `${this.path}${name}: expected an integer in [${min}, ${max}], got ${JSON.stringify(value)}`,
            );
            return min;
        }
        return value;
    }

    stringList(name: string): string[] {
        const value = this.source[name];
        if (!Array.isArray(value) || value.length === 0 || value.some((item) => typeof item !== 'string')) {
            this.errors.push(`${this.path}${name}: expected a non-empty list of strings`);
            return [];
        }
        return value as string[];
    }

    list(name: string): Json[] {
        const value = this.source[name];
        if (!Array.isArray(value) || value.some((item) => !isObject(item))) {
            this.errors.push(`${this.path}${name}: expected a list of objects`);
            return [];
        }
        return value as Json[];
    }

    optionalInt(name: string): number | null {
        return this.source[name] === null || this.source[name] === undefined ? null : this.int(name, 0);
    }
}

function isObject(value: unknown): value is Json {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Validates raw JSON and reports every problem at once, so a designer fixes the file in one pass. */
export function parseLevelConfig(raw: unknown): LevelConfig {
    if (!isObject(raw)) {
        throw new Error('Level config must be a JSON object');
    }
    const errors: string[] = [];
    const read = new FieldReader(raw, errors, '');

    const cols = read.int('cols', 1, 20);
    const rows = read.int('rows', 1, 20);
    const colorCount = read.int('colorCount', 1, 8);
    const minGroupSize = read.int('minGroupSize', 2);
    const superTiles: SuperTileRule[] = read.list('superTiles').map((rule, i) => {
        const ruleReader = new FieldReader(rule, errors, `superTiles[${i}].`);
        return { minGroupSize: ruleReader.int('minGroupSize', minGroupSize), kinds: ruleReader.stringList('kinds') };
    });

    const config: LevelConfig = {
        cols,
        rows,
        colorCount,
        minGroupSize,
        targetScore: read.int('targetScore', 1),
        moves: read.int('moves', 1),
        pointsPerTile: read.int('pointsPerTile', 1),
        maxShuffles: read.int('maxShuffles', 0),
        bombCharges: read.int('bombCharges', 0),
        bombRadius: read.int('bombRadius', 0),
        teleportCharges: read.int('teleportCharges', 0),
        superBombRadius: read.int('superBombRadius', 0),
        superTiles,
        seed: read.optionalInt('seed'),
    };

    if (Math.max(cols, rows) < minGroupSize) {
        errors.push(`a group of ${minGroupSize} does not fit a ${cols}x${rows} board`);
    }
    // Pigeonhole: with this many cells some color always has a full group, so a shuffle can always plant one.
    if (cols * rows < colorCount * (minGroupSize - 1) + 1) {
        errors.push(`${cols}x${rows} board is too small for colorCount ${colorCount} and minGroupSize ${minGroupSize}`);
    }

    if (errors.length > 0) {
        throw new Error('Invalid level config:\n' + errors.join('\n'));
    }
    return config;
}
