/**
 * Draws the effect textures into assets/textures/fx: white and grayscale, so the game tints them,
 * antialiased by supersampling. Also writes their Cocos import settings: no trimming, so a particle
 * scales around its center, and nine-slice borders for the flash panel.
 *
 *   npm run art
 */
import { mkdirSync } from 'fs';
import { join } from 'path';
import { FX_TEXTURES, FxTextureName, PANEL_BORDER, RING_RADIUS } from '../../assets/scripts/view/fx/FxArt';
import { uniformBorder, writeFolderMeta, writeIfChanged, writeSpriteMeta } from '../shared/cocosMeta';
import { encodePng } from '../shared/png';
import { clamp01, inset, polygonDistance, roundedRectDistance, smoothstep, Vec } from './geometry';
import { MaskShape, rasterizeMask, Texel } from './raster';

const OUT_DIR = join(__dirname, '../../assets/textures/fx');

const solid = (alpha: number): Texel => ({ alpha: clamp01(alpha), light: 1 });

/** Gaussian falloff pulled down to exactly zero at the edge, so the square never shows. */
function glow(size: number): MaskShape {
    const c = size / 2;
    const k = 5;
    const floor = Math.exp(-k);
    return (x, y) => {
        const r = Math.hypot(x - c, y - c) / c;
        return solid(r >= 1 ? 0 : (Math.exp(-k * r * r) - floor) / (1 - floor));
    };
}

/** Four long rays thinning toward the tips, four short diagonal glints and a hot core. */
function sparkle(size: number): MaskShape {
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

/**
 * An irregular chip with rounded corners. The rim facing up-left is lighter and the rest darker,
 * so a flat tint reads as a beveled piece of the tile.
 */
function shard(): MaskShape {
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
function ring(size: number): MaskShape {
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

/** A paper strip, a little darker at the bottom, so it shows a fold as it flips. */
function confetti(width: number, height: number): MaskShape {
    return (x, y) => {
        const inside = roundedRectDistance(x, y, width / 2, height / 2, width / 2 - 2, height / 2 - 2, 2.5) <= 0;
        return { alpha: inside ? 1 : 0, light: 1 - 0.18 * (y / height) };
    };
}

/** Bright round head on the right, thinning and fading to nothing on the left. */
function streak(width: number, height: number): MaskShape {
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
function panel(width: number, height: number): MaskShape {
    return (x, y) => {
        const d = roundedRectDistance(x, y, width / 2, height / 2, width / 2 - 0.5, height / 2 - 0.5, PANEL_BORDER - 1);
        return solid(d <= 0 ? 1 : 0);
    };
}

const SHAPES: { [K in FxTextureName]: MaskShape } = {
    glow: glow(FX_TEXTURES.glow.width),
    sparkle: sparkle(FX_TEXTURES.sparkle.width),
    shard: shard(),
    ring: ring(FX_TEXTURES.ring.width),
    confetti: confetti(FX_TEXTURES.confetti.width, FX_TEXTURES.confetti.height),
    streak: streak(FX_TEXTURES.streak.width, FX_TEXTURES.streak.height),
    panel: panel(FX_TEXTURES.panel.width, FX_TEXTURES.panel.height),
};

const BORDERS: { [K in FxTextureName]?: number } = { panel: PANEL_BORDER };

function main(): void {
    mkdirSync(OUT_DIR, { recursive: true });
    writeFolderMeta(OUT_DIR);
    (Object.keys(SHAPES) as FxTextureName[]).forEach((key) => {
        const { width, height } = FX_TEXTURES[key];
        const name = `fx_${key}`;
        const file = join(OUT_DIR, `${name}.png`);
        // The meta goes first: an editor that notices the image picks up these settings, not its defaults.
        writeSpriteMeta(file, width, height, { border: uniformBorder(BORDERS[key] || 0) });
        const png = encodePng(width, height, rasterizeMask(width, height, SHAPES[key]));
        const changed = writeIfChanged(file, png);
        console.log(`${name}.png  ${width}x${height}  ${png.length} bytes${changed ? '' : '  (same)'}`);
    });
}

main();
