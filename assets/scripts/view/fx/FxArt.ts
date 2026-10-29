/**
 * Effect textures, drawn by tools/art/generateFx.ts. White, so one texture takes any tint,
 * and small, so they go into the dynamic atlas and every particle batches with the tiles.
 */
export type FxKind = 'glow' | 'sparkle' | 'shard' | 'ring' | 'confetti' | 'streak';

export type FxTextureName = FxKind | 'panel';

export interface FxTextureSize {
    readonly width: number;
    readonly height: number;
}

export const FX_TEXTURES: { readonly [K in FxTextureName]: FxTextureSize } = {
    glow: { width: 64, height: 64 },
    sparkle: { width: 64, height: 64 },
    shard: { width: 32, height: 32 },
    ring: { width: 128, height: 128 },
    confetti: { width: 16, height: 24 },
    streak: { width: 64, height: 16 },
    panel: { width: 32, height: 32 },
};

export const FX_KINDS: ReadonlyArray<FxKind> = ['glow', 'sparkle', 'shard', 'ring', 'confetti', 'streak'];

/** Radius of the bright line of the ring texture: a shockwave scales the ring by radius / RING_RADIUS. */
export const RING_RADIUS = 54;

/** The glow fades out at the texture edge, so its visible radius is half the width. */
export const GLOW_RADIUS = 32;

/** Nine-slice border of the panel: the flash keeps its rounded corners at any size. */
export const PANEL_BORDER = 13;
