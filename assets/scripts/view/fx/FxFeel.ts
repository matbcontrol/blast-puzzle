/**
 * How the board effects look and move: the tuning of EffectsLayer and its parts. Seconds, board px, degrees,
 * opacity 0..255, tints as 0xRRGGBB. Speeds are px/s, gravity px/s².
 */
export const FxFeel = {
    /** Most particles alive at once: past it effects drop particles instead of piling up on a weak phone. */
    maxParticles: 240,
    /**
     * Sprites made at load, a little over the per-kind peaks of the biggest chains (tests/fxScenarios.test.ts),
     * so a chain never builds nodes mid-frame. An idle sprite costs next to nothing: the render walk skips it.
     */
    prewarm: { glow: 100, sparkle: 30, shard: 220, ring: 6, streak: 40 },

    palette: {
        /** Shard tints by tile color index when the inspector list is empty: blue, green, purple, red, yellow. */
        tiles: [0x14aaf5, 0x55cc2e, 0xd84aaa, 0xf5384f, 0xffb21a],
        /** Super tiles have no color of their own. */
        super: 0xffd54f,
        warmWhite: 0xfff6d8,
        gold: 0xffd86b,
        orange: 0xff9a3c,
    },

    burst: {
        /**
         * Share of the particle system one wave of bursts may fill, split evenly between its tiles. Half, so a wave
         * chained right after still finds the other half while these shards fly. A tile always gets a glow and a
         * shard, which is how a 90-tile field blast goes over its share without starving anyone.
         */
        waveShare: 0.5,
        shards: { min: 6, max: 14 },
        /** 0 puts shards at even angles, 1 lets each wander over its whole sector. */
        spreadJitter: 0.8,
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
        /** Without a score target: the popup rises for this long and fades out from fadeFrom of it. */
        life: 0.8,
        fadeFrom: 0.45,
        /** With a score target: the popup rests this long after its pop, then flies in, shrinking to flyScale. */
        hold: 0.14,
        fly: 0.35,
        flyScale: 0.5,
        /** Scale by points on a log scale: a whole-board blast reads bigger than a pair. */
        pointsLow: 20,
        pointsHigh: 600,
        scaleLow: 0.85,
        scaleHigh: 1.4,
        /** Each wave of a chain after the first grows the popup by this share. */
        chainGrowth: 0.15,
        /** The popup and its rise stay this far inside the board edges. */
        edge: 12,
        /** Rough glyph width over font size, to keep a popup off the side edges before its label is laid out. */
        glyphWidth: 0.62,
        /** Past this many on screen the oldest one is reused. */
        maxLabels: 12,
    },

    /** "x3" over the score popup of a chain. Positions are in the popup's own space, so it scales with it. */
    chainBadge: {
        fontSize: 40,
        lineHeight: 46,
        outlineWidth: 4,
        color: 0xffd86b,
        outline: 0x3a1258,
        /** Above the center of the popup. */
        raise: 50,
        delay: 0.08,
        pop: 0.22,
        overshoot: 1.25,
        settle: 0.1,
        tilt: 10,
    },

    praise: {
        fontSize: 110,
        lineHeight: 128,
        outlineWidth: 9,
        color: 0xfff2b3,
        outline: 0x45136b,
        /** Of the board width. Longer words shrink to fit. */
        widthShare: 0.94,
        /** Height above the board center, as a share of the board height, for praise not tied to a place. */
        restShare: 0.28,
        /** How far above the action a placed praise sits. It is kept inside the board either way. */
        aboveAction: 140,
        appear: 0.28,
        overshoot: 1.2,
        settle: 0.12,
        /** Short, so the word is gone by the time the turn ends and the board takes taps again. */
        hold: 0.35,
        leave: 0.2,
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
        glowLife: 0.8,
        glowOpacity: 120,
    },
};
