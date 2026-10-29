import { BurnStep, TurnStep } from '../../core/game/TurnStep';
import { ColumnGates, ColumnTile } from './ColumnGates';
import { StepAnimator, StepType } from './StepAnimator';
import { TileStage, TurnStage } from './TileStage';

/**
 * These steps start right away, and each of their columns waits until it is settled: new tiles drop into a column
 * the moment its burn is over. Any other step waits for everything before it.
 */
const SETTLES_COLUMNS: ReadonlyArray<StepType> = ['fall', 'refill'];

export class TurnPlayer {
    private readonly animators = new Map<StepType, StepAnimator>();

    constructor(private readonly stage: TileStage) {}

    register(animator: StepAnimator): this {
        this.animators.set(animator.type, animator);
        return this;
    }

    handles(type: StepType): boolean {
        return this.animators.has(type);
    }

    async play(steps: ReadonlyArray<TurnStep>): Promise<void> {
        const gates = new ColumnGates();
        const stage = gatedStage(this.stage, gates);
        let running: Array<Promise<void>> = [];
        for (const step of steps) {
            if (SETTLES_COLUMNS.indexOf(step.type) < 0) {
                await Promise.all(running);
                running = [];
            }
            // Claimed before the step starts, so no removal can come ahead of its claim.
            let finish: () => void = () => undefined;
            claimColumns(gates, step, new Promise<void>((resolve) => (finish = resolve)));
            const playing = this.animatorFor(step.type).play(step, stage);
            playing.then(finish, finish);
            running.push(playing);
        }
        await Promise.all(running);
    }

    private animatorFor(type: StepType): StepAnimator {
        const animator = this.animators.get(type);
        if (animator === undefined) {
            throw new Error(`No animator registered for "${type}" steps`);
        }
        return animator;
    }
}

/** A burn holds its columns tile by tile. Any other step that puts a tile somewhere holds those columns whole. */
function claimColumns(gates: ColumnGates, step: TurnStep, playing: Promise<void>): void {
    switch (step.type) {
        case 'burn':
            gates.burn(burnedTiles(step), playing);
            return;
        case 'superCreated':
        case 'bonusSuper':
            gates.hold(step.at.col, playing);
            return;
        case 'swap':
        case 'shuffle':
            step.moves.forEach((move) => {
                gates.hold(move.from.col, playing);
                gates.hold(move.to.col, playing);
            });
            return;
        case 'fall':
        case 'refill':
            return;
    }
}

function burnedTiles(step: BurnStep): ColumnTile[] {
    const waves = step.cause === 'group' ? [step.group] : step.waves;
    const tiles: ColumnTile[] = [];
    waves.forEach((wave) => wave.tiles.forEach((burned) => tiles.push({ id: burned.tile.id, col: burned.at.col })));
    return tiles;
}

/** The stage as the animators of one turn see it: every removed tile frees its column a little more. */
function gatedStage(stage: TileStage, gates: ColumnGates): TurnStage {
    return {
        get layout() {
            return stage.layout;
        },
        get effects() {
            return stage.effects;
        },
        get sound() {
            return stage.sound;
        },
        nodeOf: (tileId) => stage.nodeOf(tileId),
        spawn: (tile, col, row) => stage.spawn(tile, col, row),
        remove: (tileId) => {
            stage.remove(tileId);
            gates.removed(tileId);
        },
        sortByRow: (node, row) => stage.sortByRow(node, row),
        bringToFront: (node) => stage.bringToFront(node),
        shake: (strength) => stage.shake(strength),
        wait: (seconds) => stage.wait(seconds),
        columnSettled: (col) => gates.settled(col),
    };
}
