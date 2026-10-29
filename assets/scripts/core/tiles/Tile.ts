export type TileColor = number;
export type SuperKind = string;

export class Tile {
    private constructor(
        readonly id: number,
        readonly color: TileColor | null,
        readonly superKind: SuperKind | null,
    ) {}

    static ofColor(id: number, color: TileColor): Tile {
        return new Tile(id, color, null);
    }

    static superTile(id: number, kind: SuperKind): Tile {
        return new Tile(id, null, kind);
    }

    get isSuper(): boolean {
        return this.superKind !== null;
    }

    matches(other: Tile): boolean {
        return !this.isSuper && !other.isSuper && this.color === other.color;
    }
}
