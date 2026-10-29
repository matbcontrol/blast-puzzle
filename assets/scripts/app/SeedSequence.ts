/**
 * Seed of each new game. The first game replays the seed from the URL, if any.
 * A seed in the level config fixes the level for every game; without one each game gets a fresh seed.
 */
export class SeedSequence {
    constructor(
        private replaySeed: number | null,
        private readonly levelSeed: number | null,
        private readonly freshSeed: () => number = randomSeed,
    ) {}

    next(): number {
        const replay = this.replaySeed;
        this.replaySeed = null;
        if (replay !== null) {
            return replay;
        }
        return this.levelSeed !== null ? this.levelSeed : this.freshSeed();
    }
}

function randomSeed(): number {
    return Math.floor(Math.random() * 0x7fffffff) + 1;
}
