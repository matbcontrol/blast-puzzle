/** The part of the browser AudioContext the unlock uses. */
export interface AudioContextLike {
    readonly state: string;
    readonly currentTime: number;
    resume(): Promise<void>;
}

/** Where gestures are heard; window in the browser. */
export interface GestureSource {
    addEventListener(type: string, listener: () => void, capture: boolean): void;
    removeEventListener(type: string, listener: () => void, capture: boolean): void;
}

// The events browsers accept as user activation for audio. touchstart and a touch pointerdown are not among them.
const GESTURES = ['touchend', 'mousedown', 'pointerup', 'keydown'];

/**
 * Browsers keep Web Audio suspended until the first user gesture. The engine would queue every sound
 * asked for until then and fire the whole queue on the next touch, so nothing is played while
 * the context is locked, and the first gesture resumes it.
 *
 * The context reports running only a few frames after that gesture, while the game handles the same touch
 * at once. `resuming` covers that gap, and `onResumed` says when it closes.
 */
export class AudioUnlock {
    private listening = false;
    private pending = false;

    constructor(
        private readonly contextOf: () => AudioContextLike | null,
        private readonly gestures: GestureSource | null,
        private readonly onResumed: () => void,
    ) {}

    /** Without Web Audio the engine falls back to DOM audio, which handles gestures itself. */
    get ready(): boolean {
        const context = this.contextOf();
        // A context that has run before was interrupted (a call, the app in background); the engine resumes those.
        return context === null || context.state === 'running' || context.currentTime > 0;
    }

    /** A gesture asked the context to resume and the browser has not confirmed it yet. */
    get resuming(): boolean {
        return this.pending;
    }

    start(): void {
        const gestures = this.gestures;
        if (this.listening || gestures === null || this.ready) {
            return;
        }
        this.listening = true;
        // Capture phase: the context starts resuming before the engine handles the same touch.
        GESTURES.forEach((type) => gestures.addEventListener(type, this.onGesture, true));
    }

    stop(): void {
        const gestures = this.gestures;
        if (!this.listening || gestures === null) {
            return;
        }
        this.listening = false;
        GESTURES.forEach((type) => gestures.removeEventListener(type, this.onGesture, true));
    }

    private readonly onGesture = (): void => {
        const context = this.contextOf();
        if (context === null || context.state === 'running') {
            this.stop();
            return;
        }
        let resumed: Promise<void> | undefined;
        try {
            resumed = context.resume();
        } catch {
            // Old WebKit has no resume() or returns no promise; the next gesture tries again.
        }
        if (resumed === undefined) {
            return;
        }
        this.pending = true;
        resumed.then(this.onResume, this.onRefuse);
    };

    // One tap fires pointerup and touchend, so two resumes can settle; the first one reports.
    private readonly onResume = (): void => {
        this.stop();
        if (this.pending) {
            this.pending = false;
            this.onResumed();
        }
    };

    private readonly onRefuse = (): void => {
        this.pending = false;
    };
}
