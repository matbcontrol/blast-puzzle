import { BurnWave } from '../../../core/burn/BurnResolver';
import { TileStage } from '../TileStage';

/** The look of one burn wave. */
export interface BlastPresenter {
    /** Burns every tile of the wave and resolves when the last one is gone. */
    play(wave: BurnWave, stage: TileStage): Promise<void>;
}

/**
 * Looks of the waves by what fired them (BurnWave.blast). A new super tile or booster adds a presenter and
 * one register() call. A tapped group, or a blast without a look of its own, gets the fallback.
 */
export class BlastPresenters {
    private readonly presenters = new Map<string, BlastPresenter>();

    constructor(private readonly fallback: BlastPresenter) {}

    register(blast: string, presenter: BlastPresenter): this {
        if (this.presenters.has(blast)) {
            throw new Error(`Blast "${blast}" is already registered`);
        }
        this.presenters.set(blast, presenter);
        return this;
    }

    forWave(wave: BurnWave): BlastPresenter {
        const presenter = wave.blast === null ? undefined : this.presenters.get(wave.blast);
        return presenter === undefined ? this.fallback : presenter;
    }
}
