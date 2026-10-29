/**
 * Synthesizes every sound effect of the game into assets/resources/sounds as 22 kHz mono WAV, with Cocos metas.
 * No samples and no npm dependencies: recipes.ts is the source of the sounds.
 *
 *   npm run sfx
 */
import { mkdirSync } from 'fs';
import { join, resolve } from 'path';
import { clipNames, SOUND_DIR, SOUND_IDS } from '../../assets/scripts/view/audio/SoundCatalog';
import { writeAudioMeta, writeFolderMeta, writeIfChanged } from '../shared/cocosMeta';
import { SAMPLE_RATE } from './dsp';
import { RECIPES } from './recipes';
import { encodeWav } from './wav';

const RESOURCES_DIR = resolve(__dirname, '../../assets/resources');
const OUT_DIR = join(RESOURCES_DIR, SOUND_DIR);
// The engine names this bundle and loads its index before the game starts.
const RESOURCES_BUNDLE = { name: 'resources', priority: 8 };
// Loaded after the first frame, but still downloaded by every player.
const BUDGET_KB = 600;

function main(): void {
    mkdirSync(OUT_DIR, { recursive: true });
    writeFolderMeta(RESOURCES_DIR, RESOURCES_BUNDLE);
    writeFolderMeta(OUT_DIR);
    let totalBytes = 0;
    SOUND_IDS.forEach((id) => {
        const names = clipNames(id);
        const recipes = RECIPES[id];
        if (recipes.length !== names.length) {
            throw new Error(`${id}: ${recipes.length} recipes for ${names.length} clips in SOUND_VARIANTS`);
        }
        names.forEach((name, i) => {
            const track = recipes[i]();
            const wav = encodeWav(track.samples, SAMPLE_RATE);
            const file = join(OUT_DIR, `${name}.wav`);
            const changed = writeIfChanged(file, wav);
            writeAudioMeta(file, track.seconds);
            totalBytes += wav.length;
            const ms = Math.round(track.seconds * 1000);
            console.log(
                `${name.padEnd(12)} ${String(ms).padStart(5)} ms ${kb(wav.length).padStart(8)}${changed ? '' : '  (same)'}`,
            );
        });
    });
    console.log(`${'total'.padEnd(18)} ${kb(totalBytes).padStart(10)} of ${BUDGET_KB} KB`);
    if (totalBytes > BUDGET_KB * 1024) {
        console.error('Over budget: shorten the tails or drop variants.');
        process.exitCode = 1;
    }
}

function kb(bytes: number): string {
    return `${(bytes / 1024).toFixed(1)} KB`;
}

main();
