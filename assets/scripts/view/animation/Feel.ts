/** How hard the board reacts: scales, effect strengths 0..1 and thresholds in tiles. Durations live in Timings. */
export const Feel = {
    burnSqueezeScale: 1.12,
    hitSwellScale: 1.22,
    /** A group this big bursts, sounds and shakes at full strength. Smaller ones scale down from there. */
    fullGroup: 10,
    minGroupBurst: 0.35,
    hitBurst: 0.8,
    /** The whole board bursts at once, so each tile gets less to keep the particle count sane. */
    fieldBurst: 0.45,
    shakeFromTiles: 6,
    rocketShake: 0.35,
    bombShake: 1,
    fieldShake: 1,
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
