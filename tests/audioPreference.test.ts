import { KeyValueStore, MutePreference } from '../assets/scripts/view/audio/MutePreference';

class MemoryStore implements KeyValueStore {
    readonly items = new Map<string, string>();

    getItem(key: string): string | null {
        const value = this.items.get(key);
        return value === undefined ? null : value;
    }

    setItem(key: string, value: string): void {
        this.items.set(key, value);
    }
}

/** Like localStorage in a sandboxed iframe or with a full quota. */
const brokenStore: KeyValueStore = {
    getItem: () => {
        throw new Error('SecurityError');
    },
    setItem: () => {
        throw new Error('QuotaExceededError');
    },
};

describe('MutePreference', () => {
    it('starts unmuted on the first visit', () => {
        expect(new MutePreference(new MemoryStore()).load()).toBe(false);
    });

    it('remembers the switch across sessions', () => {
        const store = new MemoryStore();
        new MutePreference(store).save(true);

        expect(new MutePreference(store).load()).toBe(true);

        new MutePreference(store).save(false);
        expect(new MutePreference(store).load()).toBe(false);
    });

    it('works without storage', () => {
        const preference = new MutePreference(null);

        expect(() => preference.save(true)).not.toThrow();
        expect(preference.load()).toBe(false);
    });

    it('swallows storage errors', () => {
        const preference = new MutePreference(brokenStore);

        expect(() => preference.save(true)).not.toThrow();
        expect(preference.load()).toBe(false);
    });
});
