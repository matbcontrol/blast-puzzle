/**
 * Draws the sound toggle icons into assets/textures/ui: a white speaker on the glossy magenta disc
 * of the booster buttons, with waves when sound is on and a cross when it is off.
 *
 *   npx tsx tools/sfx/icons.ts
 */
import { mkdirSync } from 'fs';
import { join, resolve } from 'path';
import { Rect, writeFolderMeta, writeIfChanged, writeSpriteMeta } from './cocosMeta';
import { encodePng } from './png';

const OUT_DIR = resolve(__dirname, '../../assets/textures/ui');
// Small enough for the dynamic atlas, so the button batches with the rest of the HUD.
const SIZE = 112;
const SUPERSAMPLE = 4;

const CENTER_X = SIZE / 2;
const CENTER_Y = SIZE / 2 - 2;
const RADIUS = 50;
const RIM = 4;

interface Rgba {
    readonly r: number;
    readonly g: number;
    readonly b: number;
    /** 0..1 */
    readonly a: number;
}

const rgb = (hex: number, a = 1): Rgba => ({ r: (hex >> 16) & 255, g: (hex >> 8) & 255, b: hex & 255, a });

// The booster button palette: magenta to violet, with a light pink rim.
const COLORS = {
    shadow: rgb(0x28003c, 0.45),
    rimTop: rgb(0xffa6ff),
    rimBottom: rgb(0xd54df0),
    bodyTop: rgb(0xc21ad6),
    bodyBottom: rgb(0x7b0a9e),
    glossTop: rgb(0xffffff, 0.5),
    glossBottom: rgb(0xffffff, 0),
    glyph: rgb(0xffffff),
    glyphShadow: rgb(0x4a0064, 0.55),
};

/** Is this point inside? Coverage comes from supersampling these tests. */
type Shape = (x: number, y: number) => boolean;
type Paint = (x: number, y: number) => Rgba;
type Coverage = (px: number, py: number) => number;

class Canvas {
    // Premultiplied, so layers blend without dark fringes.
    private readonly pixels: Float64Array;

    constructor(
        readonly width: number,
        readonly height: number,
    ) {
        this.pixels = new Float64Array(width * height * 4);
    }

    /** Source-over: `paint` wherever `coverage` says, on top of what is there. */
    draw(coverage: Coverage, paint: Paint): void {
        for (let py = 0; py < this.height; py++) {
            for (let px = 0; px < this.width; px++) {
                const cover = coverage(px, py);
                if (cover <= 0) {
                    continue;
                }
                const color = paint(px + 0.5, py + 0.5);
                const alpha = color.a * cover;
                const o = (py * this.width + px) * 4;
                const keep = 1 - alpha;
                this.pixels[o] = color.r * alpha + this.pixels[o] * keep;
                this.pixels[o + 1] = color.g * alpha + this.pixels[o + 1] * keep;
                this.pixels[o + 2] = color.b * alpha + this.pixels[o + 2] * keep;
                this.pixels[o + 3] = alpha + this.pixels[o + 3] * keep;
            }
        }
    }

    toRgba8(): Uint8Array {
        const out = new Uint8Array(this.width * this.height * 4);
        for (let o = 0; o < out.length; o += 4) {
            const alpha = this.pixels[o + 3];
            if (alpha > 0) {
                out[o] = Math.round(this.pixels[o] / alpha);
                out[o + 1] = Math.round(this.pixels[o + 1] / alpha);
                out[o + 2] = Math.round(this.pixels[o + 2] / alpha);
                out[o + 3] = Math.round(alpha * 255);
            }
        }
        return out;
    }
}

const covered =
    (shape: Shape): Coverage =>
    (px, py) => {
        let inside = 0;
        for (let sy = 0; sy < SUPERSAMPLE; sy++) {
            for (let sx = 0; sx < SUPERSAMPLE; sx++) {
                if (shape(px + (sx + 0.5) / SUPERSAMPLE, py + (sy + 0.5) / SUPERSAMPLE)) {
                    inside++;
                }
            }
        }
        return inside / (SUPERSAMPLE * SUPERSAMPLE);
    };

/** A disc whose edge fades over `blur` pixels: the drop shadow. */
const softDisc =
    (cx: number, cy: number, r: number, blur: number): Coverage =>
    (px, py) => {
        const d = Math.hypot(px + 0.5 - cx, py + 0.5 - cy);
        const t = Math.min(1, Math.max(0, (r + blur / 2 - d) / blur));
        return t * t * (3 - 2 * t);
    };

const disc =
    (cx: number, cy: number, r: number): Shape =>
    (x, y) =>
        (x - cx) * (x - cx) + (y - cy) * (y - cy) <= r * r;

const ellipse =
    (cx: number, cy: number, rx: number, ry: number): Shape =>
    (x, y) =>
        Math.pow((x - cx) / rx, 2) + Math.pow((y - cy) / ry, 2) <= 1;

/** A thick line with round ends. */
const capsule =
    (x1: number, y1: number, x2: number, y2: number, r: number): Shape =>
    (x, y) => {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const t = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy)));
        return Math.hypot(x - (x1 + t * dx), y - (y1 + t * dy)) <= r;
    };

/** An arc stroke around (cx, cy) opening to the right, `spread` radians each way, with round ends. */
const arc = (cx: number, cy: number, radius: number, thickness: number, spread: number): Shape => {
    const half = thickness / 2;
    const endX = cx + radius * Math.cos(spread);
    const endY = radius * Math.sin(spread);
    return union(
        (x, y) =>
            Math.abs(Math.hypot(x - cx, y - cy) - radius) <= half && Math.abs(Math.atan2(y - cy, x - cx)) <= spread,
        disc(endX, cy - endY, half),
        disc(endX, cy + endY, half),
    );
};

const roundedRect =
    (x: number, y: number, width: number, height: number, r: number): Shape =>
    (px, py) => {
        const dx = Math.max(x + r - px, 0, px - (x + width - r));
        const dy = Math.max(y + r - py, 0, py - (y + height - r));
        return dx * dx + dy * dy <= r * r;
    };

/** Convex polygon, points clockwise on screen. */
const polygon =
    (points: ReadonlyArray<readonly [number, number]>): Shape =>
    (x, y) =>
        points.every(([x1, y1], i) => {
            const [x2, y2] = points[(i + 1) % points.length];
            return (x2 - x1) * (y - y1) - (y2 - y1) * (x - x1) >= 0;
        });

function union(...shapes: Shape[]): Shape {
    return (x, y) => shapes.some((shape) => shape(x, y));
}

function intersection(...shapes: Shape[]): Shape {
    return (x, y) => shapes.every((shape) => shape(x, y));
}

function moved(shape: Shape, dx: number, dy: number): Shape {
    return (x, y) => shape(x - dx, y - dy);
}

const solid =
    (color: Rgba): Paint =>
    () =>
        color;

const vertical =
    (top: number, bottom: number, from: Rgba, to: Rgba): Paint =>
    (_x, y) => {
        const t = Math.min(1, Math.max(0, (y - top) / (bottom - top)));
        const mix = (a: number, b: number): number => a + (b - a) * t;
        return { r: mix(from.r, to.r), g: mix(from.g, to.g), b: mix(from.b, to.b), a: mix(from.a, to.a) };
    };

// The speaker sits a little left of centre, so it stays put while the waves and the cross swap beside it.
const GLYPH_X = CENTER_X - 2;
const SPEAKER = union(
    roundedRect(GLYPH_X - 22, CENTER_Y - 8, 11, 16, 2.5),
    polygon([
        [GLYPH_X - 13, CENTER_Y - 8],
        [GLYPH_X - 1, CENTER_Y - 18],
        [GLYPH_X - 1, CENTER_Y + 18],
        [GLYPH_X - 13, CENTER_Y + 8],
    ]),
    capsule(GLYPH_X - 1, CENTER_Y - 17, GLYPH_X - 1, CENTER_Y + 17, 2.5),
);
const WAVES = union(arc(GLYPH_X + 1, CENTER_Y, 10, 5, 0.8), arc(GLYPH_X + 1, CENTER_Y, 19.5, 5, 0.85));
const CROSS_X = GLYPH_X + 13;
const CROSS = union(
    capsule(CROSS_X - 6.5, CENTER_Y - 6.5, CROSS_X + 6.5, CENTER_Y + 6.5, 2.8),
    capsule(CROSS_X - 6.5, CENTER_Y + 6.5, CROSS_X + 6.5, CENTER_Y - 6.5, 2.8),
);

function drawButton(glyph: Shape): Canvas {
    const canvas = new Canvas(SIZE, SIZE);
    const top = CENTER_Y - RADIUS;
    const bottom = CENTER_Y + RADIUS;
    const body = disc(CENTER_X, CENTER_Y, RADIUS - RIM);
    canvas.draw(softDisc(CENTER_X, CENTER_Y + 3, RADIUS, 6), solid(COLORS.shadow));
    canvas.draw(covered(disc(CENTER_X, CENTER_Y, RADIUS)), vertical(top, bottom, COLORS.rimTop, COLORS.rimBottom));
    canvas.draw(covered(body), vertical(top, bottom, COLORS.bodyTop, COLORS.bodyBottom));
    canvas.draw(
        covered(intersection(body, ellipse(CENTER_X, CENTER_Y - RADIUS * 0.42, RADIUS * 0.74, RADIUS * 0.44))),
        vertical(top, CENTER_Y, COLORS.glossTop, COLORS.glossBottom),
    );
    canvas.draw(covered(moved(glyph, 0, 2.5)), solid(COLORS.glyphShadow));
    canvas.draw(covered(glyph), solid(COLORS.glyph));
    return canvas;
}

/** The box around pixels with any alpha, like the editor's automatic trim. */
function opaqueBounds(rgba: Uint8Array, width: number, height: number): Rect {
    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (rgba[(y * width + x) * 4 + 3] > 0) {
                minX = Math.min(minX, x);
                minY = Math.min(minY, y);
                maxX = Math.max(maxX, x);
                maxY = Math.max(maxY, y);
            }
        }
    }
    return { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

function main(): void {
    mkdirSync(OUT_DIR, { recursive: true });
    writeFolderMeta(OUT_DIR);
    const icons: { [name: string]: Shape } = {
        sound_on: union(SPEAKER, WAVES),
        sound_off: union(SPEAKER, CROSS),
    };
    Object.keys(icons).forEach((name) => {
        const rgba = drawButton(icons[name]).toRgba8();
        const png = encodePng(SIZE, SIZE, rgba);
        const file = join(OUT_DIR, `${name}.png`);
        writeIfChanged(file, png);
        const ids = writeSpriteMeta(file, SIZE, SIZE, opaqueBounds(rgba, SIZE, SIZE));
        console.log(`${name}.png ${SIZE}x${SIZE} ${(png.length / 1024).toFixed(1)} KB, sprite frame ${ids.frame}`);
    });
}

main();
