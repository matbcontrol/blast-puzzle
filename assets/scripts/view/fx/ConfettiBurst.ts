import { Random, randomItem } from '../../core/random/Random';
import { FxFeel } from './FxFeel';
import { FULL_TURN, inRange, lerp, RAD_PER_DEG, randomSign } from './FxMath';
import { blankSpec, ParticleEmitter, ParticleSpec, resetSpec } from './ParticleSystem';

/** The win confetti of ScreenConfetti. Seconds, screen px in design units, degrees. Speeds px/s, gravity px/s². */
export const ConfettiFeel = {
    count: 140,
    /** Share of the pieces fanned out from the two top corners. The rest rain from above the top edge. */
    fanShare: 0.5,
    /** Degrees below horizontal, toward the middle: each corner's fan opens from nearly flat to steep. */
    fanAngle: { min: 5, max: 70 },
    /** 0 puts the pieces of a fan at even angles, 1 lets each wander over its whole slice of it. */
    fanJitter: 0.8,
    /** In visible widths per second, so the fan reaches the middle on a phone and on a wide window alike. */
    fanSpeed: { min: 0.7, max: 1.5 },
    fanDelay: 0.12,
    rainSpeed: { min: 100, max: 320 },
    rainDrift: 60,
    /** The shower starts this far above the top edge at most, so it does not arrive as one line. */
    rainHeight: 160,
    rainDelay: { min: 0.15, max: 1.2 },
    gravity: 1200,
    drag: 1.8,
    life: { min: 2.6, max: 3.4 },
    fadeFrom: 0.8,
    flip: { min: 1, max: 2.4 },
    sway: { min: 60, max: 160 },
    spin: 260,
    /** Of the 16x24 px texture: the pieces have to read on a phone across the whole screen. */
    scale: { min: 1.8, max: 2.8 },
    tints: FxFeel.palette.tiles.concat([FxFeel.palette.warmWhite, FxFeel.palette.gold]),
};

/** The particle side of the win confetti, over an area of this size centered at 0,0. No engine here. */
export class ConfettiBurst {
    private readonly spec = blankSpec();

    constructor(
        private readonly particles: ParticleEmitter,
        private readonly random: Random,
    ) {}

    /** Two fans from the top corners toward the middle and a shower from above. Stops when the system is full. */
    fire(width: number, height: number): void {
        const tune = ConfettiFeel;
        const random = this.random;
        const fanned = Math.round(tune.count * tune.fanShare);
        for (let i = 0; i < tune.count; i++) {
            const piece = resetSpec(this.spec, 'confetti', randomItem(random, tune.tints), 0, 0);
            if (i < fanned) {
                this.aimFan(piece, i, fanned, width, height);
            } else {
                this.aimRain(piece, width, height);
            }
            piece.gravity = tune.gravity;
            piece.drag = tune.drag;
            piece.life = inRange(tune.life, random);
            piece.fadeFrom = tune.fadeFrom;
            piece.angle = random.next() * 360;
            piece.spin = randomSign(random) * random.next() * tune.spin;
            piece.flip = inRange(tune.flip, random);
            piece.sway = inRange(tune.sway, random);
            piece.phase = random.next() * FULL_TURN;
            piece.scaleFrom = inRange(tune.scale, random);
            piece.scaleTo = piece.scaleFrom;
            if (!this.particles.emit(piece)) {
                return;
            }
        }
    }

    /** Even pieces go left, odd ones right, and each takes its own slice of its corner's fan. */
    private aimFan(piece: ParticleSpec, index: number, fanned: number, width: number, height: number): void {
        const tune = ConfettiFeel;
        const random = this.random;
        const side = index % 2 === 0 ? -1 : 1;
        const perCorner = Math.ceil(fanned / 2);
        const slice = (Math.floor(index / 2) + 0.5 + (random.next() - 0.5) * tune.fanJitter) / perCorner;
        const below = lerp(tune.fanAngle.min, tune.fanAngle.max, slice) * RAD_PER_DEG;
        const speed = inRange(tune.fanSpeed, random) * width;
        piece.x = (side * width) / 2;
        piece.y = height / 2;
        // A corner throws away from its own side, toward the middle.
        piece.vx = -side * Math.cos(below) * speed;
        piece.vy = -Math.sin(below) * speed;
        piece.delay = random.next() * tune.fanDelay;
    }

    private aimRain(piece: ParticleSpec, width: number, height: number): void {
        const tune = ConfettiFeel;
        const random = this.random;
        piece.x = (random.next() - 0.5) * width;
        piece.y = height / 2 + random.next() * tune.rainHeight;
        piece.vx = (random.next() - 0.5) * 2 * tune.rainDrift;
        piece.vy = -inRange(tune.rainSpeed, random);
        piece.delay = inRange(tune.rainDelay, random);
    }
}
