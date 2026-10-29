export interface Size {
    readonly width: number;
    readonly height: number;
}

/**
 * Scale of the board frame on the visible area. With the HUD pinned to the top and the boosters to the bottom,
 * a screen taller than the design opens its extra height between them, and the frame grows into it,
 * up to this share of the visible width. It never shrinks below the design size.
 */
export function fieldScale(visible: Size, design: Size, field: Size, maxWidthShare: number): number {
    const byWidth = (maxWidthShare * visible.width) / field.width;
    const byHeight = (field.height + visible.height - design.height) / field.height;
    return Math.max(1, Math.min(byWidth, byHeight));
}
