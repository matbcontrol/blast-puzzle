import { Random } from '../../core/random/Random';
import { TileColor } from '../../core/tiles/Tile';
import { GLOW_RADIUS, RING_RADIUS } from './FxArt';
import {
    budgeted,
    clamp01,
    cubicOut,
    FULL_TURN,
    inRange,
    lerp,
    mixColor,
    quadIn,
    quadOut,
    RAD_PER_DEG,
    randomSign,
    spreadAngle,
} from './FxMath';
import { FxFeel } from './FxFeel';
import { blankSpec, NO_FADE, ParticleEmitter, resetSpec } from './ParticleSystem';

const WHITE = 0xffffff;

/**
 * The particle side of every effect: what flies where. No engine here, so the choreography is tested in Node
 * and the view only draws what the system tells it.
 */
export class FxEmitters {
    private readonly spec = blankSpec();

    constructor(
        private readonly particles: ParticleEmitter,
        private readonly random: Random,
        private readonly tileTints: ReadonlyArray<number>,
    ) {}

    tintOf(color: TileColor | null): number {
        return color !== null && color >= 0 && color < this.tileTints.length
            ? this.tileTints[color]
            : FxFeel.palette.super;
    }

    /**
     * A flash of the tile color, shards thrown up in arcs and a few sparkles. crowd is how many tiles burst in the
     * same wave: they split the wave's share of the system evenly, shards first, so none of them comes up empty.
     */
    burst(x: number, y: number, color: TileColor | null, strength: number, crowd: number): void {
        const tune = FxFeel.burst;
        const random = this.random;
        const s = clamp01(strength);
        const base = this.tintOf(color);
        // What each tile gets besides its glow. From the capacity rather than from what is free, so the first
        // tiles of a wave cannot take the room of the last ones.
        const room = Math.floor((this.particles.capacity * tune.waveShare) / Math.max(1, crowd)) - 1;

        const glow = resetSpec(this.spec, 'glow', mixColor(base, WHITE, tune.glowWhiten), x, y);
        glow.life = tune.glowLife;
        glow.scaleFrom = tune.glowScale.min;
        glow.scaleTo = tune.glowScale.max;
        glow.scaleEase = quadOut;
        glow.opacity = tune.glowOpacity;
        // Nothing frees a slot during one call, so after the first dropped particle the rest would drop too.
        if (!this.particles.emit(glow)) {
            return;
        }

        const light = mixColor(base, WHITE, tune.lightMix);
        const shards = Math.min(Math.round(lerp(tune.shards.min, tune.shards.max, s)), Math.max(1, room));
        const offset = random.next() * FULL_TURN;
        const speedScale = 1 + tune.shardSpeedByStrength * (s - 0.5);
        for (let i = 0; i < shards; i++) {
            const angle = spreadAngle(i, shards, offset, tune.spreadJitter, random);
            const speed = inRange(tune.shardSpeed, random) * speedScale;
            const shard = resetSpec(this.spec, 'shard', random.next() < tune.lightShare ? light : base, x, y);
            shard.vx = Math.cos(angle) * speed;
            shard.vy = Math.sin(angle) * speed * tune.shardFlatten + tune.shardLift;
            shard.gravity = tune.shardGravity;
            shard.drag = tune.shardDrag;
            shard.angle = random.next() * 360;
            shard.spin = randomSign(random) * inRange(tune.shardSpin, random);
            shard.life = inRange(tune.shardLife, random);
            shard.scaleFrom = inRange(tune.shardScale, random);
            shard.scaleTo = shard.scaleFrom * tune.shardEndScale;
            shard.scaleEase = quadIn;
            shard.fadeFrom = tune.shardFadeFrom;
            if (!this.particles.emit(shard)) {
                return;
            }
        }

        const sparkles = Math.min(
            Math.round(lerp(tune.sparkles.min, tune.sparkles.max, s)),
            Math.max(0, room - shards),
        );
        for (let i = 0; i < sparkles; i++) {
            const angle = random.next() * FULL_TURN;
            const speed = inRange(tune.sparkleSpeed, random);
            const sparkle = resetSpec(
                this.spec,
                'sparkle',
                FxFeel.palette.warmWhite,
                x + (random.next() - 0.5) * 2 * tune.sparkleOffset,
                y + (random.next() - 0.5) * 2 * tune.sparkleOffset,
            );
            sparkle.vx = Math.cos(angle) * speed;
            // Upward only: sparkles drift off the burn, they do not fall.
            sparkle.vy = Math.abs(Math.sin(angle)) * speed;
            sparkle.drag = tune.sparkleDrag;
            sparkle.spin = randomSign(random) * tune.sparkleSpin;
            sparkle.life = inRange(tune.sparkleLife, random);
            sparkle.growIn = tune.sparkleGrowIn;
            sparkle.scaleFrom = inRange(tune.sparkleScale, random);
            sparkle.scaleTo = 0;
            sparkle.fadeFrom = NO_FADE;
            if (!this.particles.emit(sparkle)) {
                return;
            }
        }
    }

    /** A bright ring with a fainter echo, a glow over the blast area and sparks thrown to its edge. */
    shockwave(x: number, y: number, radius: number): void {
        const tune = FxFeel.shockwave;
        const palette = FxFeel.palette;
        const random = this.random;
        const ringScale = radius / RING_RADIUS;
        const glowScale = (radius * tune.glowShare) / GLOW_RADIUS;

        const ring = resetSpec(this.spec, 'ring', palette.warmWhite, x, y);
        ring.life = tune.life;
        ring.scaleFrom = ringScale * tune.startShare;
        ring.scaleTo = ringScale;
        ring.scaleEase = cubicOut;
        ring.fadeFrom = tune.ringFadeFrom;
        this.particles.emit(ring);

        const echo = resetSpec(this.spec, 'ring', palette.orange, x, y);
        echo.delay = tune.echoDelay;
        echo.life = tune.life;
        echo.scaleFrom = ringScale * tune.echoStartShare;
        echo.scaleTo = ringScale * tune.echoShare;
        echo.scaleEase = cubicOut;
        echo.opacity = tune.echoOpacity;
        this.particles.emit(echo);

        const glow = resetSpec(this.spec, 'glow', palette.gold, x, y);
        glow.life = tune.glowLife;
        glow.scaleFrom = glowScale * tune.glowStartShare;
        glow.scaleTo = glowScale;
        glow.scaleEase = quadOut;
        glow.opacity = tune.glowOpacity;
        this.particles.emit(glow);

        const offset = random.next() * FULL_TURN;
        const sparks = budgeted(tune.sparks, this.particles.load, 0);
        for (let i = 0; i < sparks; i++) {
            const angle = spreadAngle(i, sparks, offset, 1, random);
            const speed = inRange(tune.sparkSpeed, random) * radius;
            const spark = resetSpec(this.spec, 'sparkle', palette.gold, x, y);
            spark.vx = Math.cos(angle) * speed;
            spark.vy = Math.sin(angle) * speed;
            spark.drag = tune.sparkDrag;
            spark.life = inRange(tune.sparkLife, random);
            spark.scaleFrom = inRange(tune.sparkScale, random);
            spark.scaleTo = 0;
            spark.spin = randomSign(random) * tune.sparkSpin;
            spark.fadeFrom = NO_FADE;
            this.particles.emit(spark);
        }

        const streaks = budgeted(tune.streaks, this.particles.load, 0);
        for (let i = 0; i < streaks; i++) {
            // Half a sector off the sparks, so streaks fly between them.
            const angle = spreadAngle(i, streaks, offset + Math.PI / streaks, 1, random);
            const speed = inRange(tune.sparkSpeed, random) * radius;
            const streak = resetSpec(this.spec, 'streak', palette.warmWhite, x, y);
            streak.vx = Math.cos(angle) * speed;
            streak.vy = Math.sin(angle) * speed;
            streak.drag = tune.sparkDrag;
            streak.alignToVelocity = true;
            streak.life = tune.streakLife;
            streak.scaleFrom = tune.streakScale;
            streak.scaleTo = tune.streakScale * tune.streakEndShare;
            streak.stretch = tune.streakStretch;
            this.particles.emit(streak);
        }
    }

    /** One trail point a rocket has passed. angle is the flight direction in degrees, index counts the points. */
    rocketTrail(x: number, y: number, angle: number, index: number): void {
        const tune = FxFeel.rocket;
        const palette = FxFeel.palette;
        const random = this.random;

        const streak = resetSpec(this.spec, 'streak', palette.gold, x, y);
        streak.angle = angle;
        streak.life = tune.streakLife;
        streak.scaleFrom = tune.streakScale;
        streak.scaleTo = tune.streakScale * tune.streakEndShare;
        if (!this.particles.emit(streak)) {
            return;
        }

        const puff = resetSpec(this.spec, 'glow', palette.orange, x, y);
        puff.life = tune.puffLife;
        puff.scaleFrom = inRange(tune.puffScale, random);
        puff.scaleTo = puff.scaleFrom * tune.puffEndShare;
        puff.opacity = tune.puffOpacity;
        this.particles.emit(puff);

        if (index % tune.sparkEvery !== 0 || budgeted(1, this.particles.load, 0) === 0) {
            return;
        }
        const side = (angle + randomSign(random) * inRange(tune.sparkSide, random)) * RAD_PER_DEG;
        const speed = inRange(tune.sparkSpeed, random);
        const spark = resetSpec(this.spec, 'sparkle', palette.warmWhite, x, y);
        spark.vx = Math.cos(side) * speed;
        spark.vy = Math.sin(side) * speed;
        spark.gravity = tune.sparkGravity;
        spark.life = inRange(tune.sparkLife, random);
        spark.scaleFrom = inRange(tune.sparkScale, random);
        spark.scaleTo = 0;
        spark.spin = randomSign(random) * tune.sparkSpin;
        spark.fadeFrom = NO_FADE;
        this.particles.emit(spark);
    }

    /** A warm glow behind the praise text and sparkles twinkling along it. */
    praise(x: number, y: number, width: number): void {
        const tune = FxFeel.praise;
        const palette = FxFeel.palette;
        const random = this.random;

        const glow = resetSpec(this.spec, 'glow', palette.gold, x, y);
        glow.life = tune.glowLife;
        glow.growIn = tune.appear;
        glow.scaleFrom = tune.glowScale;
        glow.scaleTo = tune.glowScale * tune.glowGrowth;
        glow.stretch = tune.glowStretch;
        glow.opacity = tune.glowOpacity;
        glow.fadeFrom = tune.glowFadeFrom;
        this.particles.emit(glow);

        const sparkles = budgeted(tune.sparkles, this.particles.load, 0);
        for (let i = 0; i < sparkles; i++) {
            const sparkle = resetSpec(
                this.spec,
                'sparkle',
                i % 2 === 0 ? palette.warmWhite : palette.gold,
                x + (random.next() - 0.5) * width,
                y + (random.next() - 0.5) * 2 * tune.sparkleHeight,
            );
            sparkle.delay = random.next() * tune.sparkleDelay;
            sparkle.life = tune.sparkleLife;
            sparkle.growIn = tune.sparkleLife * tune.sparkleGrowShare;
            sparkle.scaleFrom = inRange(tune.sparkleScale, random);
            sparkle.scaleTo = 0;
            sparkle.scaleEase = quadIn;
            sparkle.spin = randomSign(random) * tune.sparkleSpin;
            sparkle.fadeFrom = NO_FADE;
            this.particles.emit(sparkle);
        }
    }
}
