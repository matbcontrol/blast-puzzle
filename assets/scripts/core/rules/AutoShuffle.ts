import { Board } from '../board/Board';
import { TileMove } from '../board/Gravity';
import { Shuffler } from '../board/Shuffler';

/** Rescues a dead board, but only `limit` times per level. After that a dead board loses the game. */
export class AutoShuffle {
    private used = 0;

    constructor(
        private readonly shuffler: Shuffler,
        private readonly limit: number,
    ) {}

    get remaining(): number {
        return this.limit - this.used;
    }

    tryShuffle(board: Board): TileMove[] | null {
        if (this.remaining <= 0) {
            return null;
        }
        this.used++;
        return this.shuffler.shuffle(board);
    }
}
