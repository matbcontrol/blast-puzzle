import { AudioContextLike, AudioUnlock, GestureSource } from '../assets/scripts/view/audio/AudioUnlock';

class FakeContext implements AudioContextLike {
    state = 'suspended';
    currentTime = 0;
    resumeCalls = 0;
    refuse = false;

    resume(): Promise<void> {
        this.resumeCalls++;
        if (this.refuse) {
            return Promise.reject(new Error('NotAllowedError'));
        }
        this.state = 'running';
        return Promise.resolve();
    }
}

class FakeWindow implements GestureSource {
    readonly listeners = new Map<string, () => void>();

    addEventListener(type: string, listener: () => void, capture: boolean): void {
        expect(capture).toBe(true);
        this.listeners.set(type, listener);
    }

    removeEventListener(type: string): void {
        this.listeners.delete(type);
    }

    fire(type: string): void {
        const listener = this.listeners.get(type);
        if (listener) {
            listener();
        }
    }
}

const flushPromises = (): Promise<void> => new Promise((resolve) => setImmediate(resolve));

describe('AudioUnlock', () => {
    let context: FakeContext;
    let gestures: FakeWindow;
    let unlock: AudioUnlock;

    beforeEach(() => {
        context = new FakeContext();
        gestures = new FakeWindow();
        unlock = new AudioUnlock(() => context, gestures);
    });

    it('holds sounds back until the first gesture resumes the context', async () => {
        unlock.start();
        expect(unlock.ready).toBe(false);

        gestures.fire('touchend');
        await flushPromises();

        expect(context.resumeCalls).toBe(1);
        expect(unlock.ready).toBe(true);
        expect(gestures.listeners.size).toBe(0);
    });

    it('does not listen when the context already runs', () => {
        context.state = 'running';
        unlock.start();

        expect(unlock.ready).toBe(true);
        expect(gestures.listeners.size).toBe(0);
    });

    it('keeps listening while the browser refuses to resume', async () => {
        context.refuse = true;
        unlock.start();

        gestures.fire('mousedown');
        await flushPromises();
        expect(unlock.ready).toBe(false);

        context.refuse = false;
        gestures.fire('keydown');
        await flushPromises();
        expect(unlock.ready).toBe(true);
        expect(gestures.listeners.size).toBe(0);
    });

    it('leaves an interrupted context that has run before to the engine', () => {
        context.currentTime = 12;

        expect(unlock.ready).toBe(true);
    });

    it('is ready without Web Audio', () => {
        expect(new AudioUnlock(() => null, gestures).ready).toBe(true);
    });

    it('stops listening when stopped', () => {
        unlock.start();
        unlock.stop();

        expect(gestures.listeners.size).toBe(0);
    });
});
