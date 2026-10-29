import { SeededRandom } from '../assets/scripts/core/random/SeededRandom';
import { Feel } from '../assets/scripts/view/animation/Feel';
import { Timings } from '../assets/scripts/view/animation/Timings';
import { BoardLayout, Point } from '../assets/scripts/view/BoardLayout';
import { FxKind } from '../assets/scripts/view/fx/FxArt';
import { FxEmitters } from '../assets/scripts/view/fx/FxEmitters';
import { FxFeel } from '../assets/scripts/view/fx/FxFeel';
import { praiseLayout } from '../assets/scripts/view/fx/FloatingTextLayout';
import { ParticleSprite, ParticleSprites, ParticleSystem } from '../assets/scripts/view/fx/ParticleSystem';
import { RocketFlight } from '../assets/scripts/view/fx/RocketFlight';

const FRAME = 1 / 60;
const layout = new BoardLayout(9, 10, 100, 100);

interface Cell {
    readonly col: number;
    readonly row: number;
}

interface Burst {
    readonly cell: Cell;
    readonly delay: number;
}

/** A blast look on the timeline: what it fires when it starts and when each of its tiles pops. */
interface Wave {
    readonly start: (fx: FxEmitters, flights: RocketFlight[]) => void;
    readonly bursts: ReadonlyArray<Burst>;
    readonly strength: number;
}

class CountingSprite implements ParticleSprite {
    constructor(readonly kind: FxKind) {}

    place(): void {}
}

/** Prewarmed like FxSpritePool, counting the sprites it has to make on top. */
class CountingSprites implements ParticleSprites<CountingSprite> {
    created = 0;
    private readonly idle: { [kind: string]: CountingSprite[] } = {};

    constructor(prewarm: { readonly [kind: string]: number }) {
        Object.keys(prewarm).forEach((kind) => {
            this.idle[kind] = [];
            for (let i = 0; i < prewarm[kind]; i++) {
                this.idle[kind].push(new CountingSprite(kind as FxKind));
            }
        });
    }

    acquire(kind: FxKind): CountingSprite {
        const idle = this.idle[kind] || (this.idle[kind] = []);
        let sprite = idle.pop();
        if (sprite === undefined) {
            this.created++;
            sprite = new CountingSprite(kind);
        }
        return sprite;
    }

    release(sprite: CountingSprite): void {
        this.idle[sprite.kind].push(sprite);
    }
}

function allCells(): Cell[] {
    const cells: Cell[] = [];
    for (let col = 0; col < layout.cols; col++) {
        for (let row = 0; row < layout.rows; row++) {
            cells.push({ col, row });
        }
    }
    return cells;
}

function distance(a: Cell, b: Cell): number {
    return layout.distance(a, b);
}

function center(cell: Cell): Point {
    return layout.cellCenter(cell.col, cell.row);
}

function field(origin: Cell): Wave {
    const cells = allCells();
    return {
        start: (fx) => {
            const praise = praiseLayout(null, layout.width, layout.height);
            fx.praise(praise.x, praise.y, praise.width);
        },
        bursts: cells.map((cell) => ({ cell, delay: distance(origin, cell) * Timings.fieldRipplePerCell })),
        strength: Feel.fieldBurst,
    };
}

function bomb(origin: Cell, radius: number): Wave {
    const ring = (cell: Cell) => Math.max(Math.abs(cell.col - origin.col), Math.abs(cell.row - origin.row));
    const cells = allCells().filter((cell) => ring(cell) <= radius);
    const rings = cells.reduce((most, cell) => Math.max(most, ring(cell)), 0);
    return {
        start: (fx) => {
            const at = center(origin);
            fx.shockwave(at.x, at.y, (rings + 0.5) * layout.stepY);
        },
        bursts: cells.map((cell) => ({ cell, delay: ring(cell) * Timings.bombRing })),
        strength: Feel.hitBurst,
    };
}

function rocket(origin: Cell, axis: 'row' | 'column'): Wave {
    const cells = allCells().filter((cell) => (axis === 'row' ? cell.row === origin.row : cell.col === origin.col));
    const from = center(origin);
    const cellsTo = (cell: Cell) =>
        axis === 'row' ? Math.abs(cell.col - origin.col) : Math.abs(cell.row - origin.row);
    return {
        start: (_fx, flights) => {
            [-1, 1].forEach((direction) => {
                const to =
                    axis === 'row'
                        ? { x: (direction * layout.width) / 2, y: from.y }
                        : { x: from.x, y: (direction * layout.height) / 2 };
                const cellsAway = Math.abs(axis === 'row' ? to.x - from.x : to.y - from.y) / layout.stepX;
                flights.push(new RocketFlight(from, to, cellsAway * Timings.rocketPerCell));
            });
        },
        bursts: cells.map((cell) => ({ cell, delay: cellsTo(cell) * Timings.rocketPerCell })),
        strength: Feel.hitBurst,
    };
}

interface Outcome {
    readonly tiles: number;
    /** Particles each burst emitted, in pop order. */
    readonly perBurst: number[];
    readonly created: number;
}

/**
 * Plays the waves one after another, as BurnAnimator does, and runs the system until every particle is gone.
 * A tile burns once: a later wave leaves out the cells an earlier one took.
 */
function play(waves: Wave[]): Outcome {
    const sprites = new CountingSprites(FxFeel.prewarm);
    const system = new ParticleSystem(sprites, FxFeel.maxParticles);
    const fx = new FxEmitters(system, new SeededRandom(11), FxFeel.palette.tiles);
    const events: Array<{ at: number; fire: () => void }> = [];
    const flights: RocketFlight[] = [];
    const trailPoints: number[] = [];
    const perBurst: number[] = [];

    const burned: { [cell: string]: boolean } = {};
    let waveStart = 0;
    let tiles = 0;
    waves.forEach((wave) => {
        const startAt = waveStart;
        const bursts = wave.bursts.filter((burst) => !burned[burst.cell.col + ',' + burst.cell.row]);
        bursts.forEach((burst) => {
            burned[burst.cell.col + ',' + burst.cell.row] = true;
        });
        tiles += bursts.length;
        events.push({ at: startAt, fire: () => wave.start(fx, flights) });
        bursts.forEach((burst) => {
            events.push({
                at: startAt + burst.delay + Timings.hitSwell,
                fire: () => {
                    const before = system.count;
                    const at = center(burst.cell);
                    fx.burst(at.x, at.y, (burst.cell.col + burst.cell.row) % 5, wave.strength, bursts.length);
                    perBurst.push(system.count - before);
                },
            });
        });
        const lastPop = bursts.reduce((most, burst) => Math.max(most, burst.delay), 0);
        waveStart = startAt + lastPop + Timings.hitSwell + Timings.hitPop + Timings.waveGap;
    });
    events.sort((a, b) => a.at - b.at);

    let time = 0;
    let next = 0;
    while (next < events.length || system.count > 0 || flights.length > 0) {
        system.step(FRAME);
        for (let i = flights.length - 1; i >= 0; i--) {
            const flight = flights[i];
            flight.advance(FRAME);
            while (flight.nextTrailPoint(FxFeel.rocket.trailSpacing)) {
                trailPoints[i] = (trailPoints[i] || 0) + 1;
                fx.rocketTrail(flight.trailX, flight.trailY, flight.angle, trailPoints[i]);
            }
            if (flight.arrived) {
                flights.splice(i, 1);
                trailPoints.splice(i, 1);
            }
        }
        while (next < events.length && events[next].at <= time + 1e-9) {
            events[next++].fire();
        }
        time += FRAME;
    }
    return { tiles, perBurst, created: sprites.created };
}

/**
 * The biggest chains of the level replayed on the real particle system at 60 fps, on the schedules the blast looks
 * use: every tile pops after its delay plus Timings.hitSwell, and a chained wave starts after the previous one ends.
 */
const SCENARIOS: Array<[string, Wave[]]> = [
    ['field from the middle', [field({ col: 4, row: 5 })]],
    ['field from a corner', [field({ col: 0, row: 0 })]],
    ['super bomb', [bomb({ col: 4, row: 5 }, 2)]],
    ['row rocket', [rocket({ col: 4, row: 5 }, 'row')]],
    ['row rocket into a super bomb', [rocket({ col: 4, row: 5 }, 'row'), bomb({ col: 7, row: 5 }, 2)]],
    ['column rocket into a field', [rocket({ col: 4, row: 2 }, 'column'), field({ col: 4, row: 7 })]],
    ['bomb into a bomb', [bomb({ col: 2, row: 2 }, 2), bomb({ col: 4, row: 4 }, 2)]],
    ['bomb into a field', [bomb({ col: 4, row: 5 }, 2), field({ col: 6, row: 5 })]],
    [
        'row rocket into a bomb into a bomb',
        [rocket({ col: 4, row: 5 }, 'row'), bomb({ col: 7, row: 5 }, 2), bomb({ col: 7, row: 2 }, 2)],
    ],
];

describe('effects in the biggest chains', () => {
    SCENARIOS.forEach(([name, waves]) => {
        describe(name, () => {
            let outcome: Outcome;

            beforeAll(() => {
                outcome = play(waves);
            });

            it('gives every popped tile at least a glow and a shard', () => {
                expect(outcome.perBurst).toHaveLength(outcome.tiles);
                expect(Math.min(...outcome.perBurst)).toBeGreaterThanOrEqual(2);
            });

            it('makes no sprite beyond the prewarmed ones', () => {
                expect(outcome.created).toBe(0);
            });
        });
    });
});
