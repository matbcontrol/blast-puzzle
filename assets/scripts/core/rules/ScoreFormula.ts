export interface ScoreFormula {
    pointsFor(burnedCount: number): number;
}

/**
 * The k-th tile of a burn is worth k * pointsPerTile, so one big group beats several small ones:
 * 2 tiles give 3 units, 5 tiles give 15, 10 tiles give 55.
 */
export class ProgressiveScore implements ScoreFormula {
    constructor(private readonly pointsPerTile: number) {}

    pointsFor(burnedCount: number): number {
        return (this.pointsPerTile * burnedCount * (burnedCount + 1)) / 2;
    }
}
