import { SeededRandom } from '../assets/scripts/core/random/SeededRandom';
import { RING_RADIUS } from '../assets/scripts/view/fx/FxArt';
import { FxEmitters } from '../assets/scripts/view/fx/FxEmitters';
import { FxTuning } from '../assets/scripts/view/fx/FxTuning';
import { ParticleEmitter, ParticleSpec } from '../assets/scripts/view/fx/ParticleSystem';

/** Records what was emitted. room limits how many fit, load is what emitters see of the fill level. */
class RecordingEmitter implements ParticleEmitter {
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
            emitters(weak).burst(0, 0, 0, 0);
            emitters(strong).burst(0, 0, 0, 1);
            expect(weak.ofKind('shard')).toHaveLength(FxTuning.burst.shards.min);
            expect(strong.ofKind('shard')).toHaveLength(FxTuning.burst.shards.max);
            expect(strong.ofKind('glow')).toHaveLength(1);
            expect(strong.ofKind('sparkle')).toHaveLength(FxTuning.burst.sparkles.max);
        });

        it('tints shards with the tile color or a lighter shade of it', () => {
            const sink = new RecordingEmitter();
            emitters(sink).burst(0, 0, 3, 1);
            sink.ofKind('shard').forEach((shard) => {
                expect(shard.tint >> 16).toBe(0xff);
            });
            expect(sink.ofKind('shard').some((shard) => shard.tint === 0xff0000)).toBe(true);
        });

        it('gives a super tile the gold tint', () => {
            const sink = new RecordingEmitter();
            emitters(sink).burst(0, 0, null, 1);
            expect(sink.ofKind('shard')[0].tint).toBe(FxTuning.palette.super);
        });

        it('spreads shards all around the burn', () => {
            const sink = new RecordingEmitter();
            emitters(sink).burst(0, 0, 0, 1);
            const shards = sink.ofKind('shard');
            expect(shards.some((s) => s.vx > 0)).toBe(true);
            expect(shards.some((s) => s.vx < 0)).toBe(true);
            expect(shards.some((s) => s.vy < 0)).toBe(true);
        });

        it('thins out when the system is busy, keeping a few shards', () => {
            const sink = new RecordingEmitter(Infinity, 0.9);
            emitters(sink).burst(0, 0, 0, 1);
            expect(sink.ofKind('shard')).toHaveLength(FxTuning.burst.minShards);
            expect(sink.ofKind('sparkle')).toHaveLength(0);
        });

        it('stops at the first dropped particle', () => {
            const sink = new RecordingEmitter(0);
            emitters(sink).burst(0, 0, 0, 1);
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
        expect(ring.scaleFrom).toBeCloseTo(ring.scaleTo * FxTuning.shockwave.startShare);
    });

    it('lays the rocket trail along the flight and throws sparks off to the sides', () => {
        const sink = new RecordingEmitter();
        const fx = emitters(sink);
        for (let i = 0; i < 4; i++) {
            fx.rocketTrail(i * 26, 0, 0, i);
        }
        sink.ofKind('streak').forEach((streak) => expect(streak.angle).toBe(0));
        const sparks = sink.ofKind('sparkle');
        expect(sparks).toHaveLength(4 / FxTuning.rocket.sparkEvery);
        sparks.forEach((spark) => expect(Math.abs(spark.vy)).toBeGreaterThan(Math.abs(spark.vx) * 0.5));
    });

    it('fires confetti from both bottom corners and from above the board', () => {
        const sink = new RecordingEmitter();
        emitters(sink).confetti(900, 1000);
        const pieces = sink.ofKind('confetti');
        expect(pieces).toHaveLength(FxTuning.confetti.count);
        expect(pieces.some((p) => p.x === -450 && p.y === -500 && p.vx > 0)).toBe(true);
        expect(pieces.some((p) => p.x === 450 && p.y === -500 && p.vx < 0)).toBe(true);
        expect(pieces.some((p) => p.y >= 500 && p.vy < 0)).toBe(true);
    });
});
