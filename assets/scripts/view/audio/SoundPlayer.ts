export type SoundId =
    | 'pop'
    | 'land'
    | 'swap'
    | 'shuffle'
    | 'superCreate'
    | 'rocket'
    | 'bomb'
    | 'field'
    | 'reject'
    | 'select'
    | 'click'
    | 'win'
    | 'lose';

/** What views and animators may do with sound: ask for one. Whether it is heard is not their business. */
export interface SoundPlayer {
    /** intensity 0..1: bigger groups pop higher and louder. Ignored by sounds without variants. */
    play(id: SoundId, intensity?: number): void;
}

/** Until the scene wires the real sound, so a view plays without it. */
export class NoSound implements SoundPlayer {
    play(): void {}
}
