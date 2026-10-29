import { GridPos } from '../../../core/board/GridPos';
import { BlastWave, BurnWave } from '../../../core/burn/BurnResolver';
import { SuperKind } from '../../../core/tiles/SuperKinds';
import { TileStage } from '../TileStage';

/** The look of one explosion. */
export interface BlastLook {
    /**
     * Burns every tile of the wave and resolves when the last one is gone.
     * chain counts the explosions of the burn so far, from 1, so a chain can sound bigger as it goes.
     */
    play(wave: BlastWave, stage: TileStage, chain: number): Promise<void>;
}

/** One look per super tile kind, so a kind without one does not compile. A bomb booster goes off as a bomb. */
export type BlastLooks = Readonly<Record<SuperKind, BlastLook>>;

/** The look of a tapped group. */
export interface GroupLook {
    /** The group earned nothing and pops where it lies. */
    pop(group: BurnWave, stage: TileStage): Promise<void>;
    /** The group earned a super tile and gathers into the cell the tile appears in. */
    collapse(group: BurnWave, into: GridPos, stage: TileStage): Promise<void>;
}
