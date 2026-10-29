import { GridPos, gridPos } from '../assets/scripts/core/board/GridPos';
import { BurnStep, TurnStep } from '../assets/scripts/core/game/TurnStep';
import { Tile } from '../assets/scripts/core/tiles/Tile';
import { NoSound } from '../assets/scripts/view/audio/SoundPlayer';
import { ColumnGates } from '../assets/scripts/view/animation/ColumnGates';
import { StepAnimator, StepType } from '../assets/scripts/view/animation/StepAnimator';
import { TileStage, TurnStage } from '../assets/scripts/view/animation/TileStage';
import { createTurnPlayer } from '../assets/scripts/view/animation/TurnAnimations';
import { TurnPlayer } from '../assets/scripts/view/animation/TurnPlayer';
import { NoEffects } from '../assets/scripts/view/fx/NoEffects';
import { groupBurn, withPoints } from './helpers/steps';

/** When something started or ended, in ms of fake time. */
interface Mark {
    readonly what: string;
    readonly at: number;
}

const wait = (seconds: number) => new Promise<void>((resolve) => setTimeout(resolve, seconds * 1000));

/** Takes a fixed time and records when it ran. */
class TimedAnimator implements StepAnimator {
    constructor(
        readonly type: StepType,
        private readonly seconds: number,
        private readonly marks: Mark[],
    ) {}

    async play(): Promise<void> {
        this.marks.push({ what: `${this.type} starts`, at: Date.now() });
        await wait(this.seconds);
        this.marks.push({ what: `${this.type} ends`, at: Date.now() });
    }
}

/** Removes the tiles of each column after that column's own delay, the way a rocket clears cell by cell. */
class ColumnBurn implements StepAnimator<'burn'> {
    readonly type = 'burn';

    constructor(private readonly delayOf: (col: number) => number) {}

    async play(step: BurnStep, stage: TurnStage): Promise<void> {
        const tiles = step.cause === 'group' ? step.group.tiles : [];
        await Promise.all(
            tiles.map(async (burned) => {
                await wait(this.delayOf(burned.at.col));
                stage.remove(burned.tile.id);
            }),
        );
    }
}

/** Records when each column of a fall or a refill was let go. */
class ColumnSettler implements StepAnimator {
    constructor(
        readonly type: 'fall' | 'refill',
        private readonly marks: Mark[],
    ) {}

    async play(step: TurnStep, stage: TurnStage): Promise<void> {
        const cols = step.type === 'fall' ? step.moves.map((m) => m.to.col) : [];
        if (step.type === 'refill') {
            step.tiles.forEach((spawned) => cols.push(spawned.at.col));
        }
        await Promise.all(
            cols.map(async (col) => {
                await stage.columnSettled(col);
                this.marks.push({ what: `${this.type} ${col}`, at: Date.now() });
                await wait(0.1);
            }),
        );
    }
}

let nextId = 1;

function burnIn(...cells: GridPos[]): TurnStep {
    return withPoints(groupBurn(cells), 0);
}

function fallIn(...cols: number[]): TurnStep {
    return {
        type: 'fall',
        moves: cols.map((col) => ({ tileId: nextId++, from: gridPos(col, 5), to: gridPos(col, 0) })),
    };
}

function refillIn(...cols: number[]): TurnStep {
    return {
        type: 'refill',
        tiles: cols.map((col) => ({ tile: Tile.ofColor(nextId++, 0), at: gridPos(col, 9), startRow: 10 })),
    };
}

function superAt(col: number): TurnStep {
    return { type: 'superCreated', tile: Tile.superTile(nextId++, 'row'), at: gridPos(col, 0) };
}

function fakeStage(): TileStage {
    const stage: Pick<TileStage, 'wait' | 'effects' | 'sound' | 'remove'> = {
        wait,
        effects: new NoEffects(),
        sound: new NoSound(),
        remove: () => undefined,
    };
    return stage as TileStage;
}

describe('TurnPlayer', () => {
    let marks: Mark[];

    beforeEach(() => {
        jest.useFakeTimers({ now: 0 });
        marks = [];
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    async function play(player: TurnPlayer, steps: TurnStep[]): Promise<void> {
        const done = player.play(steps);
        await jest.runAllTimersAsync();
        await done;
    }

    function at(what: string): number {
        const mark = marks.filter((m) => m.what === what)[0];
        if (mark === undefined) {
            throw new Error(`"${what}" never happened`);
        }
        return mark.at;
    }

    function playerWith(burnDelayOf: (col: number) => number): TurnPlayer {
        return new TurnPlayer(fakeStage())
            .register(new ColumnBurn(burnDelayOf))
            .register(new ColumnSettler('fall', marks))
            .register(new ColumnSettler('refill', marks))
            .register(new TimedAnimator('superCreated', 0.25, marks))
            .register(new TimedAnimator('shuffle', 0.1, marks));
    }

    it('drops each column as soon as the burn in it is over, not when the whole burn is', async () => {
        const player = playerWith((col) => (col === 0 ? 0.1 : 0.3));

        await play(player, [burnIn(gridPos(0, 0), gridPos(1, 0)), fallIn(0, 1), refillIn(0, 1)]);

        expect([at('fall 0'), at('refill 0')]).toEqual([100, 100]);
        expect([at('fall 1'), at('refill 1')]).toEqual([300, 300]);
    });

    it('waits for every burnt tile of its own column and for no other column', async () => {
        const player = playerWith((col) => 0.1 * (col + 1));

        await play(player, [burnIn(gridPos(0, 0), gridPos(0, 1), gridPos(2, 0)), fallIn(0)]);

        expect(at('fall 0')).toBe(100);
    });

    it('keeps the column of a new super tile until the tile has appeared', async () => {
        const player = playerWith(() => 0.1);

        await play(player, [burnIn(gridPos(0, 0), gridPos(1, 0)), superAt(1), fallIn(0, 1)]);

        expect(at('superCreated starts')).toBe(100);
        expect(at('fall 0')).toBe(100);
        expect(at('fall 1')).toBe(350);
    });

    it('opens the columns of a burn that lost a removal once the burn ends', async () => {
        const player = new TurnPlayer(fakeStage())
            .register(new TimedAnimator('burn', 0.3, marks))
            .register(new ColumnSettler('fall', marks));

        await play(player, [burnIn(gridPos(0, 0)), fallIn(0)]);

        expect(at('fall 0')).toBe(300);
    });

    it('starts any other step only after everything before it', async () => {
        const player = playerWith(() => 0.1);

        await play(player, [burnIn(gridPos(0, 0)), fallIn(0), refillIn(0), { type: 'shuffle', moves: [] }]);

        expect(at('shuffle starts')).toBe(200);
    });

    it('has an animator for every step type the model reports', () => {
        const types: { readonly [K in StepType]: true } = {
            burn: true,
            superCreated: true,
            bonusSuper: true,
            swap: true,
            fall: true,
            refill: true,
            shuffle: true,
        };
        const player = createTurnPlayer(fakeStage());

        expect((Object.keys(types) as StepType[]).filter((type) => !player.handles(type))).toEqual([]);
    });
});

describe('ColumnGates', () => {
    async function isOpen(gate: Promise<void>): Promise<boolean> {
        let open = false;
        void gate.then(() => (open = true));
        await new Promise((resolve) => setImmediate(resolve));
        return open;
    }

    it('opens a column once its last burning tile is removed', async () => {
        const gates = new ColumnGates();
        gates.burn(
            [
                { id: 1, col: 0 },
                { id: 2, col: 0 },
                { id: 3, col: 1 },
            ],
            new Promise(() => undefined),
        );
        const column = gates.settled(0);

        gates.removed(1);
        gates.removed(3);
        expect(await isOpen(column)).toBe(false);
        gates.removed(2);
        expect(await isOpen(column)).toBe(true);
    });

    it('keeps a held column until the holding step settles, failed or not', async () => {
        const gates = new ColumnGates();
        let fail: (error: Error) => void = () => undefined;
        gates.hold(
            3,
            new Promise((_resolve, reject) => {
                fail = reject;
            }),
        );
        const column = gates.settled(3);

        expect(await isOpen(column)).toBe(false);
        fail(new Error('animation broke'));
        expect(await isOpen(column)).toBe(true);
    });

    it('lets a column nothing claimed settle at once', async () => {
        expect(await isOpen(new ColumnGates().settled(4))).toBe(true);
    });
});
