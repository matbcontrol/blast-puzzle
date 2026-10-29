import { SuperKind } from '../tiles/SuperKinds';
import { BurnArea } from './BurnArea';

/** The area of every super tile kind. A full record, so a new kind in SuperKinds does not compile without one. */
export class SuperTileCatalog {
    constructor(private readonly areas: Readonly<Record<SuperKind, BurnArea>>) {}

    areaFor(kind: SuperKind): BurnArea {
        return this.areas[kind];
    }
}
