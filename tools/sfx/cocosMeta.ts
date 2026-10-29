/**
 * Cocos Creator 2.4 import metadata for generated assets. A uuid that already exists is kept,
 * so scene references survive a regeneration; the editor fills in anything else on import.
 */
import { randomUUID } from 'crypto';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { basename, extname } from 'path';

export interface Rect {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
}

interface MetaJson {
    uuid?: string;
    subMetas?: { [name: string]: { uuid?: string } | undefined };
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

export function writeFolderMeta(folder: string): string {
    const uuid = existingMeta(`${folder}.meta`).uuid || randomUUID();
    writeMeta(`${folder}.meta`, {
        ver: '1.1.3',
        uuid,
        importer: 'folder',
        isBundle: false,
        bundleName: '',
        priority: 1,
        compressionType: {},
        optimizeHotUpdate: {},
        inlineSpriteFrames: {},
        isRemoteBundle: {},
        subMetas: {},
    });
    return uuid;
}

export function writeAudioMeta(file: string, duration: number): string {
    const uuid = existingMeta(`${file}.meta`).uuid || randomUUID();
    writeMeta(`${file}.meta`, {
        ver: '2.0.1',
        uuid,
        importer: 'audio-clip',
        downloadMode: 0,
        duration: Math.round(duration * 1e6) / 1e6,
        subMetas: {},
    });
    return uuid;
}

/** A texture with one sprite frame named after the file, trimmed to its opaque pixels like the editor does. */
export function writeSpriteMeta(
    file: string,
    width: number,
    height: number,
    trim: Rect,
): { texture: string; frame: string } {
    const name = basename(file, extname(file));
    const old = existingMeta(`${file}.meta`);
    const oldFrame = old.subMetas && old.subMetas[name];
    const texture = old.uuid || randomUUID();
    const frame = (oldFrame && oldFrame.uuid) || randomUUID();
    writeMeta(`${file}.meta`, {
        ver: '2.3.7',
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
                ver: '1.0.6',
                uuid: frame,
                importer: 'sprite-frame',
                rawTextureUuid: texture,
                trimType: 'auto',
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
                borderTop: 0,
                borderBottom: 0,
                borderLeft: 0,
                borderRight: 0,
                subMetas: {},
            },
        },
    });
    return { texture, frame };
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
