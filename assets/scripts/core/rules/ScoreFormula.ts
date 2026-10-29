import { BurnOutcome } from '../game/TurnStep';

export interface ScoreFormula {
    pointsFor(burn: BurnOutcome): number;
}

/**
 * A tapped group pays progressively: its k-th tile is worth k * pointsPerTile,
 * so 2 tiles give 3 units, 5 give 15, 10 give 55. Explosions pay a flat pointsPerTile per tile,
 * otherwise one whole-board blast would be worth more than the rest of the level.
 */
export class BlastScore implements ScoreFormula {
    constructor(private readonly pointsPerTile: number) {}

    pointsFor(burn: BurnOutcome): number {
        if (burn.cause === 'group') {
            const n = burn.group.tiles.length;
            return ((n * (n + 1)) / 2) * this.pointsPerTile;
        }
        return burn.waves.reduce((tiles, wave) => tiles + wave.tiles.length, 0) * this.pointsPerTile;
    }
}
