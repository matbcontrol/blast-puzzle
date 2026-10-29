import { Random, randomInt } from '../random/Random';
import { SuperKind, Tile, TileColor } from './Tile';

export class TileFactory {
    private nextId = 1;

    constructor(
        private readonly random: Random,
        private readonly colorCount: number,
    ) {}

    createRandom(): Tile {
        return this.createOfColor(randomInt(this.random, this.colorCount));
    }

    createOfColor(color: TileColor): Tile {
        return Tile.ofColor(this.nextId++, color);
    }

    createSuper(kind: SuperKind): Tile {
        return Tile.superTile(this.nextId++, kind);
    }
}
