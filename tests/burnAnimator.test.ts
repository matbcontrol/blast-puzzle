import { GridPos, gridPos } from '../assets/scripts/core/board/GridPos';
import { BlastWave, BurnWave } from '../assets/scripts/core/burn/BurnResolver';
import { ALL_SUPER_KINDS, SuperKind, SuperKinds } from '../assets/scripts/core/tiles/SuperKinds';
import { BlastLook, BlastLooks, GroupLook } from '../assets/scripts/view/animation/blast/BurnLooks';
import { BurnAnimator } from '../assets/scripts/view/animation/BurnAnimator';
import { chainShake, chainWeight } from '../assets/scripts/view/animation/Impact';
import { blastPraise, earnedPraise } from '../assets/scripts/view/animation/Praise';
import { TurnStage } from '../assets/scripts/view/animation/TileStage';
import { createBlastLooks } from '../assets/scripts/view/animation/TurnAnimations';
import { NoSound } from '../assets/scripts/view/audio/SoundPlayer';
import { BoardLayout, Point } from '../assets/scripts/view/BoardLayout';
import { BoardEffects } from '../assets/scripts/view/fx/BoardEffects';
import { Texts } from '../assets/scripts/view/Texts';
import { blastBurn, blastWave, bottomRow, groupBurn, withPoints } from './helpers/steps';

/** The looks are fakes, so only what the animator does itself reaches the effects. */
class RecordingEffects implements BoardEffects {
    readonly praised: string[] = [];
    readonly popups: Array<{ at: Point; points: number; chain: number }> = [];

    praise(text: string): void {
        this.praised.push(text);
    }

    scorePopup(at: Point, points: number, chain = 1): void {
        this.popups.push({ at, points, chain });
    }

    burst(): void {}

    shockwave(): void {}

    flash(): void {}

    rocket(): void {}
}

/** Logs when each explosion starts and ends, and its place in the chain. */
class RecordingBlast implements BlastLook {
    constructor(
        private readonly name: string,
        private readonly log: string[],
    ) {}

    async play(_wave: BlastWave, _stage: TurnStage, chain: number): Promise<void> {
        this.log.push(`${this.name} ${chain} starts`);
        await Promise.resolve();
        this.log.push(`${this.name} ${chain} ends`);
    }
}

class RecordingGroup implements GroupLook {
    constructor(private readonly log: string[]) {}

    async pop(group: BurnWave): Promise<void> {
        this.log.push(`pop ${group.tiles.length}`);
    }

    async collapse(group: BurnWave, into: GridPos): Promise<void> {
        this.log.push(`collapse ${group.tiles.length} into ${into.col}:${into.row}`);
    }
}

function looks(log: string[]): BlastLooks {
    return {
        row: new RecordingBlast('rocket', log),
        column: new RecordingBlast('rocket', log),
        bomb: new RecordingBlast('bomb', log),
        field: new RecordingBlast('field', log),
    };
}

describe('BurnAnimator', () => {
    let log: string[];
    let shakes: number[];
    let effects: RecordingEffects;
    let stage: TurnStage;
    let animator: BurnAnimator;

    beforeEach(() => {
        log = [];
        shakes = [];
        effects = new RecordingEffects();
        const fake: Pick<TurnStage, 'layout' | 'effects' | 'sound' | 'wait' | 'shake'> = {
            layout: new BoardLayout(10, 3, 100, 100),
            effects,
            sound: new NoSound(),
            wait: () => Promise.resolve(),
            shake: (strength) => shakes.push(strength),
        };
        stage = fake as TurnStage;
        animator = new BurnAnimator(new RecordingGroup(log), looks(log));
    });

    function chainOf(...kinds: SuperKind[]) {
        return withPoints(blastBurn(...kinds.map((kind, i) => blastWave(kind, gridPos(i, 1), [gridPos(i, 1)]))), 90);
    }

    it('plays a chain one explosion after another with the look of each, skipping empty ones', async () => {
        const step = withPoints(
            blastBurn(
                blastWave(SuperKinds.Row, gridPos(1, 1), [gridPos(0, 1), gridPos(1, 1)]),
                blastWave(SuperKinds.Bomb, gridPos(0, 1), [gridPos(0, 0)]),
                blastWave(SuperKinds.Bomb, gridPos(2, 2), []),
                blastWave(SuperKinds.Field, gridPos(2, 0), [gridPos(2, 0)]),
            ),
            100,
        );

        await animator.play(step, stage);

        expect(log).toEqual([
            'rocket 1 starts',
            'rocket 1 ends',
            'bomb 2 starts',
            'bomb 2 ends',
            'field 3 starts',
            'field 3 ends',
        ]);
    });

    it('pops a tapped group that earned nothing and gathers one that earned a super tile', async () => {
        await animator.play(withPoints(groupBurn(bottomRow(3)), 60), stage);
        await animator.play(withPoints(groupBurn(bottomRow(7), gridPos(2, 0)), 280), stage);

        expect(log).toEqual(['pop 3', 'collapse 7 into 2:0']);
    });

    it('shows the points of a tapped group once, where it popped or where it gathered', async () => {
        await animator.play(withPoints(groupBurn(bottomRow(3)), 60), stage);
        await animator.play(withPoints(groupBurn(bottomRow(7), gridPos(2, 0)), 280), stage);

        expect(effects.popups).toEqual([
            { at: stage.layout.cellCenter(1, 0), points: 60, chain: 1 },
            { at: stage.layout.cellCenter(2, 0), points: 280, chain: 1 },
        ]);
    });

    it('shows the points of a chain once, sized by how many explosions it set off', async () => {
        await animator.play(chainOf(SuperKinds.Row, SuperKinds.Bomb, SuperKinds.Bomb), stage);

        expect(effects.popups).toEqual([{ at: stage.layout.cellCenter(0, 1), points: 90, chain: 3 }]);
    });

    it('shakes harder with every explosion a chain adds', async () => {
        await animator.play(chainOf(SuperKinds.Row, SuperKinds.Column, SuperKinds.Bomb), stage);

        expect(shakes).toEqual([chainShake(2), chainShake(3)]);
        expect(chainShake(2)).toBeGreaterThan(0.5);
        expect(chainShake(3)).toBe(1);
    });

    it('praises chains, not single explosions or tapped groups', async () => {
        await animator.play(withPoints(groupBurn(bottomRow(10), gridPos(0, 0)), 550), stage);
        await animator.play(chainOf(SuperKinds.Bomb), stage);
        expect(effects.praised).toEqual([]);

        await animator.play(chainOf(SuperKinds.Row, SuperKinds.Bomb, SuperKinds.Row), stage);
        expect(effects.praised).toEqual([Texts.praise.great, Texts.praise.awesome]);
    });

    it('has a look for every super tile kind', () => {
        const all = createBlastLooks();

        expect(ALL_SUPER_KINDS.filter((kind) => all[kind] === undefined)).toEqual([]);
    });
});

describe('Praise', () => {
    it('names an earned super tile by its kind, and leaves rockets alone', () => {
        expect(ALL_SUPER_KINDS.map(earnedPraise)).toEqual([null, null, Texts.praise.great, Texts.praise.awesome]);
    });

    it('praises the second and third explosion of a chain', () => {
        const chain = [SuperKinds.Row, SuperKinds.Bomb, SuperKinds.Column, SuperKinds.Bomb];

        expect(chain.map((_, i) => blastPraise(chain, i))).toEqual([
            null,
            Texts.praise.great,
            Texts.praise.awesome,
            null,
        ]);
    });

    it('greets the field on its own and says nothing after it', () => {
        const chain = [SuperKinds.Row, SuperKinds.Field, SuperKinds.Bomb];

        expect(chain.map((_, i) => blastPraise(chain, i))).toEqual([null, Texts.praise.incredible, null]);
        expect(blastPraise([SuperKinds.Field], 0)).toBe(Texts.praise.incredible);
    });
});

describe('Impact', () => {
    it('makes a chain sound bigger from its second explosion, up to full', () => {
        expect([1, 2, 3, 6].map(chainWeight)).toEqual([0, 0.5, 1, 1]);
    });
});
