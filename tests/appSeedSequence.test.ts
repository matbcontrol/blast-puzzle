import { SeedSequence } from '../assets/scripts/app/SeedSequence';

/** Hands out 100, 101, 102... so a test sees which games got a fresh seed. */
function counter(): () => number {
    let next = 100;
    return () => next++;
}

function seeds(sequence: SeedSequence, games: number): number[] {
    const result: number[] = [];
    for (let i = 0; i < games; i++) {
        result.push(sequence.next());
    }
    return result;
}

describe('SeedSequence', () => {
    it('replays the URL seed once, then falls back to the level seed', () => {
        expect(seeds(new SeedSequence(42, 7, counter()), 3)).toEqual([42, 7, 7]);
    });

    it('replays the URL seed once, then deals fresh seeds when the level has none', () => {
        expect(seeds(new SeedSequence(42, null, counter()), 3)).toEqual([42, 100, 101]);
    });

    it('keeps the level seed for every game', () => {
        expect(seeds(new SeedSequence(null, 7, counter()), 3)).toEqual([7, 7, 7]);
    });

    it('deals a fresh seed for every game without URL and level seeds', () => {
        expect(seeds(new SeedSequence(null, null, counter()), 3)).toEqual([100, 101, 102]);
    });

    it('treats 0 as a real seed', () => {
        expect(seeds(new SeedSequence(0, null, counter()), 2)).toEqual([0, 100]);
        expect(seeds(new SeedSequence(null, 0, counter()), 2)).toEqual([0, 0]);
    });

    it('makes positive random seeds by default', () => {
        const seed = new SeedSequence(null, null).next();

        expect(Number.isInteger(seed)).toBe(true);
        expect(seed).toBeGreaterThan(0);
    });
});
