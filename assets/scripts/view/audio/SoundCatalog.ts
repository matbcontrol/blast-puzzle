import { SoundId } from './SoundPlayer';

/** The clips load from assets/resources/<SOUND_DIR>; tools/sfx writes them there. */
export const SOUND_DIR = 'sounds';

/**
 * How many clips each sound has. A single clip is named after its sound; variants are <id>_0, <id>_1...,
 * quietest first, and the intensity of a request picks among them.
 */
export const SOUND_VARIANTS: { readonly [id in SoundId]: number } = {
    pop: 5,
    land: 1,
    swap: 1,
    shuffle: 1,
    superCreate: 1,
    rocket: 1,
    bomb: 1,
    field: 1,
    reject: 1,
    select: 1,
    click: 1,
    win: 1,
    lose: 1,
};

export const SOUND_IDS = Object.keys(SOUND_VARIANTS) as ReadonlyArray<SoundId>;

// Built once: a cascade asks for a clip per burnt tile.
const CLIP_NAMES = SOUND_IDS.reduce<{ [id: string]: ReadonlyArray<string> }>((names, id) => {
    const count = SOUND_VARIANTS[id];
    names[id] = count === 1 ? [id] : Array.from({ length: count }, (_, i) => `${id}_${i}`);
    return names;
}, {});

/** File names without extension, quietest variant first. */
export function clipNames(id: SoundId): ReadonlyArray<string> {
    return CLIP_NAMES[id];
}

/** Maps intensity 0..1 onto one of `count` variants in equal steps, quietest first. */
export function pickVariant(intensity: number, count: number): number {
    if (!(intensity > 0)) {
        return 0;
    }
    return Math.min(count - 1, Math.floor(Math.min(intensity, 1) * count));
}

/** The clips that have arrived, by file name. A sound whose clip is not in yet plays nothing. */
export class SoundShelf<Clip> {
    private readonly clips = new Map<string, Clip>();

    put(name: string, clip: Clip): void {
        this.clips.set(name, clip);
    }

    pick(id: SoundId, intensity: number): Clip | null {
        const names = clipNames(id);
        const clip = this.clips.get(names[pickVariant(intensity, names.length)]);
        return clip === undefined ? null : clip;
    }

    /** Expected clips that are not on the shelf. */
    missing(): string[] {
        const expected = SOUND_IDS.reduce<string[]>((names, id) => names.concat(clipNames(id)), []);
        return expected.filter((name) => !this.clips.has(name));
    }
}
