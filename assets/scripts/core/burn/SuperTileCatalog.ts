import { SuperKind } from '../tiles/Tile';
import { BurnArea } from './BurnArea';

/** Registry of super tile kinds. A new kind is one BurnArea class plus one register() call. */
export class SuperTileCatalog {
    private readonly areas = new Map<SuperKind, BurnArea>();

    register(kind: SuperKind, area: BurnArea): this {
        if (this.areas.has(kind)) {
            throw new Error(`Super tile "${kind}" is already registered`);
        }
        this.areas.set(kind, area);
        return this;
    }

    has(kind: SuperKind): boolean {
        return this.areas.has(kind);
    }

    areaFor(kind: SuperKind): BurnArea {
        const area = this.areas.get(kind);
        if (area === undefined) {
            throw new Error(`Unknown super tile "${kind}"`);
        }
        return area;
    }
}
