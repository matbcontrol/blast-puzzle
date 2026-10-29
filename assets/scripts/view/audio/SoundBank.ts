import { AudioContextLike, AudioUnlock, GestureSource } from './AudioUnlock';
import { KeyValueStore, MutePreference } from './MutePreference';
import { ResumeQueue } from './ResumeQueue';
import { SOUND_DIR, SoundShelf } from './SoundCatalog';
import { SoundId, SoundPlayer } from './SoundPlayer';
import { SoundSwitch } from './SoundSwitch';
import { SoundThrottle, VoiceLimit } from './SoundThrottle';

const { ccclass } = cc._decorator;

type VoiceLimits = { readonly [id in SoundId]?: VoiceLimit } & { readonly default: VoiceLimit };

/** How often each sound may restart; see SoundThrottle. */
const VOICE_LIMITS: VoiceLimits = {
    default: { minGapMs: 40, maxOverlap: 2 },
    pop: { minGapMs: 40, maxOverlap: 3 },
    land: { minGapMs: 45, maxOverlap: 2 },
    rocket: { minGapMs: 60, maxOverlap: 2 },
    bomb: { minGapMs: 80, maxOverlap: 2 },
    field: { minGapMs: 250, maxOverlap: 1 },
    win: { minGapMs: 1000, maxOverlap: 1 },
    lose: { minGapMs: 1000, maxOverlap: 1 },
};

/** Loudness between sounds is baked into the clips by tools/sfx; here are the overall level and the timing rules. */
export const SoundBankFeel = {
    masterVolume: 0.8,
    /** For a clip that does not know its length yet. */
    fallbackDurationMs: 200,
    /** A sound asked for while the first gesture unlocks audio still plays if the unlock takes no longer. */
    unlockGraceMs: 150,
    /** The first tap asks for a few sounds at most. */
    heldDuringUnlock: 4,
    voiceLimits: VOICE_LIMITS,
};

interface SoundRequest {
    readonly id: SoundId;
    readonly intensity: number;
}

/**
 * Plays the game's sound effects through cc.audioEngine. The clips load from resources after the scene
 * starts: nothing can be heard before the first gesture anyway, so they stay off the first frame's path,
 * and the game is silent until they arrive.
 */
@ccclass
export class SoundBank extends cc.Component implements SoundPlayer, SoundSwitch {
    private readonly shelf = new SoundShelf<cc.AudioClip>();
    private readonly throttle = new SoundThrottle<SoundId>(
        (id) => SoundBankFeel.voiceLimits[id] || SoundBankFeel.voiceLimits.default,
    );
    private readonly preference = new MutePreference(browserStorage());
    private readonly unlock = new AudioUnlock(engineAudioContext, browserGestures(), () => this.playHeld());
    private readonly held = new ResumeQueue<SoundRequest>(SoundBankFeel.unlockGraceMs, SoundBankFeel.heldDuringUnlock);
    private isMuted = false;

    get muted(): boolean {
        return this.isMuted;
    }

    onLoad(): void {
        this.isMuted = this.preference.load();
        cc.audioEngine.setEffectsVolume(SoundBankFeel.masterVolume);
        if (cc.sys.isBrowser && engineAudioSupport() === undefined) {
            cc.warn(
                'SoundBank: cc.sys.__audioSupport is gone (engine newer than 2.4?), the first touch may burst sounds',
            );
        }
        this.unlock.start();
    }

    start(): void {
        cc.resources.loadDir(SOUND_DIR, cc.AudioClip, (error, clips) => this.shelve(error, clips));
    }

    onDestroy(): void {
        this.unlock.stop();
        cc.audioEngine.stopAllEffects();
    }

    play(id: SoundId, intensity = 0): void {
        if (this.isMuted) {
            return;
        }
        if (this.unlock.ready) {
            this.startClip(id, intensity);
        } else if (this.unlock.resuming) {
            this.held.push({ id, intensity }, cc.director.getTotalTime());
        }
    }

    setMuted(muted: boolean): void {
        this.isMuted = muted;
        this.preference.save(muted);
        if (muted) {
            cc.audioEngine.stopAllEffects();
            this.throttle.reset();
            this.held.clear();
        }
    }

    private startClip(id: SoundId, intensity: number): void {
        const clip = this.shelf.pick(id, intensity);
        if (clip === null) {
            return;
        }
        const durationMs = clip.duration > 0 ? clip.duration * 1000 : SoundBankFeel.fallbackDurationMs;
        if (this.throttle.tryStart(id, cc.director.getTotalTime(), durationMs)) {
            cc.audioEngine.playEffect(clip, false);
        }
    }

    private playHeld(): void {
        this.held.drain(cc.director.getTotalTime()).forEach((request) => this.play(request.id, request.intensity));
    }

    private shelve(error: Error | null, clips: cc.AudioClip[] | null): void {
        if (!this.isValid) {
            return;
        }
        (clips || []).forEach((clip) => this.shelf.put(clip.name, clip));
        const missing = this.shelf.missing();
        if (error) {
            cc.warn(`SoundBank: resources/${SOUND_DIR} did not load, the game stays silent`, error);
        } else if (missing.length > 0) {
            cc.warn(`SoundBank: no clip for ${missing.join(', ')} in resources/${SOUND_DIR}`);
        }
    }
}

interface EngineAudioSupport {
    readonly context?: AudioContextLike;
}

/**
 * The engine plays Web Audio through its own context and exposes it only in this private field of 2.4.
 * When it is missing, the unlock cannot see the locked context and lets every sound through.
 */
function engineAudioSupport(): EngineAudioSupport | undefined {
    return (cc.sys as unknown as { __audioSupport?: EngineAudioSupport }).__audioSupport;
}

function engineAudioContext(): AudioContextLike | null {
    const support = engineAudioSupport();
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
