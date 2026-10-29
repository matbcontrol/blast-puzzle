import { mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import {
    stableUuid,
    uniformBorder,
    writeAudioMeta,
    writeFolderMeta,
    writeIfChanged,
    writeSpriteMeta,
} from '../tools/shared/cocosMeta';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

interface Meta {
    readonly [key: string]: unknown;
    readonly ver: string;
    readonly subMetas: { readonly [name: string]: { readonly [key: string]: unknown } };
}

const readMeta = (file: string): Meta => JSON.parse(readFileSync(`${file}.meta`, 'utf8')) as Meta;

describe('Cocos meta writer', () => {
    let dir: string;

    beforeEach(() => {
        dir = mkdtempSync(join(tmpdir(), 'cocos-meta-'));
    });

    afterEach(() => {
        rmSync(dir, { recursive: true, force: true });
    });

    it('gives a new asset the same uuid on every fresh run', () => {
        const file = join(dir, 'pop_0.wav');
        const first = writeAudioMeta(file, 0.12);
        rmSync(`${file}.meta`);

        expect(writeAudioMeta(file, 0.12)).toBe(first);
        expect(first).toMatch(UUID);
        expect(stableUuid(join(dir, 'other.wav'))).not.toBe(first);
    });

    it('keeps the uuid and format version the editor wrote', () => {
        const file = join(dir, 'pop_0.wav');
        writeFileSync(`${file}.meta`, JSON.stringify({ ver: '9.9.9', uuid: 'from-editor' }));

        expect(writeAudioMeta(file, 0.12)).toBe('from-editor');
        expect(readMeta(file).ver).toBe('9.9.9');
    });

    it('writes the 2.4.15 versions for a new asset', () => {
        const sprite = join(dir, 'star.png');
        writeSpriteMeta(sprite, 64, 64);
        writeAudioMeta(join(dir, 'pop_0.wav'), 0.12);

        expect(readMeta(sprite).ver).toBe('2.3.7');
        expect(readMeta(sprite).subMetas.star.ver).toBe('1.0.6');
        expect(readMeta(join(dir, 'pop_0.wav')).ver).toBe('2.0.3');
    });

    it('does not touch an unchanged meta, so the editor does not reimport', () => {
        const file = join(dir, 'star.png');
        writeSpriteMeta(file, 64, 64);
        const written = statSync(`${file}.meta`).mtimeMs;

        expect(writeIfChanged(`${file}.meta`, readFileSync(`${file}.meta`))).toBe(false);
        writeSpriteMeta(file, 64, 64);
        expect(statSync(`${file}.meta`).mtimeMs).toBe(written);
    });

    it('keeps the whole image and its nine-slice border when not trimmed', () => {
        const file = join(dir, 'plate.png');
        writeSpriteMeta(file, 96, 64, { border: uniformBorder(24) });
        const frame = readMeta(file).subMetas.plate;

        expect(frame).toMatchObject({ trimType: 'none', offsetX: 0, offsetY: 0, width: 96, height: 64 });
        expect(frame).toMatchObject({ borderTop: 24, borderBottom: 24, borderLeft: 24, borderRight: 24 });
    });

    it('offsets a trimmed frame like the editor, y up', () => {
        const file = join(dir, 'icon.png');
        writeSpriteMeta(file, 112, 112, { trim: { x: 3, y: 4, width: 106, height: 106 } });
        const frame = readMeta(file).subMetas.icon;

        expect(frame).toMatchObject({ trimType: 'auto', trimX: 3, trimY: 4, offsetX: 0, offsetY: -1 });
    });

    it('creates a folder meta once and then leaves it to the editor', () => {
        const folder = join(dir, 'resources');
        const uuid = writeFolderMeta(folder, { name: 'resources', priority: 8 });
        expect(readMeta(folder)).toMatchObject({ uuid, isBundle: true, bundleName: 'resources', priority: 8 });

        writeFileSync(`${folder}.meta`, JSON.stringify({ uuid, edited: true }));
        expect(writeFolderMeta(folder)).toBe(uuid);
        expect(readMeta(folder).edited).toBe(true);
    });
});
