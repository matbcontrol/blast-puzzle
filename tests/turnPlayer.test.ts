import { TurnStep } from '../assets/scripts/core/game/TurnStep';
import { NoEffects, NoSound } from '../assets/scripts/view/animation/Silent';
import { StepAnimator, StepType } from '../assets/scripts/view/animation/StepAnimator';
import { TileStage } from '../assets/scripts/view/animation/TileStage';
import { TurnPlayer } from '../assets/scripts/view/animation/TurnPlayer';

interface Span {
    readonly type: StepType;
    readonly start: number;
    readonly end: number;
}

/** Takes a fixed time on the stage clock and records when it ran, in ms of fake time. */
class TimedAnimator implements StepAnimator {
    constructor(
        readonly type: StepType,
        private readonly seconds: number,
        private readonly spans: Span[],
    ) {}

    async play(_step: TurnStep, stage: TileStage): Promise<void> {
        const start = Date.now();
        await stage.wait(this.seconds);
        this.spans.push({ type: this.type, start, end: Date.now() });
    }
}

const burn: TurnStep = { type: 'burn', waves: [], fromGroup: true, collapseTo: null, points: 0 };
const fall: TurnStep = { type: 'fall', moves: [] };
const refill: TurnStep = { type: 'refill', tiles: [] };

describe('TurnPlayer', () => {
    let spans: Span[];
    let player: TurnPlayer;

    beforeEach(() => {
        jest.useFakeTimers({ now: 0 });
        spans = [];
        const stage: Pick<TileStage, 'wait' | 'effects' | 'sound'> = {
            wait: (seconds) => new Promise<void>((resolve) => setTimeout(resolve, seconds * 1000)),
            effects: new NoEffects(),
            sound: new NoSound(),
        };
        player = new TurnPlayer(stage as TileStage)
            .register(new TimedAnimator('burn', 0.3, spans))
            .register(new TimedAnimator('fall', 0.4, spans))
            .register(new TimedAnimator('refill', 0.5, spans));
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    async function play(steps: TurnStep[]): Promise<void> {
        const done = player.play(steps);
        await jest.runAllTimersAsync();
        await done;
    }

    function spanOf(type: StepType): Span {
        const span = spans.filter((s) => s.type === type)[0];
        if (span === undefined) {
            throw new Error(`"${type}" did not play`);
        }
        return span;
    }

    it('waits for the burn before refilling when nothing falls', async () => {
        await play([burn, refill]);

        expect(spanOf('burn')).toEqual({ type: 'burn', start: 0, end: 300 });
        expect(spanOf('refill')).toEqual({ type: 'refill', start: 300, end: 800 });
    });

    it('drops new tiles while the old ones are still falling', async () => {
        await play([burn, fall, refill]);

        expect(spanOf('fall')).toEqual({ type: 'fall', start: 300, end: 700 });
        expect(spanOf('refill')).toEqual({ type: 'refill', start: 300, end: 800 });
    });
});
