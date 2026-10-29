/**
 * Draws the finished UI art into assets/textures/ui, in the palette of the mockup: the glossy magenta
 * of the booster buttons, the cyan and navy of the HUD frame, gold for rewards.
 *
 *   npm run art
 */
import { mkdirSync } from 'fs';
import { join, resolve } from 'path';
import { Border, writeFolderMeta, writeIfChanged, writeSpriteMeta } from '../shared/cocosMeta';
import { encodePng } from '../shared/png';
import { polygonDistance, roundedRectDistance, starPolygon } from './geometry';
import { Canvas, covered, opaqueBounds, rgb, Shape } from './raster';
import {
    arc,
    capsule,
    disc,
    ellipse,
    intersection,
    moved,
    polygon,
    roundedRect,
    softDisc,
    softEdge,
    solid,
    union,
    vertical,
    within,
} from './shapes';

const OUT_DIR = resolve(__dirname, '../../assets/textures/ui');

interface UiArt {
    readonly name: string;
    readonly width: number;
    readonly height: number;
    draw(canvas: Canvas): void;
    /** Nine-slice insets: the art keeps its whole image, so the corners stay where the border says. */
    readonly border?: Border;
    /** Trimmed to its opaque pixels like the editor's default import. */
    readonly trim?: boolean;
}

// The booster button palette: magenta to violet, with a light pink rim.
const BUTTON = {
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

// The HUD frame: cyan rim around a navy well.
const HUD = {
    rimTop: rgb(0x8af3ff),
    rimBottom: rgb(0x1580dc),
    wellTop: rgb(0x061638),
    wellBottom: rgb(0x123a7c),
    innerShadow: rgb(0x000814, 0.45),
};

const GOLD = {
    rimTop: rgb(0xf7a516),
    rimBottom: rgb(0xa84a00),
    bodyTop: rgb(0xfff07a),
    bodyBottom: rgb(0xffa412),
};

const PLATE = {
    rimTop: rgb(0xd9a3ff),
    rimBottom: rgb(0x6a24b0),
    bodyTop: rgb(0x58198e),
    bodyBottom: rgb(0x2a0848),
    glossTop: rgb(0xffffff, 0.32),
    glossBottom: rgb(0xffffff, 0.02),
};

const DROP_SHADOW = rgb(0x12001f, 0.45);
const GLOSS_TOP = rgb(0xffffff, 0.6);
const GLOSS_BOTTOM = rgb(0xffffff, 0.05);
/** How far the top edge of a recessed well is shaded. */
const INSET_SHADOW = 2.5;

// Small enough for the dynamic atlas, so the button batches with the rest of the HUD.
const ICON_SIZE = 112;
const ICON_X = ICON_SIZE / 2;
const ICON_Y = ICON_SIZE / 2 - 2;
const ICON_RADIUS = 50;
const ICON_RIM = 4;

// The speaker sits a little left of centre, so it stays put while the waves and the cross swap beside it.
const GLYPH_X = ICON_X - 2;
const SPEAKER = union(
    roundedRect(GLYPH_X - 22, ICON_Y - 8, 11, 16, 2.5),
    polygon([
        [GLYPH_X - 13, ICON_Y - 8],
        [GLYPH_X - 1, ICON_Y - 18],
        [GLYPH_X - 1, ICON_Y + 18],
        [GLYPH_X - 13, ICON_Y + 8],
    ]),
    capsule(GLYPH_X - 1, ICON_Y - 17, GLYPH_X - 1, ICON_Y + 17, 2.5),
);
const WAVES = union(arc(GLYPH_X + 1, ICON_Y, 10, 5, 0.8), arc(GLYPH_X + 1, ICON_Y, 19.5, 5, 0.85));
const CROSS_X = GLYPH_X + 13;
const CROSS = union(
    capsule(CROSS_X - 6.5, ICON_Y - 6.5, CROSS_X + 6.5, ICON_Y + 6.5, 2.8),
    capsule(CROSS_X - 6.5, ICON_Y + 6.5, CROSS_X + 6.5, ICON_Y - 6.5, 2.8),
);

/** A white glyph on the glossy magenta disc of the booster buttons. */
function soundButton(name: string, glyph: Shape): UiArt {
    return {
        name,
        width: ICON_SIZE,
        height: ICON_SIZE,
        trim: true,
        draw: (canvas) => {
            const top = ICON_Y - ICON_RADIUS;
            const bottom = ICON_Y + ICON_RADIUS;
            const body = disc(ICON_X, ICON_Y, ICON_RADIUS - ICON_RIM);
            const gloss = ellipse(ICON_X, ICON_Y - ICON_RADIUS * 0.42, ICON_RADIUS * 0.74, ICON_RADIUS * 0.44);
            canvas.draw(softDisc(ICON_X, ICON_Y + 3, ICON_RADIUS, 6), solid(BUTTON.shadow));
            canvas.draw(
                covered(disc(ICON_X, ICON_Y, ICON_RADIUS)),
                vertical(top, bottom, BUTTON.rimTop, BUTTON.rimBottom),
            );
            canvas.draw(covered(body), vertical(top, bottom, BUTTON.bodyTop, BUTTON.bodyBottom));
            canvas.draw(covered(intersection(body, gloss)), vertical(top, ICON_Y, BUTTON.glossTop, BUTTON.glossBottom));
            canvas.draw(covered(moved(glyph, 0, 2.5)), solid(BUTTON.glyphShadow));
            canvas.draw(covered(glyph), solid(BUTTON.glyph));
        },
    };
}

const STAR_SIZE = 64;
const STAR_RADIUS = 25;
const STAR_ROUNDING = 3;
const STAR_RIM = 2.5;
// The bottom tips reach only cos 36° of the radius, so the centre sits low to balance the star in its square.
const STAR_TIP_DROP = Math.cos(Math.PI / 5);
const STAR_X = STAR_SIZE / 2;
const STAR_Y = STAR_SIZE / 2 + 1.5;
const STAR_POINTS = starPolygon(STAR_X, STAR_Y, STAR_RADIUS, STAR_RADIUS * 0.5, 5);
const starDistance = (x: number, y: number): number => polygonDistance(x, y, STAR_POINTS) - STAR_ROUNDING;
const STAR_TOP = STAR_Y - STAR_RADIUS - STAR_ROUNDING;
const STAR_BOTTOM = STAR_Y + STAR_RADIUS * STAR_TIP_DROP + STAR_ROUNDING;

/** Both stars share the outline and the untrimmed square, so swapping the frames moves nothing. */
function star(name: string, filled: boolean): UiArt {
    return {
        name,
        width: STAR_SIZE,
        height: STAR_SIZE,
        draw: (canvas) => {
            const outline = within(starDistance);
            const body = within(starDistance, -STAR_RIM);
            canvas.draw(
                softEdge((x, y) => starDistance(x, y - 2.5), 4),
                solid(DROP_SHADOW),
            );
            if (filled) {
                canvas.draw(covered(outline), vertical(STAR_TOP, STAR_BOTTOM, GOLD.rimTop, GOLD.rimBottom));
                canvas.draw(covered(body), vertical(STAR_TOP, STAR_BOTTOM, GOLD.bodyTop, GOLD.bodyBottom));
                canvas.draw(
                    covered(intersection(body, ellipse(STAR_X, STAR_Y - 9, 15, 11))),
                    vertical(STAR_TOP, STAR_Y, GLOSS_TOP, GLOSS_BOTTOM),
                );
            } else {
                canvas.draw(covered(outline), vertical(STAR_TOP, STAR_BOTTOM, HUD.rimTop, HUD.rimBottom));
                canvas.draw(covered(body), vertical(STAR_TOP, STAR_BOTTOM, HUD.wellTop, HUD.wellBottom));
                // Shading the top edge inside makes the slot read as pressed into the frame.
                canvas.draw(covered(intersection(body, (x, y) => !body(x, y - INSET_SHADOW))), solid(HUD.innerShadow));
            }
        },
    };
}

/** A capsule bar: rounded ends in the left and right borders, a two pixel middle band for height. */
function bar(name: string, width: number, height: number, draw: (canvas: Canvas) => void): UiArt {
    const radius = height / 2;
    return {
        name,
        width,
        height,
        border: { top: radius - 1, bottom: radius - 1, left: radius, right: radius },
        draw,
    };
}

const TRACK_WIDTH = 64;
const TRACK_HEIGHT = 24;
const TRACK_RIM = 2.5;

const progressTrack = bar('progress_track', TRACK_WIDTH, TRACK_HEIGHT, (canvas) => {
    const r = TRACK_HEIGHT / 2;
    const well = roundedRect(
        TRACK_RIM,
        TRACK_RIM,
        TRACK_WIDTH - 2 * TRACK_RIM,
        TRACK_HEIGHT - 2 * TRACK_RIM,
        r - TRACK_RIM,
    );
    canvas.draw(
        covered(roundedRect(0, 0, TRACK_WIDTH, TRACK_HEIGHT, r)),
        vertical(0, TRACK_HEIGHT, HUD.rimTop, HUD.rimBottom),
    );
    canvas.draw(covered(well), vertical(TRACK_RIM, TRACK_HEIGHT - TRACK_RIM, HUD.wellTop, HUD.wellBottom));
    canvas.draw(covered(intersection(well, (x, y) => !well(x, y - INSET_SHADOW))), solid(HUD.innerShadow));
});

// Fits inside the track's rim with half a pixel to spare on each side.
const FILL_HEIGHT = TRACK_HEIGHT - 2 * TRACK_RIM - 1;

const progressFill = bar('progress_fill', TRACK_WIDTH, FILL_HEIGHT, (canvas) => {
    const r = FILL_HEIGHT / 2;
    const rim = 1.25;
    canvas.draw(
        covered(roundedRect(0, 0, TRACK_WIDTH, FILL_HEIGHT, r)),
        vertical(0, FILL_HEIGHT, GOLD.rimTop, GOLD.rimBottom),
    );
    canvas.draw(
        covered(roundedRect(rim, rim, TRACK_WIDTH - 2 * rim, FILL_HEIGHT - 2 * rim, r - rim)),
        vertical(rim, FILL_HEIGHT - rim, GOLD.bodyTop, GOLD.bodyBottom),
    );
    // The gloss strip ends inside the side borders, so stretching the bar lengthens it without bending it.
    canvas.draw(covered(roundedRect(5, 3, TRACK_WIDTH - 10, 5, 2.5)), vertical(3, 8, GLOSS_TOP, GLOSS_BOTTOM));
});

const PLATE_WIDTH = 96;
const PLATE_HEIGHT = 64;
const PLATE_RADIUS = 20;
const PLATE_RIM = 3;
/** Room around the plate for its shadow, which falls downward. */
const PLATE_MARGIN = { top: 2, bottom: 6, side: 4 };

const plateDistance = (x: number, y: number, grow = 0): number => {
    const width = PLATE_WIDTH - 2 * PLATE_MARGIN.side;
    const height = PLATE_HEIGHT - PLATE_MARGIN.top - PLATE_MARGIN.bottom;
    return roundedRectDistance(
        x,
        y,
        PLATE_MARGIN.side + width / 2,
        PLATE_MARGIN.top + height / 2,
        width / 2 + grow,
        height / 2 + grow,
        PLATE_RADIUS + grow,
    );
};

const toastPlate: UiArt = {
    name: 'toast_plate',
    width: PLATE_WIDTH,
    height: PLATE_HEIGHT,
    border: {
        top: PLATE_MARGIN.top + PLATE_RADIUS + 2,
        bottom: PLATE_MARGIN.bottom + PLATE_RADIUS + 2,
        left: PLATE_MARGIN.side + PLATE_RADIUS + 2,
        right: PLATE_MARGIN.side + PLATE_RADIUS + 2,
    },
    draw: (canvas) => {
        const top = PLATE_MARGIN.top;
        const bottom = PLATE_HEIGHT - PLATE_MARGIN.bottom;
        const body = within((x, y) => plateDistance(x, y, -PLATE_RIM));
        canvas.draw(
            softEdge((x, y) => plateDistance(x, y - 3), 6),
            solid(DROP_SHADOW),
        );
        canvas.draw(covered(within(plateDistance)), vertical(top, bottom, PLATE.rimTop, PLATE.rimBottom));
        canvas.draw(covered(body), vertical(top, bottom, PLATE.bodyTop, PLATE.bodyBottom));
        // The gloss stays inside the top border, so a taller plate keeps it the same height.
        const glossBottom = top + PLATE_RADIUS;
        canvas.draw(
            covered(intersection(body, (x, y) => y < glossBottom && plateDistance(x, y + 4, -PLATE_RIM - 2) <= 0)),
            vertical(top, glossBottom, PLATE.glossTop, PLATE.glossBottom),
        );
    },
};

const ART: ReadonlyArray<UiArt> = [
    soundButton('sound_on', union(SPEAKER, WAVES)),
    soundButton('sound_off', union(SPEAKER, CROSS)),
    star('star_full', true),
    star('star_empty', false),
    progressTrack,
    progressFill,
    toastPlate,
];

function main(): void {
    mkdirSync(OUT_DIR, { recursive: true });
    writeFolderMeta(OUT_DIR);
    ART.forEach((art) => {
        const canvas = new Canvas(art.width, art.height);
        art.draw(canvas);
        const rgba = canvas.toRgba8();
        const png = encodePng(art.width, art.height, rgba);
        const file = join(OUT_DIR, `${art.name}.png`);
        const changed = writeIfChanged(file, png);
        const ids = writeSpriteMeta(file, art.width, art.height, {
            trim: art.trim ? opaqueBounds(rgba, art.width, art.height) : undefined,
            border: art.border,
        });
        const size = `${art.width}x${art.height}`;
        console.log(
            `${art.name.padEnd(15)} ${size.padStart(7)} ${png.length.toString().padStart(6)} B  frame ${ids.frame}${changed ? '' : '  (same)'}`,
        );
    });
}

main();
