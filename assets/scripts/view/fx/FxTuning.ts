import { FxKind } from './FxArt';

/**
 * Every effect tunable in one place, like Timings for the tiles. Seconds, board px, degrees,
 * opacity 0..255, tints as 0xRRGGBB. Speeds are px/s, gravity px/s².
 */
export const FxTuning = {
    /** Above this effects drop particles instead of piling up: a 90-tile chain stays smooth on a weak phone. */
    maxParticles: 240,
    /** Sprites made at load, so the first big chain does not build nodes mid-frame. */
    prewarm: { glow: 24, sparkle: 30, shard: 60, ring: 4, confetti: 80, streak: 24 } as { [K in FxKind]: number },

    palette: {
        /** Fallback shard tints by tile color index, when the inspector list is empty: blue, green, purple, red, yellow. */
        tiles: [0x14aaf5, 0x55cc2e, 0xd84aaa, 0xf5384f, 0xffb21a],
        /** Super tiles have no color of their own. */
        super: 0xffd54f,
        warmWhite: 0xfff6d8,
        gold: 0xffd86b,
        orange: 0xff9a3c,
    },

    burst: {
        shards: { min: 6, max: 14 },
        /** 0 puts shards at even angles, 1 lets each wander over its whole sector. */
        spreadJitter: 0.8,
        /** Always left for a burst, however full the system is, until it is completely full. */
        minShards: 2,
        shardSpeed: { min: 140, max: 620 },
        /** Bigger groups throw their shards farther. */
        shardSpeedByStrength: 0.4,
        /** Extra upward speed: shards arc up before gravity takes them. */
        shardLift: 260,
        /** Vertical share of the throw: a burst spreads a little wider than tall. */
        shardFlatten: 0.85,
        shardGravity: 2200,
        shardDrag: 0.8,
        shardSpin: { min: 360, max: 900 },
        shardLife: { min: 0.38, max: 0.52 },
        shardScale: { min: 0.7, max: 1.2 },
        shardEndScale: 0.25,
        shardFadeFrom: 0.6,
        /** Share of shards in a lighter tint, which reads as light catching the faces. */
        lightShare: 0.35,
        lightMix: 0.45,
        sparkles: { min: 1, max: 3 },
        sparkleOffset: 26,
        sparkleSpeed: { min: 60, max: 170 },
        sparkleDrag: 3,
        sparkleLife: { min: 0.3, max: 0.45 },
        sparkleScale: { min: 0.55, max: 0.9 },
        sparkleGrowIn: 0.08,
        sparkleSpin: 160,
        glowScale: { min: 1.4, max: 2.4 },
        glowLife: 0.22,
        glowOpacity: 220,
        glowWhiten: 0.55,
    },

    shockwave: {
        life: 0.4,
        startShare: 0.2,
        ringFadeFrom: 0.3,
        echoDelay: 0.07,
        echoStartShare: 0.1,
        echoShare: 0.75,
        echoOpacity: 150,
        glowLife: 0.3,
        /** Glow radius as a share of the blast radius. */
        glowShare: 1.1,
        glowStartShare: 0.5,
        glowOpacity: 220,
        sparks: 8,
        streaks: 8,
        /** Spark speed in blast radii per second: drag stops them near the edge of the blast. */
        sparkSpeed: { min: 3.5, max: 5 },
        sparkDrag: 5,
        sparkLife: { min: 0.35, max: 0.5 },
        sparkScale: { min: 0.4, max: 0.7 },
        sparkSpin: 180,
        streakLife: 0.3,
        streakScale: 1.1,
        streakEndShare: 0.3,
        streakStretch: 1.8,
    },

    flash: {
        opacity: 205,
        duration: 0.35,
        /** Reaches past the board, over the frame. */
        padding: 24,
    },

    rocket: {
        /** Of the rocket art's own size. */
        headScale: 0.85,
        /** The rocket tile art is a pair of firecrackers facing both ways, so the head never needs to turn over. */
        uprightArt: true,
        /** Head when no rocket art is set: a glow, scaled from its 64 px. */
        fallbackHeadScale: 1.4,
        trailSpacing: 26,
        streakLife: 0.22,
        streakScale: 1.3,
        streakEndShare: 0.3,
        puffLife: 0.3,
        puffScale: { min: 0.9, max: 1.2 },
        puffOpacity: 140,
        puffEndShare: 0.3,
        /** One spark every this many trail points. */
        sparkEvery: 2,
        sparkSpeed: { min: 80, max: 220 },
        sparkGravity: 500,
        sparkLife: { min: 0.3, max: 0.45 },
        sparkScale: { min: 0.35, max: 0.6 },
        sparkSpin: 240,
        /** Degrees off the flight line, to either side: sparks fly off the path, not along it. */
        sparkSide: { min: 60, max: 120 },
    },

    scorePopup: {
        fontSize: 50,
        lineHeight: 58,
        outlineWidth: 4,
        color: 0xffffff,
        outline: 0x3a1258,
        /** Starts a little above the point, so it does not cover the tile that just burned. */
        lift: 20,
        pop: 0.18,
        rise: 80,
        life: 0.8,
        fadeFrom: 0.45,
        /** Scale by points on a log scale: a whole-board blast reads bigger than a pair. */
        pointsLow: 20,
        pointsHigh: 600,
        scaleLow: 0.85,
        scaleHigh: 1.4,
        /** Past this many on screen the oldest one is reused. */
        maxLabels: 12,
    },

    praise: {
        fontSize: 110,
        lineHeight: 128,
        outlineWidth: 9,
        color: 0xfff2b3,
        outline: 0x45136b,
        /** Of the board width. Longer words shrink to fit. */
        widthShare: 0.94,
        appear: 0.28,
        overshoot: 1.2,
        settle: 0.12,
        hold: 0.6,
        leave: 0.32,
        rise: 70,
        tiltFrom: 14,
        tilt: 5,
        sparkles: 14,
        sparkleHeight: 60,
        sparkleDelay: 0.35,
        sparkleLife: 0.5,
        sparkleScale: { min: 0.6, max: 1.2 },
        sparkleGrowShare: 0.3,
        sparkleSpin: 120,
        glowScale: 6,
        glowGrowth: 1.1,
        /** Wider than tall, like the line of text. */
        glowStretch: 1.8,
        glowFadeFrom: 0.5,
        glowLife: 1.1,
        glowOpacity: 120,
    },

    confetti: {
        count: 80,
        /** The rest rain from above the board. */
        cannonShare: 0.5,
        cannonSpeed: { min: 1500, max: 2300 },
        /** Degrees off vertical, toward the middle of the board. */
        cannonAim: { min: 12, max: 38 },
        cannonDelay: 0.15,
        rainSpeed: { min: 80, max: 260 },
        rainDrift: 40,
        /** The shower starts this far above the top edge at most, so it does not arrive as one line. */
        rainHeight: 60,
        rainDelay: { min: 0, max: 0.9 },
        gravity: 900,
        drag: 2.6,
        life: { min: 1.8, max: 2.4 },
        fadeFrom: 0.75,
        flip: { min: 1.2, max: 2.6 },
        sway: { min: 40, max: 110 },
        spin: 220,
        scale: { min: 0.8, max: 1.25 },
    },
};
