/**
 * Seconds of the tile animations on the stage: the turn steps, the deal and the board shake. Their scales and
 * strengths live in Feel. A component's own tweens take their seconds from its own Feel object.
 * A plain two-to-four tile turn takes about 0.45 s from the tap until input unlocks.
 */
export const Timings = {
    /** A tapped group swells a little before it pops, so the tap reads as the cause. */
    burnSqueeze: 0.05,
    burnPop: 0.11,
    burnRipplePerCell: 0.018,
    /** Tiles hit by an explosion pop almost at once. */
    hitSwell: 0.03,
    hitPop: 0.1,
    /** A leftover move picks its tile with a bright pop before the super tile appears there. */
    bonusSwell: 0.09,
    bonusPop: 0.1,
    waveGap: 0.06,
    rocketPerCell: 0.04,
    bombRing: 0.035,
    fieldRipplePerCell: 0.025,
    collapse: 0.18,
    superGrow: 0.13,
    superSettle: 0.09,
    /** A one-cell fall. Longer falls take sqrt(cells) times as long, so every tile accelerates alike. */
    fallOneCell: 0.115,
    landSquash: 0.035,
    landSettle: 0.09,
    refillColumnStagger: 0.012,
    refillRowStagger: 0.02,
    /** The deal at level start: columns land left to right, each from the bottom up. */
    dealColumnStagger: 0.016,
    dealRowStagger: 0.005,
    swap: 0.3,
    shuffleGather: 0.25,
    shuffleHold: 0.06,
    shuffleScatter: 0.32,
    shake: 0.3,
};
