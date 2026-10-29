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

/** What the views may do with sound. The implementation owns the clips and the mute state. */
export interface SoundBoard {
    readonly muted: boolean;
    /** intensity 0..1: bigger groups pop higher and louder. Ignored by sounds without variants. */
    play(id: SoundId, intensity?: number): void;
    setMuted(muted: boolean): void;
}
