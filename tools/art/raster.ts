/**
 * The two ways the generators turn shapes into pixels, both antialiased by supersampling:
 * a grayscale mask for textures the game tints, and a layered colour canvas for finished UI art.
 */
import { Rect } from '../shared/cocosMeta';

/** Samples per pixel along each axis. */
export const SUPERSAMPLING = 4;

/** alpha and light 0..1. Light is the gray level, it shades the tint. */
export interface Texel {
    readonly alpha: number;
    readonly light: number;
}

/** x, y in pixels from the top left corner of the image. */
export type MaskShape = (x: number, y: number) => Texel;

/** Averages light weighted by alpha: the edge of a shape keeps its own gray instead of darkening toward empty. */
export function rasterizeMask(width: number, height: number, shape: MaskShape): Uint8Array {
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

export interface Rgba {
    readonly r: number;
    readonly g: number;
    readonly b: number;
    /** 0..1 */
    readonly a: number;
}

export const rgb = (hex: number, a = 1): Rgba => ({ r: (hex >> 16) & 255, g: (hex >> 8) & 255, b: hex & 255, a });

/** Is this point inside? Coverage comes from supersampling these tests. */
export type Shape = (x: number, y: number) => boolean;
export type Paint = (x: number, y: number) => Rgba;
/** 0..1 of the pixel at (px, py) that a layer covers. */
export type Coverage = (px: number, py: number) => number;

export class Canvas {
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

export const covered =
    (shape: Shape): Coverage =>
    (px, py) => {
        let inside = 0;
        for (let sy = 0; sy < SUPERSAMPLING; sy++) {
            for (let sx = 0; sx < SUPERSAMPLING; sx++) {
                if (shape(px + (sx + 0.5) / SUPERSAMPLING, py + (sy + 0.5) / SUPERSAMPLING)) {
                    inside++;
                }
            }
        }
        return inside / (SUPERSAMPLING * SUPERSAMPLING);
    };

/** The box around pixels with any alpha, like the editor's automatic trim. */
export function opaqueBounds(rgba: Uint8Array, width: number, height: number): Rect {
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
