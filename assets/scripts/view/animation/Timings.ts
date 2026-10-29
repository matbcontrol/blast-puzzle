/**
 * All animation timings in seconds, in one place to tune the feel of the game.
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
    swap: 0.3,
    shuffleGather: 0.25,
    shuffleHold: 0.06,
    shuffleScatter: 0.32,
    reject: 0.24,
    shake: 0.3,
    targetPulse: 0.7,
    boosterPulse: 0.8,
    hudBump: 0.2,
    popupFadeIn: 0.2,
    popupPop: 0.35,
    /** Long enough to swallow the second tap of a double tap on the restart button. */
    popupFadeOut: 0.3,
};
