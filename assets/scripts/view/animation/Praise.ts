import { SuperKind } from '../../core/tiles/SuperKinds';
import { Texts } from '../Texts';

/**
 * When the board praises the player. Every rule keys on what the model reported, never on a copy of the level's
 * numbers, and praise is kept for the big moments: a word on every rocket would turn into clutter by turn five.
 */

/** Said as a tapped group's super tile appears. */
const EARNED: Readonly<Record<SuperKind, string | null>> = {
    row: null,
    column: null,
    bomb: Texts.praise.great,
    field: Texts.praise.awesome,
};

/** Said as an explosion of this kind goes off: the whole field going is a moment of its own. */
const BLASTED: Readonly<Record<SuperKind, string | null>> = {
    row: null,
    column: null,
    bomb: null,
    field: Texts.praise.incredible,
};

/** By the explosions a burn has set off so far, from the first: a chain is the high point of a turn. */
const CHAIN: ReadonlyArray<string | null> = [null, Texts.praise.great, Texts.praise.awesome];

export function earnedPraise(kind: SuperKind): string | null {
    return EARNED[kind];
}

/** The word to say as explosion `index` of a burn goes off, or null. Nothing tops a field, so it ends the praise. */
export function blastPraise(blasts: ReadonlyArray<SuperKind>, index: number): string | null {
    for (let i = 0; i < index; i++) {
        if (BLASTED[blasts[i]] !== null) {
            return null;
        }
    }
    const own = BLASTED[blasts[index]];
    if (own !== null) {
        return own;
    }
    return index < CHAIN.length ? CHAIN[index] : null;
}
