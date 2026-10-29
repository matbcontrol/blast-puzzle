import { AudioContextLike, AudioUnlock, GestureSource } from './AudioUnlock';
import { KeyValueStore, MutePreference } from './MutePreference';
import { SoundBoard, SoundId } from './SoundBoard';
import { pickVariant, SoundThrottle, VoiceLimit } from './SoundThrottle';

const { ccclass, property } = cc._decorator;

/** Loudness between sounds is baked into the clips by tools/sfx; here is only the overall level. */
export const SoundMix = {
    masterVolume: 0.8,
    /** For a clip that does not know its length yet. */
    fallbackDurationMs: 200,
};

/** How often each sound may restart; see SoundThrottle. */
export const SoundLimits: { readonly [id in SoundId]?: VoiceLimit } & { readonly default: VoiceLimit } = {
    default: { minGapMs: 40, maxOverlap: 2 },
    pop: { minGapMs: 40, maxOverlap: 3 },
    land: { minGapMs: 45, maxOverlap: 2 },
    rocket: { minGapMs: 60, maxOverlap: 2 },
    bomb: { minGapMs: 80, maxOverlap: 2 },
    field: { minGapMs: 250, maxOverlap: 1 },
    win: { minGapMs: 1000, maxOverlap: 1 },
    lose: { minGapMs: 1000, maxOverlap: 1 },
};

/** Plays the game's sound effects through cc.audioEngine. Each clip property is named after its SoundId. */
@ccclass
export class SoundBank extends cc.Component implements SoundBoard {
    @property({ type: [cc.AudioClip], tooltip: 'pop_0..pop_4: bigger groups pick later, brighter variants' })
    pop: cc.AudioClip[] = [];

    @property(cc.AudioClip)
    land: cc.AudioClip = null!;

    @property(cc.AudioClip)
    swap: cc.AudioClip = null!;

    @property(cc.AudioClip)
    shuffle: cc.AudioClip = null!;

    @property(cc.AudioClip)
    superCreate: cc.AudioClip = null!;

    @property(cc.AudioClip)
    rocket: cc.AudioClip = null!;

    @property(cc.AudioClip)
    bomb: cc.AudioClip = null!;

    @property(cc.AudioClip)
    field: cc.AudioClip = null!;

    @property(cc.AudioClip)
    reject: cc.AudioClip = null!;

    @property(cc.AudioClip)
    select: cc.AudioClip = null!;

    @property(cc.AudioClip)
    click: cc.AudioClip = null!;

    @property(cc.AudioClip)
    win: cc.AudioClip = null!;

    @property(cc.AudioClip)
    lose: cc.AudioClip = null!;

    private readonly throttle = new SoundThrottle<SoundId>((id) => SoundLimits[id] || SoundLimits.default);
    private readonly preference = new MutePreference(browserStorage());
    private readonly unlock = new AudioUnlock(engineAudioContext, browserGestures());
    private readonly reportedMissing: SoundId[] = [];
    private isMuted = false;

    get muted(): boolean {
        return this.isMuted;
    }

    onLoad(): void {
        this.isMuted = this.preference.load();
        cc.audioEngine.setEffectsVolume(SoundMix.masterVolume);
        this.unlock.start();
    }

    onDestroy(): void {
        this.unlock.stop();
        cc.audioEngine.stopAllEffects();
    }

    play(id: SoundId, intensity = 0): void {
        if (this.isMuted || !this.unlock.ready) {
            return;
        }
        const clip = this.clipFor(id, intensity);
        if (!clip) {
            this.reportMissing(id);
            return;
        }
        const durationMs = clip.duration > 0 ? clip.duration * 1000 : SoundMix.fallbackDurationMs;
        if (this.throttle.tryStart(id, cc.director.getTotalTime(), durationMs)) {
            cc.audioEngine.playEffect(clip, false);
        }
    }

    setMuted(muted: boolean): void {
        this.isMuted = muted;
        this.preference.save(muted);
        if (muted) {
            cc.audioEngine.stopAllEffects();
            this.throttle.reset();
        }
    }

    private clipFor(id: SoundId, intensity: number): cc.AudioClip | null {
        if (id === 'pop') {
            return this.pop.length > 0 ? this.pop[pickVariant(intensity, this.pop.length)] : null;
        }
        // A SoundId added to the contract without a clip property here does not compile.
        return this[id];
    }

    private reportMissing(id: SoundId): void {
        if (this.reportedMissing.indexOf(id) < 0) {
            this.reportedMissing.push(id);
            cc.warn(`SoundBank: no clip for "${id}"`);
        }
    }
}

/** The engine plays Web Audio through its own context and exposes it only here. */
function engineAudioContext(): AudioContextLike | null {
    const support = (cc.sys as unknown as { __audioSupport?: { context?: AudioContextLike } }).__audioSupport;
    return support && support.context ? support.context : null;
}

function browserGestures(): GestureSource | null {
    return typeof window === 'undefined' ? null : window;
}

function browserStorage(): KeyValueStore | null {
    try {
        return cc.sys.localStorage || null;
    } catch {
        return null;
    }
}
