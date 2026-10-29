import { SpawnedTile } from '../board/BoardFiller';
import { TileMove } from '../board/Gravity';
import { GridPos } from '../board/GridPos';
import { BlastWave, BurnWave } from '../burn/BurnResolver';
import { Tile } from '../tiles/Tile';

/** What happened during a turn, in order. The view replays these steps as animations. */
export type TurnStep = BurnStep | SuperCreatedStep | BonusSuperStep | SwapStep | FallStep | RefillStep | ShuffleStep;

/** What a PlayerAction reports. The game prices the burns and adds the rest of the turn. */
export type ActionStep = BurnOutcome | SuperCreatedStep | BonusSuperStep | SwapStep;

/** `cause` tells whether a tapped group or an explosion started the burn. */
export type BurnOutcome = GroupBurn | BlastBurn;

/** The player tapped a same-color group. A group holds no super tiles, so nothing else goes off. */
export interface GroupBurn {
    readonly type: 'burn';
    readonly cause: 'group';
    /** Its origin is the tapped cell. */
    readonly group: BurnWave;
    /** Where the group gathers when it earned a super tile. The superCreated step that follows puts the tile there. */
    readonly collapseTo: GridPos | null;
}

/** An explosion and every super tile it set off, in the order they went off. */
export interface BlastBurn {
    readonly type: 'burn';
    readonly cause: 'blast';
    readonly waves: ReadonlyArray<BlastWave>;
}

export interface BurnPoints {
    /** Exactly what the burn added to the score. */
    readonly points: number;
}

export type BurnStep = BurnOutcome & BurnPoints;

/** The super tile a tapped group earned, in the cell the group gathered into. */
export interface SuperCreatedStep {
    readonly type: 'superCreated';
    readonly tile: Tile;
    readonly at: GridPos;
}

/** A move left after the win turned a regular tile into a super tile. The burn that follows fires it. */
export interface BonusSuperStep {
    readonly type: 'bonusSuper';
    readonly replaced: Tile;
    readonly tile: Tile;
    readonly at: GridPos;
}

export interface SwapStep {
    readonly type: 'swap';
    readonly moves: ReadonlyArray<TileMove>;
}

export interface FallStep {
    readonly type: 'fall';
    readonly moves: ReadonlyArray<TileMove>;
}

export interface RefillStep {
    readonly type: 'refill';
    readonly tiles: ReadonlyArray<SpawnedTile>;
}

/** A shuffle deals every tile anew, so it lists all of them, also a tile dealt back into its own cell. */
export interface ShuffleStep {
    readonly type: 'shuffle';
    readonly moves: ReadonlyArray<TileMove>;
}
