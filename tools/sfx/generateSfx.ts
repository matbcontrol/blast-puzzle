/**
 * Synthesizes every sound effect of the game into assets/sounds as 22 kHz mono WAV, with Cocos metas.
 * No samples and no npm dependencies: recipes.ts is the source of the sounds.
 *
 *   npx tsx tools/sfx/generateSfx.ts
 */
import { mkdirSync } from 'fs';
import { join, resolve } from 'path';
import { SAMPLE_RATE } from './dsp';
import { writeAudioMeta, writeFolderMeta, writeIfChanged } from './cocosMeta';
import { SOUNDS } from './recipes';
import { encodeWav } from './wav';

const OUT_DIR = resolve(__dirname, '../../assets/sounds');
// The whole set ships inside the web build, so it has a budget like the textures.
const BUDGET_KB = 600;

function main(): void {
    mkdirSync(OUT_DIR, { recursive: true });
    writeFolderMeta(OUT_DIR);
    let totalBytes = 0;
    SOUNDS.forEach((sound) => {
        const track = sound.render();
        const wav = encodeWav(track.samples, SAMPLE_RATE);
        const file = join(OUT_DIR, `${sound.name}.wav`);
        const changed = writeIfChanged(file, wav);
        writeAudioMeta(file, track.seconds);
        totalBytes += wav.length;
        const ms = Math.round(track.seconds * 1000);
        console.log(
            `${sound.name.padEnd(12)} ${String(ms).padStart(5)} ms ${kb(wav.length).padStart(8)}${changed ? '' : '  (same)'}`,
        );
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
