/**
 * The sounds of the game as synthesis recipes. Soft, rounded tones with fast pitch envelopes:
 * sines and band-limited triangles, filtered noise, a short room. Every recipe has its own seed,
 * so a regeneration writes the same bytes.
 */
import { Random, randomInt } from '../../assets/scripts/core/random/Random';
import { SeededRandom } from '../../assets/scripts/core/random/SeededRandom';
import { SoundId } from '../../assets/scripts/view/audio/SoundPlayer';
import {
    adsr,
    constant,
    filtered,
    finish,
    glide,
    noise,
    Partials,
    pluck,
    room,
    RoomSpec,
    saturate,
    scaled,
    sweep,
    swell,
    tone,
    Track,
    wobble,
} from './dsp';

const NOTE = {
    A3: 220.0,
    C4: 261.63,
    E4: 329.63,
    C5: 523.25,
    D5: 587.33,
    E5: 659.26,
    G5: 783.99,
    A5: 880.0,
    C6: 1046.5,
    E6: 1318.51,
    G6: 1567.98,
    C7: 2093.0,
    D7: 2349.32,
    E7: 2637.02,
    G7: 3135.96,
    A7: 3520.0,
    C8: 4186.01,
};

// Major pentatonic: the pops of a cascade climb and never clash, whatever order they come in.
const POP_NOTES = [NOTE.C5, NOTE.D5, NOTE.E5, NOTE.G5, NOTE.A5];
const SPARKLE_NOTES = [NOTE.C7, NOTE.D7, NOTE.E7, NOTE.G7, NOTE.A7, NOTE.C8];
const BELL: Partials = [
    [2, 0.2],
    [3, 0.06],
    [4.2, 0.04],
];
// The inharmonic overtone is what makes a sparkle sound like glass and not like a beep.
const GLASS: Partials = [[2.76, 0.12]];

const BOX: RoomSpec = { size: 0.5, feedback: 0.4, damp: 0.5, mix: 0.1 };
const ROOM: RoomSpec = { size: 0.8, feedback: 0.5, damp: 0.45, mix: 0.16 };
const HALL: RoomSpec = { size: 1, feedback: 0.62, damp: 0.35, mix: 0.22 };

/** The recipes of each sound, one per clip, in the order of clipNames() in SoundCatalog. */
export const RECIPES: { readonly [id in SoundId]: ReadonlyArray<() => Track> } = {
    pop: POP_NOTES.map((_, level) => () => pop(level)),
    land: [land],
    swap: [swap],
    shuffle: [shuffle],
    superCreate: [superCreate],
    rocket: [rocket],
    bomb: [bomb],
    field: [field],
    reject: [reject],
    select: [select],
    click: [click],
    win: [win],
    lose: [lose],
};

/** A bubble bursting: the pitch shoots up from below, which is what makes a bloop and not a beep. */
function pop(level: number): Track {
    const share = level / (POP_NOTES.length - 1);
    const pitch = POP_NOTES[level];
    const length = 0.12 + 0.06 * share;
    const track = new Track(length);
    const random = new SeededRandom(100 + level);
    tone(track, {
        at: 0,
        length,
        freq: glide(pitch * 0.5, pitch * 1.12, 0.016),
        amp: pluck(0.002, 0.04 + 0.014 * share),
        partials: [
            [2, 0.1 + 0.25 * share],
            [3, 0.08 * share],
        ],
    });
    // A smaller bubble right after it, a fifth up.
    tone(track, {
        at: 0.022,
        length: length - 0.022,
        freq: glide(pitch * 0.75, pitch * 1.5, 0.012),
        amp: scaled(pluck(0.002, 0.025), 0.3),
    });
    noise(track, random, {
        at: 0,
        length: 0.006,
        amp: scaled(pluck(0.0004, 0.0012), 0.5),
        filter: { type: 'highpass', freq: constant(3000) },
    });
    if (share > 0.5) {
        tone(track, {
            at: 0.012,
            length: length - 0.012,
            freq: constant(pitch * 4),
            amp: scaled(pluck(0.001, 0.02), 0.14 * share),
            partials: GLASS,
        });
    }
    room(track, BOX);
    saturate(track, 1.3);
    return finish(track, -9 + 2.5 * share);
}

/** Soft wooden tick of a tile landing; quiet, because a column lands at once. */
function land(): Track {
    const length = 0.06;
    const track = new Track(length);
    const random = new SeededRandom(200);
    tone(track, {
        at: 0,
        length,
        freq: glide(1050, 820, 0.006),
        amp: pluck(0.0006, 0.011),
        partials: [[2.7, 0.25]],
    });
    tone(track, { at: 0, length, freq: glide(300, 190, 0.01), amp: scaled(pluck(0.001, 0.014), 0.6) });
    noise(track, random, {
        at: 0,
        length: 0.01,
        amp: scaled(pluck(0.0003, 0.0025), 0.6),
        filter: { type: 'bandpass', freq: constant(2400), q: 1.2 },
    });
    return finish(track, -14);
}

function swap(): Track {
    const length = 0.25;
    const track = new Track(length);
    const random = new SeededRandom(300);
    noise(track, random, {
        at: 0,
        length,
        amp: scaled(swell(length, 0.7), 1.6),
        filter: { type: 'bandpass', freq: sweep(450, 3800, length), q: 1.4 },
    });
    tone(track, {
        at: 0.02,
        length: 0.21,
        freq: sweep(330, 990, 0.2),
        amp: scaled(swell(0.21, 0.6), 0.22),
        partials: [[2, 0.25]],
    });
    room(track, BOX);
    return finish(track, -5);
}

/** Quick swishes back and forth, each with the flick of a card. */
function shuffle(): Track {
    const length = 0.5;
    const swishes = 6;
    const gap = 0.078;
    const swishLength = 0.085;
    const track = new Track(length);
    const random = new SeededRandom(400);
    for (let n = 0; n < swishes; n++) {
        const at = n * gap + random.next() * 0.008;
        const up = n % 2 === 0;
        noise(track, random, {
            at,
            length: swishLength,
            amp: scaled(swell(swishLength, up ? 0.6 : 0.4), (1.3 + 0.3 * random.next()) * (1 - 0.06 * n)),
            filter: {
                type: 'bandpass',
                freq: up ? sweep(900, 3200, swishLength) : sweep(3400, 1000, swishLength),
                q: 1.6,
            },
        });
        noise(track, random, {
            at,
            length: 0.006,
            amp: scaled(pluck(0.0003, 0.0015), 0.25),
            filter: { type: 'highpass', freq: constant(3500) },
        });
    }
    room(track, BOX);
    return finish(track, -5);
}

/** A whoop up into a fast strummed major chord, with glass sparkles on top. */
function superCreate(): Track {
    const length = 0.45;
    const track = new Track(length);
    const random = new SeededRandom(500);
    tone(track, {
        at: 0,
        length: 0.2,
        freq: sweep(380, 1500, 0.18),
        amp: scaled(swell(0.2, 0.75), 0.3),
        partials: [[2, 0.2]],
    });
    [NOTE.C6, NOTE.E6, NOTE.G6, NOTE.C7].forEach((pitch, n) => {
        const at = 0.05 + 0.035 * n;
        tone(track, {
            at,
            length: length - at,
            freq: constant(pitch),
            amp: scaled(pluck(0.003, 0.14), 0.32),
            partials: BELL,
        });
    });
    sparkles(track, random, 0.1, 0.42, 10, 0.12);
    room(track, ROOM);
    return finish(track, -4);
}

/** Air tearing past: band-passed noise sweeping down, a falling "pew" inside it and some rumble. */
function rocket(): Track {
    const length = 0.4;
    const track = new Track(length);
    const random = new SeededRandom(600);
    noise(track, random, {
        at: 0,
        length,
        amp: scaled(adsr(0.012, 0.06, 0.7, 0.26, length), 1.6),
        filter: { type: 'bandpass', freq: sweep(4500, 450, length), q: 0.9 },
    });
    tone(track, {
        at: 0,
        length: 0.32,
        freq: sweep(1600, 260, 0.3),
        amp: scaled(pluck(0.004, 0.08), 0.35),
        partials: [[2, 0.3]],
    });
    noise(track, random, {
        at: 0,
        length,
        amp: scaled(swell(length, 0.3), 2.5),
        filter: { type: 'lowpass', freq: constant(380) },
    });
    saturate(track, 1.5);
    room(track, BOX);
    return finish(track, -5);
}

/**
 * Phone speakers cannot play the 120 -> 40 Hz drop itself, so its overtones, the saturation
 * and the noise burst carry the punch there; headphones get the whole thing.
 */
function boom(length: number, from: number, to: number, tau: number, random: Random): Track {
    const track = new Track(length);
    tone(track, {
        at: 0,
        length,
        freq: glide(from, to, tau),
        amp: scaled(pluck(0.002, length * 0.29), 0.6),
        partials: [
            [2, 0.6],
            [3, 0.3],
        ],
    });
    tone(track, {
        at: 0,
        length: 0.15,
        freq: glide(from * 1.8, to * 1.7, 0.025),
        amp: scaled(pluck(0.001, 0.035), 0.9),
        partials: [[2, 0.4]],
    });
    noise(track, random, {
        at: 0,
        length: 0.3,
        amp: scaled(pluck(0.001, 0.08), 1.6),
        filter: { type: 'bandpass', freq: constant(650), q: 0.8 },
    });
    noise(track, random, {
        at: 0,
        length: 0.4,
        amp: scaled(pluck(0.001, 0.07), 2.4),
        filter: { type: 'lowpass', freq: sweep(6500, 260, 0.3), q: 0.8 },
    });
    noise(track, random, {
        at: 0.01,
        length: length - 0.01,
        amp: scaled(pluck(0.03, length * 0.3), 1.6),
        filter: { type: 'lowpass', freq: sweep(1200, 220, length * 0.85) },
    });
    noise(track, random, { at: 0, length: 0.004, amp: scaled(pluck(0.0002, 0.001), 0.8) });
    saturate(track, 2.8);
    return track;
}

function bomb(): Track {
    const track = boom(0.7, 120, 40, 0.07, new SeededRandom(700));
    room(track, { size: 0.9, feedback: 0.5, damp: 0.5, mix: 0.15 });
    return finish(track, -3);
}

/** The biggest hit: a deeper boom, a rising whoosh and a shimmering major chord that sparkles out. */
function field(): Track {
    const length = 1;
    const random = new SeededRandom(800);
    const track = new Track(length);
    track.mix(boom(length, 100, 34, 0.09, random), 1);
    noise(track, random, {
        at: 0,
        length: 0.5,
        amp: scaled(swell(0.5, 0.3), 0.8),
        filter: { type: 'bandpass', freq: sweep(400, 5000, 0.5), q: 1.2 },
    });
    [NOTE.C6, NOTE.E6, NOTE.G6, NOTE.C7, NOTE.E7].forEach((pitch, n) => {
        tone(track, {
            at: 0.04,
            length: length - 0.04,
            freq: constant(pitch),
            amp: scaled(wobble(adsr(0.06, 0.3, 0.45, 0.5, length - 0.04), 9 + n, 0.35), 0.07),
            partials: [[2, 0.1]],
        });
    });
    sparkles(track, random, 0.08, 0.95, 26, 0.1);
    room(track, HALL);
    return finish(track, -3);
}

/** A soft rubbery bonk: low enough to say "no", short enough not to scold. */
function reject(): Track {
    const length = 0.12;
    const track = new Track(length);
    tone(track, {
        at: 0,
        length,
        freq: glide(260, 170, 0.03),
        amp: pluck(0.003, 0.035),
        partials: [
            [2, 0.8],
            [3, 0.3],
        ],
    });
    tone(track, { at: 0, length: 0.05, freq: constant(560), amp: scaled(pluck(0.001, 0.01), 0.25) });
    return finish(track, -6);
}

function select(): Track {
    const length = 0.08;
    const track = new Track(length);
    tone(track, {
        at: 0,
        length,
        freq: glide(1250, 1760, 0.01),
        amp: pluck(0.002, 0.022),
        partials: [[2, 0.15]],
    });
    tone(track, {
        at: 0.012,
        length: length - 0.012,
        freq: constant(NOTE.E7),
        amp: scaled(pluck(0.001, 0.015), 0.15),
    });
    return finish(track, -8);
}

function click(): Track {
    const length = 0.05;
    const track = new Track(length);
    const random = new SeededRandom(1100);
    tone(track, { at: 0, length, freq: glide(2600, 1800, 0.004), amp: pluck(0.0005, 0.006) });
    tone(track, { at: 0, length, freq: glide(600, 380, 0.006), amp: scaled(pluck(0.001, 0.01), 0.6) });
    noise(track, random, {
        at: 0,
        length: 0.006,
        amp: scaled(pluck(0.0002, 0.0015), 0.5),
        filter: { type: 'bandpass', freq: constant(4000), q: 1 },
    });
    return finish(track, -7);
}

/** Arpeggio up to a held major chord with a little vibrato, a whoosh into it and sparkles over it. */
function win(): Track {
    const length = 1.4;
    const chordAt = 0.4;
    const chordLength = length - chordAt;
    const track = new Track(length);
    const random = new SeededRandom(1200);
    [NOTE.C5, NOTE.E5, NOTE.G5, NOTE.C6].forEach((pitch, n) => {
        tone(track, {
            at: n * 0.09,
            length: 0.5,
            freq: constant(pitch),
            amp: scaled(pluck(0.004, 0.16), 0.4),
            wave: 'triangle',
            partials: [[2, 0.25]],
        });
    });
    noise(track, random, {
        at: 0.24,
        length: 0.18,
        amp: scaled(swell(0.18, 0.85), 0.5),
        filter: { type: 'bandpass', freq: sweep(900, 6000, 0.18), q: 1.3 },
    });
    [NOTE.C5, NOTE.G5, NOTE.C6, NOTE.E6, NOTE.G6].forEach((pitch) => {
        tone(track, {
            at: chordAt,
            length: chordLength,
            freq: wobble(constant(pitch), 5.5, 0.004),
            amp: scaled(adsr(0.012, 0.15, 0.55, 0.6, chordLength), 0.16),
            wave: 'triangle',
            partials: [[2, 0.12]],
        });
    });
    tone(track, {
        at: chordAt,
        length: chordLength,
        freq: constant(NOTE.C4),
        amp: scaled(pluck(0.006, 0.3), 0.35),
        partials: [[2, 0.3]],
    });
    sparkles(track, random, chordAt, length - 0.1, 22, 0.1);
    room(track, HALL);
    return finish(track, -3);
}

/** Three soft notes down an A minor chord; the last one sags a semitone. */
function lose(): Track {
    const length = 1;
    const notes = [NOTE.E4, NOTE.C4, NOTE.A3];
    const track = new Track(length);
    notes.forEach((pitch, n) => {
        const at = n * 0.24;
        const last = n === notes.length - 1;
        const noteLength = last ? length - at : 0.34;
        tone(track, {
            at,
            length: noteLength,
            freq: last ? wobble(glide(pitch, pitch * 0.944, 0.35), 5, 0.006) : constant(pitch),
            amp: scaled(last ? adsr(0.02, 0.1, 0.7, 0.4, noteLength) : pluck(0.02, 0.12), 0.5),
            wave: 'triangle',
            partials: [[2, 0.18]],
        });
    });
    filtered(track, 'lowpass', 2400);
    room(track, { size: 1, feedback: 0.55, damp: 0.5, mix: 0.18 });
    return finish(track, -6);
}

/** Glass pings on a high pentatonic, denser at the start and thinning out. */
function sparkles(track: Track, random: Random, from: number, to: number, count: number, gain: number): void {
    for (let n = 0; n < count; n++) {
        const share = random.next() * random.next();
        tone(track, {
            at: from + (to - from) * share,
            length: 0.08,
            freq: constant(SPARKLE_NOTES[randomInt(random, SPARKLE_NOTES.length)]),
            amp: scaled(pluck(0.001, 0.02), gain * (1 - 0.6 * share)),
            partials: GLASS,
        });
    }
}
