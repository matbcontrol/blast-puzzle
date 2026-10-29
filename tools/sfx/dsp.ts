/** Offline mono synthesis for the sound generator. Time is in seconds, samples in -1..1. */
import { Random } from '../../assets/scripts/core/random/Random';

/** 22 kHz mono keeps every clip of the game in a few hundred KB, and phone speakers lose nothing above it. */
export const SAMPLE_RATE = 22050;

const TWO_PI = Math.PI * 2;
// Overtones above this would fold back below Nyquist as metallic aliasing.
const PARTIAL_LIMIT = SAMPLE_RATE * 0.45;
// Filter coefficients follow a moving cutoff this often, in samples.
const RETUNE_EVERY = 16;

/** A value over time; t is in seconds from the start of the voice. */
export type Curve = (t: number) => number;

/** Overtones as [multiple of the pitch, gain]. They follow the pitch envelope, which keeps them musical. */
export type Partials = ReadonlyArray<readonly [number, number]>;

export const clamp01 = (x: number): number => (x < 0 ? 0 : x > 1 ? 1 : x);

export const constant =
    (value: number): Curve =>
    () =>
        value;

export const scaled =
    (curve: Curve, gain: number): Curve =>
    (t) =>
        curve(t) * gain;

/** Exponential approach from `from` towards `to` with time constant `tau`. */
export const glide =
    (from: number, to: number, tau: number): Curve =>
    (t) =>
        to + (from - to) * Math.exp(-t / tau);

/** Exponential sweep that lands on `to` at `length` and stays there. Pitches and cutoffs move like this. */
export const sweep =
    (from: number, to: number, length: number): Curve =>
    (t) =>
        from * Math.pow(to / from, clamp01(t / length));

/** Linear attack, then exponential decay: the shape of anything struck or plucked. */
export const pluck =
    (attack: number, tau: number): Curve =>
    (t) =>
        t < attack ? t / attack : Math.exp(-(t - attack) / tau);

/** Smooth rise to a peak at `peakAt` (a share of `length`) and a smooth fall to zero at `length`. */
export const swell =
    (length: number, peakAt: number): Curve =>
    (t) => {
        const p = t / length;
        if (p <= 0 || p >= 1) {
            return 0;
        }
        const side = p < peakAt ? p / peakAt : (1 - p) / (1 - peakAt);
        return Math.pow(Math.sin((side * Math.PI) / 2), 2);
    };

/** Attack, decay to `sustain`, and a release that reaches zero exactly at `length`. */
export const adsr =
    (attack: number, decay: number, sustain: number, release: number, length: number): Curve =>
    (t) => {
        if (t < attack) {
            return t / attack;
        }
        const held = t < attack + decay ? 1 - (1 - sustain) * ((t - attack) / decay) : sustain;
        return t < length - release ? held : held * clamp01((length - t) / release);
    };

/** Periodic wobble around a curve: vibrato on a pitch, tremolo on an amplitude. `depth` is a share. */
export const wobble =
    (curve: Curve, rate: number, depth: number): Curve =>
    (t) =>
        curve(t) * (1 + depth * Math.sin(TWO_PI * rate * t));

export class Track {
    readonly samples: Float32Array;

    constructor(seconds: number) {
        this.samples = new Float32Array(Math.round(seconds * SAMPLE_RATE));
    }

    get seconds(): number {
        return this.samples.length / SAMPLE_RATE;
    }

    /** Adds another track into this one from `at` seconds on. */
    mix(other: Track, gain: number, at = 0): void {
        const offset = Math.round(at * SAMPLE_RATE);
        const end = Math.min(this.samples.length, offset + other.samples.length);
        for (let i = offset; i < end; i++) {
            this.samples[i] += other.samples[i - offset] * gain;
        }
    }
}

export type Wave = 'sine' | 'triangle';

export interface ToneSpec {
    readonly at: number;
    readonly length: number;
    readonly freq: Curve;
    readonly amp: Curve;
    readonly wave?: Wave;
    readonly partials?: Partials;
}

/** An oscillator with pitch and amplitude envelopes, added into the track. */
export function tone(track: Track, spec: ToneSpec): void {
    const partials = spec.partials || [];
    let phase = 0;
    forSpan(track, spec.at, spec.length, (i, t) => {
        const freq = spec.freq(t);
        phase += (TWO_PI * freq) / SAMPLE_RATE;
        let value = spec.wave === 'triangle' ? triangle(phase, freq) : Math.sin(phase);
        partials.forEach(([multiple, gain]) => {
            if (freq * multiple < PARTIAL_LIMIT) {
                value += gain * Math.sin(phase * multiple);
            }
        });
        track.samples[i] += spec.amp(t) * value;
    });
}

export type FilterType = 'lowpass' | 'highpass' | 'bandpass';

export interface FilterSpec {
    readonly type: FilterType;
    readonly freq: Curve;
    readonly q?: number;
}

export interface NoiseSpec {
    readonly at: number;
    readonly length: number;
    readonly amp: Curve;
    readonly filter?: FilterSpec;
}

/** White noise, optionally through a filter whose cutoff moves over time. */
export function noise(track: Track, random: Random, spec: NoiseSpec): void {
    const filter = spec.filter;
    const biquad = filter ? new Biquad(filter.type) : null;
    forSpan(track, spec.at, spec.length, (i, t, n) => {
        let value = random.next() * 2 - 1;
        if (biquad !== null && filter) {
            if (n % RETUNE_EVERY === 0) {
                biquad.tune(filter.freq(t), filter.q || Math.SQRT1_2);
            }
            value = biquad.process(value);
        }
        track.samples[i] += spec.amp(t) * value;
    });
}

/** Runs the whole track through a fixed filter. */
export function filtered(track: Track, type: FilterType, freq: number, q = Math.SQRT1_2): void {
    const biquad = new Biquad(type);
    biquad.tune(freq, q);
    const samples = track.samples;
    for (let i = 0; i < samples.length; i++) {
        samples[i] = biquad.process(samples[i]);
    }
}

/** RBJ cookbook biquad in direct form I, which tolerates retuning while it runs. */
export class Biquad {
    private b0 = 1;
    private b1 = 0;
    private b2 = 0;
    private a1 = 0;
    private a2 = 0;
    private x1 = 0;
    private x2 = 0;
    private y1 = 0;
    private y2 = 0;

    constructor(private readonly type: FilterType) {}

    tune(freq: number, q: number): void {
        const w = (TWO_PI * Math.min(Math.max(freq, 20), SAMPLE_RATE * 0.48)) / SAMPLE_RATE;
        const cos = Math.cos(w);
        const alpha = Math.sin(w) / (2 * q);
        const a0 = 1 + alpha;
        let b0: number;
        let b1: number;
        let b2: number;
        if (this.type === 'lowpass') {
            b0 = (1 - cos) / 2;
            b1 = 1 - cos;
            b2 = b0;
        } else if (this.type === 'highpass') {
            b0 = (1 + cos) / 2;
            b1 = -(1 + cos);
            b2 = b0;
        } else {
            // Band-pass with 0 dB at the centre, so a moving centre does not change the loudness.
            b0 = alpha;
            b1 = 0;
            b2 = -alpha;
        }
        this.b0 = b0 / a0;
        this.b1 = b1 / a0;
        this.b2 = b2 / a0;
        this.a1 = (-2 * cos) / a0;
        this.a2 = (1 - alpha) / a0;
    }

    process(x: number): number {
        const y = this.b0 * x + this.b1 * this.x1 + this.b2 * this.x2 - this.a1 * this.y1 - this.a2 * this.y2;
        this.x2 = this.x1;
        this.x1 = x;
        this.y2 = this.y1;
        this.y1 = y;
        return y;
    }
}

export interface RoomSpec {
    /** Scales the delay lengths; 1 is a small room, 0.5 a box. */
    readonly size: number;
    /** 0..1: how long the tail rings. */
    readonly feedback: number;
    /** 0..1: how fast the tail loses its highs. */
    readonly damp: number;
    /** Share of the tail added to the dry sound. */
    readonly mix: number;
}

// Mutually prime delays (Schroeder), so the echoes smear into a tail instead of a flutter.
const COMB_MS = [29.7, 37.1, 41.1, 43.7];
const ALLPASS_MS = [5.0, 1.7];
const ALLPASS_GAIN = 0.6;

/** A short reverb tail: parallel damped comb filters, then two all-passes to diffuse them. */
export function room(track: Track, spec: RoomSpec): void {
    const dry = track.samples.slice();
    const wet = new Float32Array(dry.length);
    COMB_MS.forEach((ms) => comb(dry, wet, delayOf(ms * spec.size), spec.feedback, spec.damp));
    ALLPASS_MS.forEach((ms) => allpass(wet, delayOf(ms)));
    const gain = spec.mix / COMB_MS.length;
    for (let i = 0; i < dry.length; i++) {
        track.samples[i] += wet[i] * gain;
    }
}

/** Soft clipping: rounds the peaks, which reads as punch and lets quiet details through. */
export function saturate(track: Track, drive: number): void {
    normalize(track, 0);
    const norm = Math.tanh(drive);
    const samples = track.samples;
    for (let i = 0; i < samples.length; i++) {
        samples[i] = Math.tanh(samples[i] * drive) / norm;
    }
}

const FADE_IN = 0.005;
// The tail is tapered over this share of the clip, at least FADE_IN, so a cut reverb does not click.
const TAIL_TAPER = 0.08;
const DC_CUTOFF_HZ = 20;

/** Last step of every sound: no DC, no clicks at the edges, peak at `peakDb` dBFS. */
export function finish(track: Track, peakDb: number): Track {
    removeDc(track);
    const samples = track.samples;
    const fadeIn = Math.round(FADE_IN * SAMPLE_RATE);
    const fadeOut = Math.max(fadeIn, Math.round(samples.length * TAIL_TAPER));
    for (let i = 0; i < fadeIn; i++) {
        samples[i] *= i / fadeIn;
    }
    for (let i = 0; i < fadeOut; i++) {
        samples[samples.length - 1 - i] *= Math.sin(((i / fadeOut) * Math.PI) / 2);
    }
    normalize(track, peakDb);
    return track;
}

export function normalize(track: Track, peakDb: number): void {
    const samples = track.samples;
    let peak = 0;
    for (let i = 0; i < samples.length; i++) {
        peak = Math.max(peak, Math.abs(samples[i]));
    }
    if (peak === 0) {
        return;
    }
    const gain = Math.pow(10, peakDb / 20) / peak;
    for (let i = 0; i < samples.length; i++) {
        samples[i] *= gain;
    }
}

function forSpan(track: Track, at: number, length: number, body: (i: number, t: number, n: number) => void): void {
    const start = Math.max(0, Math.round(at * SAMPLE_RATE));
    const end = Math.min(track.samples.length, Math.round((at + length) * SAMPLE_RATE));
    for (let i = start; i < end; i++) {
        body(i, (i - start) / SAMPLE_RATE, i - start);
    }
}

/** Band-limited: odd harmonics only up to PARTIAL_LIMIT, so low notes stay round instead of buzzing. */
function triangle(phase: number, freq: number): number {
    let sum = 0;
    let sign = 1;
    for (let n = 1; n * freq < PARTIAL_LIMIT; n += 2) {
        sum += (sign * Math.sin(n * phase)) / (n * n);
        sign = -sign;
    }
    return (8 / (Math.PI * Math.PI)) * sum;
}

function delayOf(ms: number): number {
    return Math.max(1, Math.round((ms / 1000) * SAMPLE_RATE));
}

function comb(input: Float32Array, output: Float32Array, delay: number, feedback: number, damp: number): void {
    const line = new Float32Array(delay);
    let cursor = 0;
    let lowpass = 0;
    for (let i = 0; i < input.length; i++) {
        const echoed = line[cursor];
        lowpass = echoed * (1 - damp) + lowpass * damp;
        line[cursor] = input[i] + lowpass * feedback;
        cursor = (cursor + 1) % delay;
        output[i] += echoed;
    }
}

function allpass(samples: Float32Array, delay: number): void {
    const line = new Float32Array(delay);
    let cursor = 0;
    for (let i = 0; i < samples.length; i++) {
        const delayed = line[cursor];
        const fed = samples[i] + delayed * ALLPASS_GAIN;
        line[cursor] = fed;
        samples[i] = delayed - fed * ALLPASS_GAIN;
        cursor = (cursor + 1) % delay;
    }
}

function removeDc(track: Track): void {
    const r = 1 - (TWO_PI * DC_CUTOFF_HZ) / SAMPLE_RATE;
    const samples = track.samples;
    let previousIn = 0;
    let previousOut = 0;
    for (let i = 0; i < samples.length; i++) {
        const out = samples[i] - previousIn + r * previousOut;
        previousIn = samples[i];
        previousOut = out;
        samples[i] = out;
    }
}
