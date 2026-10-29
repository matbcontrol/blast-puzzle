/** Plane geometry shared by the texture generators. Distances are in pixels, negative inside. */

export interface Vec {
    readonly x: number;
    readonly y: number;
}

export const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);

export const smoothstep = (edge0: number, edge1: number, v: number): number => {
    const t = clamp01((v - edge0) / (edge1 - edge0));
    return t * t * (3 - 2 * t);
};

export function signedArea(poly: ReadonlyArray<Vec>): number {
    let sum = 0;
    for (let i = 0; i < poly.length; i++) {
        const a = poly[i];
        const b = poly[(i + 1) % poly.length];
        sum += a.x * b.y - b.x * a.y;
    }
    return sum / 2;
}

/** Moves every edge of a convex polygon inward by d. */
export function inset(poly: ReadonlyArray<Vec>, d: number): Vec[] {
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

/** Signed distance to any simple polygon, convex or not (after Inigo Quilez). */
export function polygonDistance(x: number, y: number, poly: ReadonlyArray<Vec>): number {
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

/** A rectangle centred on (cx, cy) with half sizes hw, hh and corner radius r. */
export function roundedRectDistance(
    x: number,
    y: number,
    cx: number,
    cy: number,
    hw: number,
    hh: number,
    r: number,
): number {
    const qx = Math.abs(x - cx) - (hw - r);
    const qy = Math.abs(y - cy) - (hh - r);
    return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
}

/** Points of a star with `points` tips, the first one straight up; screen y grows downward. */
export function starPolygon(cx: number, cy: number, outer: number, inner: number, points: number): Vec[] {
    const out: Vec[] = [];
    for (let i = 0; i < points * 2; i++) {
        const radius = i % 2 === 0 ? outer : inner;
        const angle = -Math.PI / 2 + (i * Math.PI) / points;
        out.push({ x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) });
    }
    return out;
}
