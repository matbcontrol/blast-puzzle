/**
 * Draws the effect textures into assets/textures/fx: white and grayscale, so the game tints them,
 * antialiased by supersampling. Also writes their Cocos import settings: no trimming, so a particle
 * scales around its center, and nine-slice borders for the flash panel.
 *
 *   npx tsx tools/art/generateFx.ts
 */
import { createHash } from 'crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { FX_TEXTURES, FxTextureName, PANEL_BORDER, RING_RADIUS } from '../../assets/scripts/view/fx/FxArt';
import { encodePng } from './png';

/** alpha and light 0..1. Light is the gray level, it shades the tint. */
interface Texel {
    alpha: number;
    light: number;
}

/** x, y in pixels from the top left corner of the image. */
type Shape = (x: number, y: number) => Texel;

interface Vec {
    x: number;
    y: number;
}

const SUPERSAMPLING = 4;
const OUT_DIR = join(__dirname, '../../assets/textures/fx');

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smoothstep = (edge0: number, edge1: number, v: number) => {
    const t = clamp01((v - edge0) / (edge1 - edge0));
    return t * t * (3 - 2 * t);
};
const solid = (alpha: number): Texel => ({ alpha: clamp01(alpha), light: 1 });

/** Averages light weighted by alpha: the edge of a shape keeps its own gray instead of darkening toward empty. */
function rasterize(width: number, height: number, shape: Shape): Uint8Array {
    const out = new Uint8Array(width * height * 4);
    const samples = SUPERSAMPLING * SUPERSAMPLING;
    for (let py = 0; py < height; py++) {
        for (let px = 0; px < width; px++) {
            let alpha = 0;
            let light = 0;
            for (let sy = 0; sy < SUPERSAMPLING; sy++) {
                for (let sx = 0; sx < SUPERSAMPLING; sx++) {
                    const texel = shape(px + (sx + 0.5) / SUPERSAMPLING, py + (sy + 0.5) / SUPERSAMPLING);
                    alpha += texel.alpha;
                    light += texel.alpha * texel.light;
                }
            }
            // Fully transparent pixels stay white, so bilinear filtering does not pull dark fringes into the tint.
            const gray = alpha > 0 ? light / alpha : 1;
            const i = (py * width + px) * 4;
            out[i] = out[i + 1] = out[i + 2] = Math.round(gray * 255);
            out[i + 3] = Math.round((alpha / samples) * 255);
        }
    }
    return out;
}

/** Gaussian falloff pulled down to exactly zero at the edge, so the square never shows. */
function glow(size: number): Shape {
    const c = size / 2;
    const k = 5;
    const floor = Math.exp(-k);
    return (x, y) => {
        const r = Math.hypot(x - c, y - c) / c;
        return solid(r >= 1 ? 0 : (Math.exp(-k * r * r) - floor) / (1 - floor));
    };
}

/** Four long rays thinning toward the tips, four short diagonal glints and a hot core. */
function sparkle(size: number): Shape {
    const c = size / 2;
    const ray = (along: number, across: number, length: number) => {
        const rest = 1 - Math.abs(along) / length;
        if (rest <= 0) {
            return 0;
        }
        const halfWidth = 0.02 + 0.1 * Math.pow(rest, 1.5);
        return Math.pow(rest, 1.2) * Math.exp(-(across / halfWidth) * (across / halfWidth));
    };
    return (x, y) => {
        const nx = (x - c) / c;
        const ny = (y - c) / c;
        const dx = (nx + ny) * Math.SQRT1_2;
        const dy = (nx - ny) * Math.SQRT1_2;
        const star = Math.max(ray(nx, ny, 1), ray(ny, nx, 1));
        const glints = 0.45 * Math.max(ray(dx, dy, 0.5), ray(dy, dx, 0.5));
        const r2 = nx * nx + ny * ny;
        const core = Math.exp(-r2 * 40) + 0.25 * Math.exp(-r2 * 8) * clamp01(1 - r2);
        return solid(star + glints + core);
    };
}

function signedArea(poly: Vec[]): number {
    let sum = 0;
    for (let i = 0; i < poly.length; i++) {
        const a = poly[i];
        const b = poly[(i + 1) % poly.length];
        sum += a.x * b.y - b.x * a.y;
    }
    return sum / 2;
}

/** Moves every edge of a convex polygon inward by d. */
function inset(poly: Vec[], d: number): Vec[] {
    const sign = signedArea(poly) > 0 ? 1 : -1;
    const lines = poly.map((a, i) => {
        const b = poly[(i + 1) % poly.length];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const len = Math.hypot(dx, dy);
        const nx = (-dy / len) * sign;
        const ny = (dx / len) * sign;
        return { x: a.x + nx * d, y: a.y + ny * d, dx, dy };
    });
    return lines.map((line, i) => {
        const prev = lines[(i + lines.length - 1) % lines.length];
        const cross = prev.dx * line.dy - prev.dy * line.dx;
        const t = ((line.x - prev.x) * line.dy - (line.y - prev.y) * line.dx) / cross;
        return { x: prev.x + prev.dx * t, y: prev.y + prev.dy * t };
    });
}

/** Signed distance to a polygon, negative inside (after Inigo Quilez). */
function polygonDistance(x: number, y: number, poly: Vec[]): number {
    let best = (x - poly[0].x) * (x - poly[0].x) + (y - poly[0].y) * (y - poly[0].y);
    let sign = 1;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i, i++) {
        const ex = poly[j].x - poly[i].x;
        const ey = poly[j].y - poly[i].y;
        const wx = x - poly[i].x;
        const wy = y - poly[i].y;
        const t = clamp01((wx * ex + wy * ey) / (ex * ex + ey * ey));
        const bx = wx - ex * t;
        const by = wy - ey * t;
        best = Math.min(best, bx * bx + by * by);
        const c1 = y >= poly[i].y;
        const c2 = y < poly[j].y;
        const c3 = ex * wy > ey * wx;
        if ((c1 && c2 && c3) || (!c1 && !c2 && !c3)) {
            sign = -sign;
        }
    }
    return sign * Math.sqrt(best);
}

/**
 * An irregular chip with rounded corners. The rim facing up-left is lighter and the rest darker,
 * so a flat tint reads as a beveled piece of the tile.
 */
function shard(): Shape {
    const outline: Vec[] = [
        { x: 5, y: 11 },
        { x: 17, y: 3 },
        { x: 28, y: 9 },
        { x: 26, y: 25 },
        { x: 11, y: 29 },
    ];
    const corner = 2.5;
    const core = inset(outline, corner);
    const rim = 3;
    const lightX = -Math.SQRT1_2;
    const lightY = -Math.SQRT1_2;
    return (x, y) => {
        const d = polygonDistance(x, y, core) - corner;
        if (d > 0) {
            return { alpha: 0, light: 1 };
        }
        if (d < -rim) {
            return { alpha: 1, light: 0.9 - 0.12 * ((x + y) / 64) };
        }
        // Gradient of the distance field is the outward normal of the nearest edge.
        const e = 0.01;
        const nx = polygonDistance(x + e, y, core) - polygonDistance(x - e, y, core);
        const ny = polygonDistance(x, y + e, core) - polygonDistance(x, y - e, core);
        const len = Math.hypot(nx, ny) || 1;
        const facing = (nx * lightX + ny * lightY) / len;
        return { alpha: 1, light: 0.8 + 0.2 * facing };
    };
}

/** A thin soft line with a faint haze inside it: scaled up, the haze reads as the air pushed by the blast. */
function ring(size: number): Shape {
    const c = size / 2;
    const sigma = 3.4;
    return (x, y) => {
        const d = Math.hypot(x - c, y - c);
        const offset = (d - RING_RADIUS) / sigma;
        const line = Math.exp(-offset * offset);
        const haze = d < RING_RADIUS ? 0.16 * smoothstep(RING_RADIUS * 0.3, RING_RADIUS, d) : 0;
        return solid(line + haze);
    };
}

function roundedRectDistance(x: number, y: number, cx: number, cy: number, hw: number, hh: number, r: number) {
    const qx = Math.abs(x - cx) - (hw - r);
    const qy = Math.abs(y - cy) - (hh - r);
    return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
}

/** A paper strip, a little darker at the bottom, so it shows a fold as it flips. */
function confetti(width: number, height: number): Shape {
    return (x, y) => {
        const inside = roundedRectDistance(x, y, width / 2, height / 2, width / 2 - 2, height / 2 - 2, 2.5) <= 0;
        return { alpha: inside ? 1 : 0, light: 1 - 0.18 * (y / height) };
    };
}

/** Bright round head on the right, thinning and fading to nothing on the left. */
function streak(width: number, height: number): Shape {
    const cy = height / 2;
    const headRadius = cy - 2;
    const headX = width - headRadius - 1;
    return (x, y) => {
        const dy = Math.abs(y - cy);
        if (x > headX) {
            return solid(smoothstep(headRadius, headRadius - 2, Math.hypot(x - headX, dy)));
        }
        // Reaches the head radius exactly where the head starts, so the outline has no step.
        const t = x / headX;
        const halfWidth = 0.8 + (headRadius - 0.8) * Math.pow(t, 0.75);
        return solid(smoothstep(halfWidth, halfWidth - 2, dy) * Math.pow(t, 1.5));
    };
}

/** Solid white with round corners. The corners sit inside the nine-slice border, the middle stretches. */
function panel(width: number, height: number): Shape {
    return (x, y) => {
        const d = roundedRectDistance(x, y, width / 2, height / 2, width / 2 - 0.5, height / 2 - 0.5, PANEL_BORDER - 1);
        return solid(d <= 0 ? 1 : 0);
    };
}

const SHAPES: { [K in FxTextureName]: Shape } = {
    glow: glow(FX_TEXTURES.glow.width),
    sparkle: sparkle(FX_TEXTURES.sparkle.width),
    shard: shard(),
    ring: ring(FX_TEXTURES.ring.width),
    confetti: confetti(FX_TEXTURES.confetti.width, FX_TEXTURES.confetti.height),
    streak: streak(FX_TEXTURES.streak.width, FX_TEXTURES.streak.height),
    panel: panel(FX_TEXTURES.panel.width, FX_TEXTURES.panel.height),
};

const BORDERS: { [K in FxTextureName]?: number } = { panel: PANEL_BORDER };

interface TextureMeta {
    uuid: string;
    subMetas: { [name: string]: { uuid: string } };
}

/** Stable across runs, so regenerating the art does not break references in the scene. */
function uuidFor(key: string): string {
    const hex = createHash('md5').update(`blast-puzzle/textures/fx/${key}`).digest('hex').split('');
    hex[12] = '4';
    hex[16] = ((parseInt(hex[16], 16) & 0x3) | 0x8).toString(16);
    const s = hex.join('');
    return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20)}`;
}

/** Keeps the uuids of an existing meta, the editor may already have handed them out. */
function writeTextureMeta(path: string, name: string, width: number, height: number, border: number): void {
    const old = existsSync(path) ? (JSON.parse(readFileSync(path, 'utf8')) as TextureMeta) : null;
    const textureUuid = old !== null ? old.uuid : uuidFor(name);
    const oldFrame = old !== null ? old.subMetas[name] : undefined;
    const frameUuid = oldFrame !== undefined ? oldFrame.uuid : uuidFor(`${name}/frame`);
    const meta = {
        ver: '2.3.7',
        uuid: textureUuid,
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
                uuid: frameUuid,
                importer: 'sprite-frame',
                rawTextureUuid: textureUuid,
                trimType: 'none',
                trimThreshold: 1,
                rotated: false,
                offsetX: 0,
                offsetY: 0,
                trimX: 0,
                trimY: 0,
                width,
                height,
                rawWidth: width,
                rawHeight: height,
                borderTop: border,
                borderBottom: border,
                borderLeft: border,
                borderRight: border,
                subMetas: {},
            },
        },
    };
    writeFileSync(path, JSON.stringify(meta, null, 2));
}

function writeFolderMeta(dir: string): void {
    const path = `${dir}.meta`;
    if (existsSync(path)) {
        return;
    }
    const meta = {
        ver: '1.1.3',
        uuid: uuidFor('folder'),
        importer: 'folder',
        isBundle: false,
        bundleName: '',
        priority: 1,
        compressionType: {},
        optimizeHotUpdate: {},
        inlineSpriteFrames: {},
        isRemoteBundle: {},
        subMetas: {},
    };
    writeFileSync(path, JSON.stringify(meta, null, 2));
}

function main(): void {
    mkdirSync(OUT_DIR, { recursive: true });
    writeFolderMeta(OUT_DIR);
    (Object.keys(SHAPES) as FxTextureName[]).forEach((key) => {
        const { width, height } = FX_TEXTURES[key];
        const name = `fx_${key}`;
        const file = join(OUT_DIR, `${name}.png`);
        // The meta goes first: an editor that notices the image picks up these settings, not its defaults.
        writeTextureMeta(`${file}.meta`, name, width, height, BORDERS[key] || 0);
        const png = encodePng(width, height, rasterize(width, height, SHAPES[key]));
        writeFileSync(file, png);
        console.log(`${name}.png  ${width}x${height}  ${png.length} bytes`);
    });
}

main();
