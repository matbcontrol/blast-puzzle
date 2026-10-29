/** A tile and the column it burns in. */
export interface ColumnTile {
    readonly id: number;
    readonly col: number;
}

interface Waiter {
    readonly col: number;
    readonly open: () => void;
}

const noop = (): void => undefined;

/**
 * When each column is free to settle during a turn. A column is busy while a tile burning in it is still on the
 * stage, and while a step holding it plays. So a column falls as soon as its own cells are cleared,
 * not when the last tile of the whole blast is gone.
 */
export class ColumnGates {
    /** Column by tile id. */
    private readonly burning = new Map<number, number>();
    private readonly holds = new Map<number, Array<Promise<void>>>();
    private waiters: Waiter[] = [];

    /** The tiles burn until removed() names them, or until done settles: a lost removal cannot stall a column. */
    burn(tiles: ReadonlyArray<ColumnTile>, done: Promise<unknown>): void {
        tiles.forEach((tile) => this.burning.set(tile.id, tile.col));
        const release = (): void => tiles.forEach((tile) => this.removed(tile.id));
        done.then(release, release);
    }

    removed(tileId: number): void {
        if (this.burning.delete(tileId)) {
            this.waiters = this.waiters.filter((waiter) => {
                if (this.isBurning(waiter.col)) {
                    return true;
                }
                waiter.open();
                return false;
            });
        }
    }

    /** The column stays busy until done settles, however it settles. */
    hold(col: number, done: Promise<unknown>): void {
        const held = this.holds.get(col) || [];
        held.push(done.then(noop, noop));
        this.holds.set(col, held);
    }

    /** Waits for what is burning or held in the column now. Later claims do not delay it. */
    settled(col: number): Promise<void> {
        const burnt = this.isBurning(col)
            ? new Promise<void>((open) => this.waiters.push({ col, open }))
            : Promise.resolve();
        return Promise.all([burnt].concat(this.holds.get(col) || [])).then(noop);
    }

    private isBurning(col: number): boolean {
        let found = false;
        this.burning.forEach((burningCol) => {
            found = found || burningCol === col;
        });
        return found;
    }
}
