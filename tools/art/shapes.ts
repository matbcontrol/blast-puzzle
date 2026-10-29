/** Inside tests and paints for the colour canvas. Coordinates are pixels, y grows downward. */
import { Coverage, Paint, Rgba, Shape } from './raster';

/** A disc whose edge fades over `blur` pixels: a drop shadow. */
export const softDisc =
    (cx: number, cy: number, r: number, blur: number): Coverage =>
    (px, py) => {
        const d = Math.hypot(px + 0.5 - cx, py + 0.5 - cy);
        const t = Math.min(1, Math.max(0, (r + blur / 2 - d) / blur));
        return t * t * (3 - 2 * t);
    };

/** Any distance field, softened over `blur` pixels at its zero line: shadows and glows of a shape. */
export const softEdge =
    (distance: (x: number, y: number) => number, blur: number): Coverage =>
    (px, py) => {
        const t = Math.min(1, Math.max(0, (blur / 2 - distance(px + 0.5, py + 0.5)) / blur));
        return t * t * (3 - 2 * t);
    };

export const disc =
    (cx: number, cy: number, r: number): Shape =>
    (x, y) =>
        (x - cx) * (x - cx) + (y - cy) * (y - cy) <= r * r;

export const ellipse =
    (cx: number, cy: number, rx: number, ry: number): Shape =>
    (x, y) =>
        Math.pow((x - cx) / rx, 2) + Math.pow((y - cy) / ry, 2) <= 1;

/** A thick line with round ends. */
export const capsule =
    (x1: number, y1: number, x2: number, y2: number, r: number): Shape =>
    (x, y) => {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const t = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy)));
        return Math.hypot(x - (x1 + t * dx), y - (y1 + t * dy)) <= r;
    };

/** An arc stroke around (cx, cy) opening to the right, `spread` radians each way, with round ends. */
export const arc = (cx: number, cy: number, radius: number, thickness: number, spread: number): Shape => {
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

export const roundedRect =
    (x: number, y: number, width: number, height: number, r: number): Shape =>
    (px, py) => {
        const dx = Math.max(x + r - px, 0, px - (x + width - r));
        const dy = Math.max(y + r - py, 0, py - (y + height - r));
        return dx * dx + dy * dy <= r * r;
    };

/** Convex polygon, points clockwise on screen. */
export const polygon =
    (points: ReadonlyArray<readonly [number, number]>): Shape =>
    (x, y) =>
        points.every(([x1, y1], i) => {
            const [x2, y2] = points[(i + 1) % points.length];
            return (x2 - x1) * (y - y1) - (y2 - y1) * (x - x1) >= 0;
        });

/** Everything within `grow` pixels of a distance field's zero line: negative grow shrinks the shape. */
export const within =
    (distance: (x: number, y: number) => number, grow = 0): Shape =>
    (x, y) =>
        distance(x, y) <= grow;

export function union(...shapes: Shape[]): Shape {
    return (x, y) => shapes.some((shape) => shape(x, y));
}

export function intersection(...shapes: Shape[]): Shape {
    return (x, y) => shapes.every((shape) => shape(x, y));
}

export function moved(shape: Shape, dx: number, dy: number): Shape {
    return (x, y) => shape(x - dx, y - dy);
}

export const solid =
    (color: Rgba): Paint =>
    () =>
        color;

export const vertical =
    (top: number, bottom: number, from: Rgba, to: Rgba): Paint =>
    (_x, y) => {
        const t = Math.min(1, Math.max(0, (y - top) / (bottom - top)));
        const mix = (a: number, b: number): number => a + (b - a) * t;
        return { r: mix(from.r, to.r), g: mix(from.g, to.g), b: mix(from.b, to.b), a: mix(from.a, to.a) };
    };
