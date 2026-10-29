import { clipNames, pickVariant, SOUND_IDS, SoundShelf } from '../assets/scripts/view/audio/SoundCatalog';
import { RECIPES } from '../tools/sfx/recipes';

describe('clipNames', () => {
    it('names a single clip after its sound and variants after their order', () => {
        expect(clipNames('land')).toEqual(['land']);
        expect(clipNames('pop')).toEqual(['pop_0', 'pop_1', 'pop_2', 'pop_3', 'pop_4']);
    });

    it('has a recipe in tools/sfx for every clip the game loads', () => {
        SOUND_IDS.forEach((id) => expect(RECIPES[id]).toHaveLength(clipNames(id).length));
    });
});

describe('SoundShelf', () => {
    it('plays nothing until the clip arrives', () => {
        const shelf = new SoundShelf<string>();

        expect(shelf.pick('land', 0)).toBeNull();
        shelf.put('land', 'land.wav');
        expect(shelf.pick('land', 0)).toBe('land.wav');
    });

    it('picks louder variants for stronger requests', () => {
        const shelf = new SoundShelf<string>();
        clipNames('pop').forEach((name) => shelf.put(name, name));

        expect(shelf.pick('pop', 0)).toBe('pop_0');
        expect(shelf.pick('pop', 1)).toBe('pop_4');
    });

    it('lists the clips that never arrived', () => {
        const shelf = new SoundShelf<string>();
        SOUND_IDS.forEach((id) => clipNames(id).forEach((name) => shelf.put(name, name)));
        expect(shelf.missing()).toEqual([]);

        const partial = new SoundShelf<string>();
        partial.put('pop_0', 'pop_0');
        expect(partial.missing()).toContain('pop_4');
        expect(partial.missing()).not.toContain('pop_0');
    });

    it('ignores files it does not expect', () => {
        const shelf = new SoundShelf<string>();
        shelf.put('readme', 'readme');

        expect(shelf.missing()).not.toContain('readme');
        expect(shelf.missing()).toHaveLength(SOUND_IDS.reduce((sum, id) => sum + clipNames(id).length, 0));
    });
});

describe('pickVariant', () => {
    it('splits intensity into equal steps, quietest first', () => {
        expect([0, 0.19, 0.2, 0.5, 0.79, 0.8, 1].map((intensity) => pickVariant(intensity, 5))).toEqual([
            0, 0, 1, 2, 3, 4, 4,
        ]);
    });

    it('clamps intensity outside 0..1 and survives NaN', () => {
        expect(pickVariant(-1, 5)).toBe(0);
        expect(pickVariant(7, 5)).toBe(4);
        expect(pickVariant(NaN, 5)).toBe(0);
    });

    it('always picks the only variant', () => {
        expect(pickVariant(0.7, 1)).toBe(0);
    });
});
