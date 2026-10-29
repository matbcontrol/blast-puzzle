import { FxKind } from './FxArt';
import { DEG_PER_RAD, Easing, linear, quadOut } from './FxMath';

/** A pooled sprite the system moves. The engine side implements it, so the motion itself runs in plain Node. */
export interface ParticleSprite {
    place(x: number, y: number, angle: number, scaleX: number, scaleY: number, opacity: number): void;
}

/** Hands out hidden sprites. A released sprite must not show until it is acquired and placed again. */
export interface ParticleSprites<S extends ParticleSprite> {
    acquire(kind: FxKind, tint: number): S;
    release(sprite: S): void;
}

/** Everything about one particle. Times in seconds, distances in px, angles in degrees, tint as 0xRRGGBB. */
export interface ParticleSpec {
    kind: FxKind;
    tint: number;
    x: number;
    y: number;
    vx: number;
    vy: number;
    /** Pulls toward -y, px/s². */
    gravity: number;
    /** Share of the speed lost per second: confetti floats, sparks stop short. */
    drag: number;
    angle: number;
    spin: number;
    /** Turns the sprite along its velocity: speed lines. */
    alignToVelocity: boolean;
    /** Hidden until then. Lets one call stagger a whole shower. */
    delay: number;
    life: number;
    scaleFrom: number;
    scaleTo: number;
    scaleEase: Easing;
    /** Pops in from zero over this time before following scaleFrom → scaleTo. */
    growIn: number;
    /** Width over height on top of the scale. */
    stretch: number;
    opacity: number;
    /** Share of the life after which the particle fades to nothing. NO_FADE keeps it opaque to the end. */
    fadeFrom: number;
    /** Turns per second around the vertical axis, plus the matching side-to-side flutter: falling paper. */
    flip: number;
    /** Flutter amplitude, px/s. */
    sway: number;
    phase: number;
}

/** For particles that shrink away instead of fading. */
export const NO_FADE = 1;

const BLANK: ParticleSpec = {
    kind: 'glow',
    tint: 0xffffff,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    gravity: 0,
    drag: 0,
    angle: 0,
    spin: 0,
    alignToVelocity: false,
    delay: 0,
    life: 1,
    scaleFrom: 1,
    scaleTo: 1,
    scaleEase: linear,
    growIn: 0,
    stretch: 1,
    opacity: 255,
    fadeFrom: 0,
    flip: 0,
    sway: 0,
    phase: 0,
};

/** Resets a reusable spec, so an emitter only sets what its particle needs. */
export function resetSpec(spec: ParticleSpec, kind: FxKind, tint: number, x: number, y: number): ParticleSpec {
    Object.assign(spec, BLANK);
    spec.kind = kind;
    spec.tint = tint;
    spec.x = x;
    spec.y = y;
    return spec;
}

export function blankSpec(): ParticleSpec {
    return Object.assign({}, BLANK);
}

/** What emitters see of the system. */
export interface ParticleEmitter {
    /** 0 when empty, 1 when full. */
    readonly load: number;
    /** Copies the spec, so the caller can reuse it. False when the system is full and the particle is dropped. */
    emit(spec: ParticleSpec): boolean;
}

class Particle<S> {
    readonly spec: ParticleSpec = blankSpec();
    sprite: S | null = null;
    age = 0;
    x = 0;
    y = 0;
    vx = 0;
    vy = 0;
    angle = 0;
}

const TURN = 2 * Math.PI;

/**
 * Fixed-capacity particle simulation. Slots are allocated once and live ones are packed at the front,
 * so a frame allocates nothing and a dead particle leaves in O(1).
 */
export class ParticleSystem<S extends ParticleSprite> implements ParticleEmitter {
    private readonly slots: Array<Particle<S>> = [];
    private live = 0;

    constructor(
        private readonly sprites: ParticleSprites<S>,
        readonly capacity: number,
    ) {
        for (let i = 0; i < capacity; i++) {
            this.slots.push(new Particle<S>());
        }
    }

    get count(): number {
        return this.live;
    }

    get load(): number {
        return this.live / this.capacity;
    }

    emit(spec: ParticleSpec): boolean {
        if (this.live >= this.capacity) {
            return false;
        }
        const p = this.slots[this.live++];
        Object.assign(p.spec, spec);
        p.sprite = this.sprites.acquire(spec.kind, spec.tint);
        p.age = -spec.delay;
        p.x = spec.x;
        p.y = spec.y;
        p.vx = spec.vx;
        p.vy = spec.vy;
        p.angle = spec.angle;
        if (p.age >= 0) {
            this.render(p);
        }
        return true;
    }

    step(dt: number): void {
        let i = 0;
        while (i < this.live) {
            const p = this.slots[i];
            if (this.advance(p, dt)) {
                i++;
            } else {
                this.kill(i);
            }
        }
    }

    clear(): void {
        while (this.live > 0) {
            this.kill(this.live - 1);
        }
    }

    /** False when the particle has run its life. */
    private advance(p: Particle<S>, dt: number): boolean {
        const spec = p.spec;
        p.age += dt;
        if (p.age < 0) {
            return true;
        }
        if (p.age >= spec.life) {
            return false;
        }
        // A particle that has just come out of its delay only moves for the part of the frame it was alive.
        const t = Math.min(dt, p.age);
        if (spec.drag > 0) {
            const damping = Math.exp(-spec.drag * t);
            p.vx *= damping;
            p.vy *= damping;
        }
        p.vy -= spec.gravity * t;
        p.x += p.vx * t;
        p.y += p.vy * t;
        if (spec.sway !== 0) {
            p.x += Math.cos(spec.phase + p.age * spec.flip * TURN) * spec.sway * t;
        }
        p.angle += spec.spin * t;
        this.render(p);
        return true;
    }

    private render(p: Particle<S>): void {
        const spec = p.spec;
        const t = p.age / spec.life;
        let scale = spec.scaleFrom + (spec.scaleTo - spec.scaleFrom) * spec.scaleEase(t);
        if (p.age < spec.growIn) {
            scale *= quadOut(p.age / spec.growIn);
        }
        let opacity = spec.opacity;
        if (t > spec.fadeFrom) {
            opacity *= 1 - (t - spec.fadeFrom) / (1 - spec.fadeFrom);
        }
        let scaleX = scale * spec.stretch;
        if (spec.flip !== 0) {
            scaleX *= Math.cos(spec.phase + p.age * spec.flip * TURN);
        }
        const angle = spec.alignToVelocity ? Math.atan2(p.vy, p.vx) * DEG_PER_RAD : p.angle;
        (p.sprite as S).place(p.x, p.y, angle, scaleX, scale, opacity);
    }

    /** Swaps the dead particle with the last live one, so the live ones stay packed. */
    private kill(index: number): void {
        const p = this.slots[index];
        this.sprites.release(p.sprite as S);
        p.sprite = null;
        const last = --this.live;
        this.slots[index] = this.slots[last];
        this.slots[last] = p;
    }
}
