/** The mute switch. Only the button that flips it gets this. */
export interface SoundSwitch {
    readonly muted: boolean;
    setMuted(muted: boolean): void;
}

/** Until GameBootstrap wires the sound: the switch still flips, and nothing plays. */
export class NoSoundSwitch implements SoundSwitch {
    muted = false;

    setMuted(muted: boolean): void {
        this.muted = muted;
    }
}
