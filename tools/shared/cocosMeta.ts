/**
 * Cocos Creator 2.4 import settings for generated assets. What the editor already wrote is kept: uuids,
 * so scene references survive a regeneration, and format versions, so the editor does not upgrade the
 * file again. A new asset gets a uuid derived from its path, so two fresh runs agree.
 */
import { createHash } from 'crypto';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { basename, extname, relative, resolve } from 'path';

const PROJECT_ROOT = resolve(__dirname, '../..');

/** The format versions the 2.4.15 editor writes. */
const VERSION = {
    folder: '1.1.3',
    texture: '2.3.7',
    spriteFrame: '1.0.6',
    audioClip: '2.0.3',
};

export interface Rect {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
}

/** Nine-slice insets in pixels. */
export interface Border {
    readonly top: number;
    readonly bottom: number;
    readonly left: number;
    readonly right: number;
}

export const NO_BORDER: Border = { top: 0, bottom: 0, left: 0, right: 0 };

export const uniformBorder = (inset: number): Border => ({ top: inset, bottom: inset, left: inset, right: inset });

export interface SpriteOptions {
    /** The pixels the editor's automatic trim would keep. Without it the frame is the whole image. */
    readonly trim?: Rect;
    readonly border?: Border;
}

export interface SpriteIds {
    readonly texture: string;
    readonly frame: string;
}

/** A bundle the folder declares, like assets/resources. */
export interface BundleSpec {
    readonly name: string;
    readonly priority: number;
}

interface MetaJson {
    ver?: string;
    uuid?: string;
    subMetas?: { [name: string]: MetaJson | undefined };
}

/** Writes only when the bytes differ, so the editor does not reimport an unchanged asset. */
export function writeIfChanged(path: string, data: Buffer | string): boolean {
    const bytes = typeof data === 'string' ? Buffer.from(data) : data;
    if (existsSync(path) && readFileSync(path).equals(bytes)) {
        return false;
    }
    writeFileSync(path, bytes);
    return true;
}

/** Only creates the meta: after that the editor owns it, with bundle and per-platform options. */
export function writeFolderMeta(folder: string, bundle?: BundleSpec): string {
    const path = `${folder}.meta`;
    const old = existingMeta(path);
    if (old.uuid) {
        return old.uuid;
    }
    const uuid = stableUuid(folder);
    writeMeta(path, {
        ver: VERSION.folder,
        uuid,
        importer: 'folder',
        isBundle: bundle !== undefined,
        bundleName: bundle !== undefined ? bundle.name : '',
        priority: bundle !== undefined ? bundle.priority : 1,
        compressionType: {},
        optimizeHotUpdate: {},
        inlineSpriteFrames: {},
        isRemoteBundle: {},
        subMetas: {},
    });
    return uuid;
}

export function writeAudioMeta(file: string, durationSeconds: number): string {
    const old = existingMeta(`${file}.meta`);
    const uuid = old.uuid || stableUuid(file);
    writeMeta(`${file}.meta`, {
        ver: old.ver || VERSION.audioClip,
        uuid,
        importer: 'audio-clip',
        downloadMode: 0,
        duration: Math.round(durationSeconds * 1e6) / 1e6,
        subMetas: {},
    });
    return uuid;
}

/** A texture with one sprite frame named after the file. */
export function writeSpriteMeta(file: string, width: number, height: number, options: SpriteOptions = {}): SpriteIds {
    const name = basename(file, extname(file));
    const old = existingMeta(`${file}.meta`);
    const oldFrame = (old.subMetas && old.subMetas[name]) || {};
    const texture = old.uuid || stableUuid(file);
    const frame = oldFrame.uuid || stableUuid(`${file}/${name}`);
    const trim = options.trim || { x: 0, y: 0, width, height };
    const border = options.border || NO_BORDER;
    writeMeta(`${file}.meta`, {
        ver: old.ver || VERSION.texture,
        uuid: texture,
        importer: 'texture',
        type: 'sprite',
        wrapMode: 'clamp',
        filterMode: 'bilinear',
        premultiplyAlpha: false,
        genMipmaps: false,
        packable: true,
        width,
        height,
        platformSettings: {},
        subMetas: {
            [name]: {
                ver: oldFrame.ver || VERSION.spriteFrame,
                uuid: frame,
                importer: 'sprite-frame',
                rawTextureUuid: texture,
                trimType: options.trim ? 'auto' : 'none',
                trimThreshold: 1,
                rotated: false,
                offsetX: trim.x + trim.width / 2 - width / 2,
                offsetY: height / 2 - (trim.y + trim.height / 2),
                trimX: trim.x,
                trimY: trim.y,
                width: trim.width,
                height: trim.height,
                rawWidth: width,
                rawHeight: height,
                borderTop: border.top,
                borderBottom: border.bottom,
                borderLeft: border.left,
                borderRight: border.right,
                subMetas: {},
            },
        },
    });
    return { texture, frame };
}

/** A version 4 uuid made from the project-relative path instead of random bytes. */
export function stableUuid(path: string): string {
    const key = relative(PROJECT_ROOT, resolve(path)).split('\\').join('/');
    const hex = createHash('md5').update(`blast-puzzle/${key}`).digest('hex').split('');
    hex[12] = '4';
    hex[16] = ((parseInt(hex[16], 16) & 0x3) | 0x8).toString(16);
    const s = hex.join('');
    return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20)}`;
}

function existingMeta(path: string): MetaJson {
    if (!existsSync(path)) {
        return {};
    }
    try {
        return JSON.parse(readFileSync(path, 'utf8')) as MetaJson;
    } catch {
        return {};
    }
}

function writeMeta(path: string, meta: object): void {
    writeIfChanged(path, JSON.stringify(meta, null, 2));
}
