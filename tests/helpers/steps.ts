import { GridPos, gridPos } from '../../assets/scripts/core/board/GridPos';
import { BlastWave, BurnedTile } from '../../assets/scripts/core/burn/BurnResolver';
import { TurnResult } from '../../assets/scripts/core/game/BlastGame';
import { BlastBurn, BurnOutcome, BurnStep, GroupBurn, TurnStep } from '../../assets/scripts/core/game/TurnStep';
import { SuperKind } from '../../assets/scripts/core/tiles/SuperKinds';
import { Tile } from '../../assets/scripts/core/tiles/Tile';

/** Burns for tests are built only here, so each one has a shape the model can actually report. */

let nextId = 20_000;

/** `size` cells of the bottom row, from the left edge. */
export function bottomRow(size: number): GridPos[] {
    return Array.from({ length: size }, (_, col) => gridPos(col, 0));
}

export function burnedAt(cells: ReadonlyArray<GridPos>): BurnedTile[] {
    return cells.map((at) => ({ tile: Tile.ofColor(nextId++, 0), at }));
}

/** The first cell is the tapped one. */
export function groupBurn(cells: ReadonlyArray<GridPos>, collapseTo: GridPos | null = null): GroupBurn {
    return { type: 'burn', cause: 'group', group: { origin: cells[0], tiles: burnedAt(cells) }, collapseTo };
}

export function blastWave(blast: SuperKind, origin: GridPos, cells: ReadonlyArray<GridPos>): BlastWave {
    return { origin, blast, tiles: burnedAt(cells) };
}

export function blastBurn(...waves: BlastWave[]): BlastBurn {
    return { type: 'burn', cause: 'blast', waves };
}

export function withPoints(burn: BurnOutcome, points: number): BurnStep {
    return { ...burn, points };
}

export const stepTypes = (result: TurnResult | null): string[] => result!.steps.map((step) => step.type);

export function firstBurn(result: TurnResult | null): BurnStep {
    const burn = result!.steps.find((step: TurnStep): step is BurnStep => step.type === 'burn');
    if (burn === undefined) {
        throw new Error(`Expected a burn, got ${stepTypes(result).join(', ')}`);
    }
    return burn;
}

/** The kind of every explosion in the first burn, in the order they went off. */
export function blastsOf(result: TurnResult | null): SuperKind[] {
    const burn = firstBurn(result);
    if (burn.cause !== 'blast') {
        throw new Error('Expected a burn started by an explosion, got a tapped group');
    }
    return burn.waves.map((wave) => wave.blast);
}
