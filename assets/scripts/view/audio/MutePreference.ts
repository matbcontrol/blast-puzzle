/** The part of Web Storage the preference uses; cc.sys.localStorage fits. */
export interface KeyValueStore {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
}

const MUTED_KEY = 'blast-puzzle.muted';

/**
 * Remembers the mute switch between sessions. Storage can be missing or throw
 * (private mode, blocked cookies, full quota); then the switch only lasts for this session.
 */
export class MutePreference {
    constructor(private readonly store: KeyValueStore | null) {}

    load(): boolean {
        try {
            return this.store !== null && this.store.getItem(MUTED_KEY) === '1';
        } catch {
            return false;
        }
    }

    save(muted: boolean): void {
        try {
            if (this.store !== null) {
                this.store.setItem(MUTED_KEY, muted ? '1' : '0');
            }
        } catch {
            // Not remembered, still applied.
        }
    }
}
