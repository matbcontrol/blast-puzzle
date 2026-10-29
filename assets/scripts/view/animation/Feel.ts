/**
 * How hard the tile animations hit: scales, effect strengths 0..1, board px and degrees. Their seconds live in
 * Timings. These are feel, not rules: what a group earns or a blast reaches always comes from the model.
 */
export const Feel = {
    burnSqueezeScale: 1.12,
    hitSwellScale: 1.22,
    bonusSwellScale: 1.35,
    bonusBurst: 1,
    /** A group this big bursts and sounds at full strength. Smaller ones scale down from there. */
    fullGroup: 10,
    minGroupBurst: 0.35,
    /** A burn that set off this many explosions sounds at full strength. */
    fullChain: 3,
    hitBurst: 0.8,
    /** The look of a tile in a field blast. The effects split their particle budget over the crowd by themselves. */
    fieldBurst: 0.45,
    rocketShake: 0.35,
    bombShake: 1,
    fieldShake: 1,
    /** Every explosion a chain sets off shakes harder: base + perExplosion x explosions so far. */
    chainShake: { base: 0.4, perExplosion: 0.2 },
    /** Board shake: its amplitude from strength 0 to 1, and its path as shares of that, one key per step. */
    shake: {
        min: 8,
        max: 20,
        path: [
            { x: 1, y: 0.5 },
            { x: -0.75, y: -0.6 },
            { x: 0.4, y: 0.3 },
            { x: 0, y: 0 },
        ],
    },
    collapseScale: 0.5,
    superGrowScale: 1.3,
    superSparkle: 1,
    landSquashX: 1.1,
    landSquashY: 0.86,
    /** Height of the swap arc as a share of the swap distance. */
    swapArc: 0.3,
    swapScale: 1.2,
    swapSparkle: 0.6,
    /** Share of the way to the board center the tiles gather before they scatter. */
    shuffleGather: 0.7,
    shuffleScale: 0.45,
    shuffleSpin: 180,
};
