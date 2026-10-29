import { Random } from '../../core/random/Random';

export interface Range {
    readonly min: number;
    readonly max: number;
}

export type Easing = (t: number) => number;

export const linear: Easing = (t) => t;
export const quadIn: Easing = (t) => t * t;
export const quadOut: Easing = (t) => t * (2 - t);
export const cubicOut: Easing = (t) => 1 - (1 - t) * (1 - t) * (1 - t);

export const DEG_PER_RAD = 180 / Math.PI;
export const RAD_PER_DEG = Math.PI / 180;
export const FULL_TURN = 2 * Math.PI;

/** Unseeded on purpose: effects are decoration, and a ?seed= replay only has to repeat the game. */
export const effectRandom: Random = { next: () => Math.random() };

export function clamp01(value: number): number {
    return value < 0 ? 0 : value > 1 ? 1 : value;
}

/** Keeps value in [low, high]. A range too narrow to hold anything gives its middle. */
export function clampBetween(value: number, low: number, high: number): number {
    if (low > high) {
        return (low + high) / 2;
    }
    return value < low ? low : value > high ? high : value;
}

export function lerp(from: number, to: number, t: number): number {
    return from + (to - from) * t;
}

export function inRange(range: Range, random: Random): number {
    return lerp(range.min, range.max, random.next());
}

/** -1 or 1, for spins and tilts that should go either way. */
export function randomSign(random: Random): number {
    return random.next() < 0.5 ? -1 : 1;
}

/**
 * Angle in radians of the i-th of count pieces flying out of one point. Pieces get even sectors
 * and wander inside them, so a burst never clumps on one side the way plain random angles do.
 */
export function spreadAngle(index: number, count: number, offset: number, jitter: number, random: Random): number {
    const sector = (2 * Math.PI) / count;
    return offset + (index + 0.5 + (random.next() - 0.5) * jitter) * sector;
}

/** How many of the wanted particles a side effect gets when the system is already this full (0..1). */
export function budgeted(wanted: number, load: number, min: number): number {
    return Math.max(min, Math.round(wanted * (1 - clamp01(load))));
}

/** Mixes two 0xRRGGBB colors channel by channel. */
export function mixColor(from: number, to: number, t: number): number {
    const r = Math.round(lerp((from >> 16) & 0xff, (to >> 16) & 0xff, t));
    const g = Math.round(lerp((from >> 8) & 0xff, (to >> 8) & 0xff, t));
    const b = Math.round(lerp(from & 0xff, to & 0xff, t));
    return (r << 16) | (g << 8) | b;
}

/** Interpolates on a log scale: 10 → 100 points grows a popup as much as 100 → 1000. */
export function logLerp(value: number, low: number, high: number, from: number, to: number): number {
    if (value <= low) {
        return from;
    }
    return lerp(from, to, clamp01(Math.log(value / low) / Math.log(high / low)));
}

/** Direction from one point to another in degrees, counterclockwise from +x like node.angle. */
export function directionDeg(dx: number, dy: number): number {
    return Math.atan2(dy, dx) * DEG_PER_RAD;
}

/** Folds an angle into (-90, 90]: art that faces both ways never shows upside down. */
export function uprightDeg(angle: number): number {
    let a = angle % 360;
    if (a > 180) {
        a -= 360;
    } else if (a <= -180) {
        a += 360;
    }
    if (a > 90) {
        return a - 180;
    }
    if (a <= -90) {
        return a + 180;
    }
    return a;
}
