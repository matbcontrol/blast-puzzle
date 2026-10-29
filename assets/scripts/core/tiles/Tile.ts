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

    /** For callers that already know this is a super tile. */
    requireSuperKind(): SuperKind {
        if (this.superKind === null) {
            throw new Error(`Tile ${this.id} is not a super tile`);
        }
        return this.superKind;
    }

    /** Same color for group building. Super tiles never match anything. */
    matches(other: Tile): boolean {
        return !this.isSuper && !other.isSuper && this.color === other.color;
    }

    /** Same sprite on screen: same color, or super tiles of the same kind. */
    looksLike(other: Tile): boolean {
        return this.color === other.color && this.superKind === other.superKind;
    }
}
