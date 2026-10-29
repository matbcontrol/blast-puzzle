import { pickVariant, SoundThrottle, VoiceLimit } from '../assets/scripts/view/audio/SoundThrottle';

const POP: VoiceLimit = { minGapMs: 40, maxOverlap: 3 };
const POP_MS = 150;

function throttle(limit: VoiceLimit = POP): SoundThrottle<string> {
    return new SoundThrottle<string>(() => limit);
}

/** Asks for one sound at each of the given times and returns the times it was allowed to start. */
function started(sounds: SoundThrottle<string>, times: number[], durationMs = POP_MS): number[] {
    return times.filter((now) => sounds.tryStart('pop', now, durationMs));
}

describe('SoundThrottle', () => {
    it('drops a start that comes sooner than the minimum gap', () => {
        expect(started(throttle(), [0, 10, 39, 40, 79, 80])).toEqual([0, 40, 80]);
    });

    it('caps how many instances ring at once and frees a slot when one ends', () => {
        // Three ring from 0, 40 and 80 ms; the first one ends at 150.
        expect(started(throttle(), [0, 40, 80, 120, 149, 150])).toEqual([0, 40, 80, 150]);
    });

    it('turns a 90-tile chain into a few pops that never pile up', () => {
        const sounds = throttle();
        const requests = Array.from({ length: 90 }, (_, i) => i * 5);
        const starts = started(sounds, requests);

        expect(starts.length).toBeGreaterThan(1);
        starts.forEach((start) => {
            const ringing = starts.filter((other) => other <= start && start < other + POP_MS);
            expect(ringing.length).toBeLessThanOrEqual(POP.maxOverlap);
        });
    });

    it('limits each sound on its own', () => {
        const sounds = throttle();

        expect(sounds.tryStart('pop', 0, POP_MS)).toBe(true);
        expect(sounds.tryStart('land', 0, POP_MS)).toBe(true);
        expect(sounds.tryStart('pop', 10, POP_MS)).toBe(false);
    });

    it('uses the limit of each sound', () => {
        const sounds = new SoundThrottle<string>((id) =>
            id === 'win' ? { minGapMs: 1000, maxOverlap: 1 } : { minGapMs: 0, maxOverlap: 10 },
        );

        expect(sounds.tryStart('win', 0, 1400)).toBe(true);
        expect(sounds.tryStart('win', 500, 1400)).toBe(false);
        expect(sounds.tryStart('click', 0, 50)).toBe(true);
        expect(sounds.tryStart('click', 0, 50)).toBe(true);
    });

    it('forgets what was ringing after a reset', () => {
        const sounds = throttle({ minGapMs: 0, maxOverlap: 1 });
        sounds.tryStart('pop', 0, 1000);

        expect(sounds.tryStart('pop', 10, 1000)).toBe(false);
        sounds.reset();
        expect(sounds.tryStart('pop', 10, 1000)).toBe(true);
    });
});

describe('pickVariant', () => {
    it('splits intensity into equal steps, quietest first', () => {
        expect([0, 0.19, 0.2, 0.5, 0.79, 0.8, 1].map((intensity) => pickVariant(intensity, 5))).toEqual([
            0, 0, 1, 2, 3, 4, 4,
        ]);
    });

    it('clamps intensity outside 0..1 and survives NaN', () => {
        expect(pickVariant(-1, 5)).toBe(0);
        expect(pickVariant(7, 5)).toBe(4);
        expect(pickVariant(NaN, 5)).toBe(0);
    });

    it('always picks the only variant', () => {
        expect(pickVariant(0.7, 1)).toBe(0);
    });
});
