import { gridPos, GridPos } from '../assets/scripts/core/board/GridPos';
import { BurnWave } from '../assets/scripts/core/burn/BurnResolver';
import { BurnStep } from '../assets/scripts/core/game/TurnStep';
import { Tile } from '../assets/scripts/core/tiles/Tile';
import { BlastPresenter, BlastPresenters } from '../assets/scripts/view/animation/blast/BlastPresenters';
import { BurnAnimator } from '../assets/scripts/view/animation/BurnAnimator';
import { NoSound } from '../assets/scripts/view/animation/Silent';
import { TileStage } from '../assets/scripts/view/animation/TileStage';
import { BoardLayout, Point } from '../assets/scripts/view/BoardLayout';
import { BoardEffects } from '../assets/scripts/view/fx/BoardEffects';
import { Texts } from '../assets/scripts/view/Texts';

/** The presenters are fakes, so only what the animator does itself reaches the effects. */
class RecordingEffects implements BoardEffects {
    readonly praised: string[] = [];
    readonly popups: Array<{ at: Point; points: number }> = [];

    praise(text: string): void {
        this.praised.push(text);
    }

    scorePopup(at: Point, points: number): void {
        this.popups.push({ at, points });
    }

    burst(): void {}

    shockwave(): void {}

    flash(): void {}

    rocket(): Promise<void> {
        return Promise.resolve();
    }

    confetti(): void {}
}

/** Logs when each wave starts and ends, so the test sees whether waves overlap. */
class RecordingPresenter implements BlastPresenter {
    constructor(
        private readonly name: string,
        private readonly log: string[],
    ) {}

    async play(): Promise<void> {
        this.log.push(`${this.name} starts`);
        await Promise.resolve();
        this.log.push(`${this.name} ends`);
    }
}

let nextId = 1;

function wave(blast: string | null, origin: GridPos, ...cells: GridPos[]): BurnWave {
    return { origin, blast, tiles: cells.map((at) => ({ tile: Tile.ofColor(nextId++, 0), at })) };
}

function burnStep(waves: BurnWave[], fromGroup: boolean, points = 100): BurnStep {
    return { type: 'burn', waves, fromGroup, collapseTo: null, points };
}

/** A row of `size` tiles from the bottom-left corner: a tapped group that does not earn a super tile. */
function groupOf(size: number): BurnWave {
    const cells = Array.from({ length: size }, (_, col) => gridPos(col, 0));
    return wave(null, gridPos(0, 0), ...cells);
}

describe('BurnAnimator', () => {
    let log: string[];
    let effects: RecordingEffects;
    let stage: TileStage;
    let animator: BurnAnimator;

    beforeEach(() => {
        log = [];
        effects = new RecordingEffects();
        const fake: Pick<TileStage, 'layout' | 'effects' | 'sound' | 'wait'> = {
            layout: new BoardLayout(10, 3, 100, 100),
            effects,
            sound: new NoSound(),
            wait: () => Promise.resolve(),
        };
        stage = fake as TileStage;
        animator = new BurnAnimator(
            new BlastPresenters(new RecordingPresenter('pop', log))
                .register('row', new RecordingPresenter('rocket', log))
                .register('bomb', new RecordingPresenter('bomb', log)),
        );
    });

    it('plays chain waves one after another with the look of what fired them, skipping empty ones', async () => {
        const step = burnStep(
            [
                wave('row', gridPos(1, 1), gridPos(0, 1), gridPos(1, 1)),
                wave('bomb', gridPos(0, 1), gridPos(0, 0)),
                wave('bomb', gridPos(2, 2)),
                wave('rainbow', gridPos(2, 0), gridPos(2, 0)),
            ],
            false,
        );

        await animator.play(step, stage);

        expect(log).toEqual(['rocket starts', 'rocket ends', 'bomb starts', 'bomb ends', 'pop starts', 'pop ends']);
    });

    it('shows the points of the step once, at the middle of the tapped group', async () => {
        await animator.play(burnStep([groupOf(3)], true, 60), stage);

        expect(effects.popups).toEqual([{ at: stage.layout.cellCenter(1, 0), points: 60 }]);
    });

    it('praises a tapped group by its size', async () => {
        for (const size of [5, 6, 8, 10]) {
            await animator.play(burnStep([groupOf(size)], true), stage);
        }

        expect(effects.praised).toEqual([Texts.praise.good, Texts.praise.great, Texts.praise.awesome]);
    });

    it('leaves the praise of explosions to their own looks', async () => {
        await animator.play(
            burnStep([wave('bomb', gridPos(0, 0), ...groupOf(9).tiles.map((t) => t.at))], false),
            stage,
        );

        expect(effects.praised).toEqual([]);
    });
});
