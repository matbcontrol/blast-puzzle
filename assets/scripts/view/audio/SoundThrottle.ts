export interface VoiceLimit {
    /** A start closer than this to the previous start of the same sound is dropped. */
    readonly minGapMs: number;
    /** How many instances of the same sound may ring at once. */
    readonly maxOverlap: number;
}

interface VoiceState {
    lastStart: number;
    /** End times of the instances still ringing; never longer than maxOverlap. */
    readonly ends: number[];
}

/**
 * Decides whether a sound may start now. A 90-tile chain asks for 90 pops within a second,
 * and three at a time already reads as a cascade. The clock comes from the caller.
 */
export class SoundThrottle<Id extends string> {
    private readonly voices = new Map<Id, VoiceState>();

    constructor(private readonly limitFor: (id: Id) => VoiceLimit) {}

    tryStart(id: Id, nowMs: number, durationMs: number): boolean {
        const limit = this.limitFor(id);
        const voice = this.voiceOf(id);
        if (nowMs - voice.lastStart < limit.minGapMs) {
            return false;
        }
        dropEnded(voice.ends, nowMs);
        if (voice.ends.length >= limit.maxOverlap) {
            return false;
        }
        voice.ends.push(nowMs + durationMs);
        voice.lastStart = nowMs;
        return true;
    }

    /** For when every sound was stopped at once. */
    reset(): void {
        this.voices.clear();
    }

    private voiceOf(id: Id): VoiceState {
        let voice = this.voices.get(id);
        if (voice === undefined) {
            voice = { lastStart: -Infinity, ends: [] };
            this.voices.set(id, voice);
        }
        return voice;
    }
}

/** Maps intensity 0..1 onto one of `count` variants in equal steps, quietest first. */
export function pickVariant(intensity: number, count: number): number {
    if (!(intensity > 0)) {
        return 0;
    }
    return Math.min(count - 1, Math.floor(Math.min(intensity, 1) * count));
}

// In place: this runs for every requested sound, so it does not allocate.
function dropEnded(ends: number[], nowMs: number): void {
    let kept = 0;
    for (let i = 0; i < ends.length; i++) {
        if (ends[i] > nowMs) {
            ends[kept++] = ends[i];
        }
    }
    ends.length = kept;
}
