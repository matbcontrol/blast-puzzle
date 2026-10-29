import { Booster } from './Booster';

interface Slot {
    readonly booster: Booster;
    charges: number;
}

export class BoosterInventory {
    private readonly slots = new Map<string, Slot>();

    add(booster: Booster, charges: number): this {
        if (this.slots.has(booster.id)) {
            throw new Error(`Booster "${booster.id}" is already added`);
        }
        this.slots.set(booster.id, { booster, charges });
        return this;
    }

    ids(): string[] {
        const ids: string[] = [];
        this.slots.forEach((_, id) => ids.push(id));
        return ids;
    }

    get(id: string): Booster {
        return this.slot(id).booster;
    }

    chargesOf(id: string): number {
        return this.slot(id).charges;
    }

    spend(id: string): void {
        const slot = this.slot(id);
        if (slot.charges <= 0) {
            throw new Error(`Booster "${id}" has no charges left`);
        }
        slot.charges--;
    }

    private slot(id: string): Slot {
        const slot = this.slots.get(id);
        if (slot === undefined) {
            throw new Error(`Unknown booster "${id}"`);
        }
        return slot;
    }
}
