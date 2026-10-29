import { SeededRandom } from '../assets/scripts/core/random/SeededRandom';
import { ConfettiBurst, ConfettiFeel } from '../assets/scripts/view/fx/ConfettiBurst';
import { RING_RADIUS } from '../assets/scripts/view/fx/FxArt';
import { FxEmitters } from '../assets/scripts/view/fx/FxEmitters';
import { FxFeel } from '../assets/scripts/view/fx/FxFeel';
import { ParticleEmitter, ParticleSpec } from '../assets/scripts/view/fx/ParticleSystem';

/** Records what was emitted. room limits how many fit, load is what emitters see of the fill level. */
class RecordingEmitter implements ParticleEmitter {
    readonly capacity = FxFeel.maxParticles;
    readonly specs: ParticleSpec[] = [];

    constructor(
        private readonly room = Infinity,
        readonly load = 0,
    ) {}

    emit(spec: ParticleSpec): boolean {
        if (this.specs.length >= this.room) {
            return false;
        }
        this.specs.push(Object.assign({}, spec));
        return true;
    }

    ofKind(kind: string): ParticleSpec[] {
        return this.specs.filter((s) => s.kind === kind);
    }
}

const TILE_TINTS = [0x0000ff, 0x00ff00, 0xff00ff, 0xff0000, 0xffff00];

function emitters(sink: RecordingEmitter): FxEmitters {
    return new FxEmitters(sink, new SeededRandom(7), TILE_TINTS);
}

describe('FxEmitters', () => {
    describe('burst', () => {
        it('throws more shards for a stronger burn', () => {
            const weak = new RecordingEmitter();
            const strong = new RecordingEmitter();
            emitters(weak).burst(0, 0, 0, 0, 1);
            emitters(strong).burst(0, 0, 0, 1, 1);
            expect(weak.ofKind('shard')).toHaveLength(FxFeel.burst.shards.min);
            expect(strong.ofKind('shard')).toHaveLength(FxFeel.burst.shards.max);
            expect(strong.ofKind('glow')).toHaveLength(1);
            expect(strong.ofKind('sparkle')).toHaveLength(FxFeel.burst.sparkles.max);
        });

        it('tints shards with the tile color or a lighter shade of it', () => {
            const sink = new RecordingEmitter();
            emitters(sink).burst(0, 0, 3, 1, 1);
            sink.ofKind('shard').forEach((shard) => {
                expect(shard.tint >> 16).toBe(0xff);
            });
            expect(sink.ofKind('shard').some((shard) => shard.tint === 0xff0000)).toBe(true);
        });

        it('gives a super tile the gold tint', () => {
            const sink = new RecordingEmitter();
            emitters(sink).burst(0, 0, null, 1, 1);
            expect(sink.ofKind('shard')[0].tint).toBe(FxFeel.palette.super);
        });

        it('spreads shards all around the burn', () => {
            const sink = new RecordingEmitter();
            emitters(sink).burst(0, 0, 0, 1, 1);
            const shards = sink.ofKind('shard');
            expect(shards.some((s) => s.vx > 0)).toBe(true);
            expect(shards.some((s) => s.vx < 0)).toBe(true);
            expect(shards.some((s) => s.vy < 0)).toBe(true);
        });

        it('splits the wave share evenly between the tiles of a wave, shards before sparkles', () => {
            const sink = new RecordingEmitter();
            const crowd = 25;
            emitters(sink).burst(0, 0, 0, 1, crowd);
            const perTile = Math.floor((FxFeel.maxParticles * FxFeel.burst.waveShare) / crowd);
            expect(sink.specs).toHaveLength(perTile);
            expect(sink.ofKind('glow')).toHaveLength(1);
            expect(sink.ofKind('sparkle')).toHaveLength(0);
        });

        it('still gives each tile of a whole-board wave a glow and a shard', () => {
            const sink = new RecordingEmitter();
            emitters(sink).burst(0, 0, 0, 1, 90);
            expect(sink.ofKind('glow')).toHaveLength(1);
            expect(sink.ofKind('shard')).toHaveLength(1);
        });

        it('does not thin out because the system is busy', () => {
            const busy = new RecordingEmitter(Infinity, 0.9);
            emitters(busy).burst(0, 0, 0, 1, 1);
            expect(busy.ofKind('shard')).toHaveLength(FxFeel.burst.shards.max);
        });

        it('stops at the first dropped particle', () => {
            const sink = new RecordingEmitter(0);
            emitters(sink).burst(0, 0, 0, 1, 1);
            expect(sink.specs).toHaveLength(0);
        });
    });

    it('grows the shockwave ring to the blast radius', () => {
        const sink = new RecordingEmitter();
        emitters(sink).shockwave(10, 20, 250);
        const ring = sink.ofKind('ring')[0];
        expect(ring.x).toBe(10);
        expect(ring.y).toBe(20);
        expect(ring.scaleTo * RING_RADIUS).toBeCloseTo(250);
        expect(ring.scaleFrom).toBeCloseTo(ring.scaleTo * FxFeel.shockwave.startShare);
    });

    it('lays the rocket trail along the flight and throws sparks off to the sides', () => {
        const sink = new RecordingEmitter();
        const fx = emitters(sink);
        for (let i = 0; i < 4; i++) {
            fx.rocketTrail(i * 26, 0, 0, i);
        }
        sink.ofKind('streak').forEach((streak) => expect(streak.angle).toBe(0));
        const sparks = sink.ofKind('sparkle');
        expect(sparks).toHaveLength(4 / FxFeel.rocket.sparkEvery);
        sparks.forEach((spark) => expect(Math.abs(spark.vy)).toBeGreaterThan(Math.abs(spark.vx) * 0.5));
    });

    it('centers the praise glow on the word and scatters sparkles along it', () => {
        const sink = new RecordingEmitter();
        emitters(sink).praise(30, 280, 800);
        const glow = sink.ofKind('glow')[0];
        expect(glow.x).toBe(30);
        expect(glow.y).toBe(280);
        sink.ofKind('sparkle').forEach((sparkle) => {
            expect(Math.abs(sparkle.x - 30)).toBeLessThanOrEqual(400);
            expect(Math.abs(sparkle.y - 280)).toBeLessThanOrEqual(FxFeel.praise.sparkleHeight);
        });
    });
});

describe('ConfettiBurst', () => {
    const WIDTH = 1080;
    const HEIGHT = 2340;

    function fire(width: number, room = Infinity): ParticleSpec[] {
        const sink = new RecordingEmitter(room);
        new ConfettiBurst(sink, new SeededRandom(5)).fire(width, HEIGHT);
        return sink.specs;
    }

    /** Degrees below horizontal, toward the middle of the screen. */
    function dive(piece: ParticleSpec): number {
        return (Math.atan2(-piece.vy, Math.abs(piece.vx)) * 180) / Math.PI;
    }

    it('fans out from both top corners toward the middle', () => {
        const pieces = fire(WIDTH);
        const left = pieces.filter((p) => p.x === -WIDTH / 2 && p.y === HEIGHT / 2);
        const right = pieces.filter((p) => p.x === WIDTH / 2 && p.y === HEIGHT / 2);
        expect(left.length + right.length).toBe(Math.round(ConfettiFeel.count * ConfettiFeel.fanShare));
        expect(Math.abs(left.length - right.length)).toBeLessThanOrEqual(1);
        left.forEach((p) => expect(p.vx).toBeGreaterThan(0));
        right.forEach((p) => expect(p.vx).toBeLessThan(0));
    });

    it('opens each fan from nearly flat to steep', () => {
        const fan = fire(WIDTH).filter((p) => p.y === HEIGHT / 2 && Math.abs(p.x) === WIDTH / 2);
        const angles = fan.map(dive);
        const range = ConfettiFeel.fanAngle;
        angles.forEach((angle) => {
            expect(angle).toBeGreaterThanOrEqual(range.min);
            expect(angle).toBeLessThanOrEqual(range.max);
        });
        expect(Math.max(...angles) - Math.min(...angles)).toBeGreaterThan(0.8 * (range.max - range.min));
    });

    it('throws the fans farther across a wider screen', () => {
        const narrow = fire(WIDTH).filter((p) => p.y === HEIGHT / 2);
        const wide = fire(2 * WIDTH).filter((p) => p.y === HEIGHT / 2);
        narrow.forEach((p, i) => expect(wide[i].vx).toBeCloseTo(2 * p.vx));
    });

    it('rains the rest from above the top edge', () => {
        const rain = fire(WIDTH).filter((p) => Math.abs(p.x) < WIDTH / 2);
        expect(rain).toHaveLength(ConfettiFeel.count - Math.round(ConfettiFeel.count * ConfettiFeel.fanShare));
        rain.forEach((p) => {
            expect(p.y).toBeGreaterThanOrEqual(HEIGHT / 2);
            expect(p.vy).toBeLessThan(0);
            expect(p.delay).toBeGreaterThanOrEqual(ConfettiFeel.rainDelay.min);
        });
    });

    it('stops when the system is full', () => {
        expect(fire(WIDTH, 10)).toHaveLength(10);
    });
});
