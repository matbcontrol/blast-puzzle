import { AudioContextLike, AudioUnlock, GestureSource } from '../assets/scripts/view/audio/AudioUnlock';

/** Like a browser: resume() returns at once, the state flips to running only when the promise settles. */
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
        return Promise.resolve().then(() => {
            this.state = 'running';
        });
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
    let resumes: number;
    let unlock: AudioUnlock;

    beforeEach(() => {
        context = new FakeContext();
        gestures = new FakeWindow();
        resumes = 0;
        unlock = new AudioUnlock(
            () => context,
            gestures,
            () => resumes++,
        );
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

    it('is resuming while the browser has not confirmed, which is when the game handles the same tap', async () => {
        unlock.start();

        gestures.fire('touchend');
        expect(unlock.ready).toBe(false);
        expect(unlock.resuming).toBe(true);
        expect(resumes).toBe(0);

        await flushPromises();
        expect(unlock.resuming).toBe(false);
        expect(resumes).toBe(1);
    });

    it('reports the resume once when one tap fires several gesture events', async () => {
        unlock.start();

        gestures.fire('pointerup');
        gestures.fire('touchend');
        await flushPromises();

        expect(context.resumeCalls).toBe(2);
        expect(resumes).toBe(1);
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
        expect(unlock.resuming).toBe(false);
        expect(resumes).toBe(0);

        context.refuse = false;
        gestures.fire('keydown');
        await flushPromises();
        expect(unlock.ready).toBe(true);
        expect(resumes).toBe(1);
        expect(gestures.listeners.size).toBe(0);
    });

    it('survives a context without a resume promise', () => {
        const legacy = { state: 'suspended', currentTime: 0, resume: () => undefined as unknown as Promise<void> };
        const old = new AudioUnlock(
            () => legacy,
            gestures,
            () => resumes++,
        );
        old.start();

        expect(() => gestures.fire('touchend')).not.toThrow();
        expect(old.resuming).toBe(false);
    });

    it('leaves an interrupted context that has run before to the engine', () => {
        context.currentTime = 12;

        expect(unlock.ready).toBe(true);
    });

    it('is ready without Web Audio', () => {
        expect(
            new AudioUnlock(
                () => null,
                gestures,
                () => undefined,
            ).ready,
        ).toBe(true);
    });

    it('stops listening when stopped', () => {
        unlock.start();
        unlock.stop();

        expect(gestures.listeners.size).toBe(0);
    });
});
