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
        let points = 0;
        burn.waves.forEach((wave, i) => {
            const n = wave.tiles.length;
            const units = i === 0 && burn.fromGroup ? (n * (n + 1)) / 2 : n;
            points += units * this.pointsPerTile;
        });
        return points;
    }
}
