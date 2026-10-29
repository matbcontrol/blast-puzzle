import { BlastWave, BurnWave } from '../../core/burn/BurnResolver';
import { BlastBurn, BurnPoints, BurnStep, GroupBurn } from '../../core/game/TurnStep';
import { BoardLayout, Point } from '../BoardLayout';
import { BlastLooks, GroupLook } from './blast/BurnLooks';
import { chainShake } from './Impact';
import { blastPraise } from './Praise';
import { StepAnimator } from './StepAnimator';
import { TurnStage } from './TileStage';
import { Timings } from './Timings';

/**
 * Plays a burn with the look of what started it, then shows its points. A chain of explosions plays one after
 * another, and every explosion it adds shakes harder and may earn a word of praise.
 */
export class BurnAnimator implements StepAnimator<'burn'> {
    readonly type = 'burn';

    constructor(
        private readonly group: GroupLook,
        private readonly blasts: BlastLooks,
    ) {}

    play(step: BurnStep, stage: TurnStage): Promise<void> {
        return step.cause === 'group' ? this.playGroup(step, stage) : this.playBlast(step, stage);
    }

    private async playGroup(step: GroupBurn & BurnPoints, stage: TurnStage): Promise<void> {
        const group = step.group;
        if (group.tiles.length === 0) {
            return;
        }
        const into = step.collapseTo;
        if (into === null) {
            await this.group.pop(group, stage);
        } else {
            await this.group.collapse(group, into, stage);
        }
        const at = into === null ? centerOf(group, stage.layout) : stage.layout.cellCenter(into.col, into.row);
        showPoints(stage, at, step.points, 1);
    }

    private async playBlast(step: BlastBurn & BurnPoints, stage: TurnStage): Promise<void> {
        const waves = step.waves.filter((wave) => wave.tiles.length > 0);
        if (waves.length === 0) {
            return;
        }
        const kinds = waves.map((wave) => wave.blast);
        for (let i = 0; i < waves.length; i++) {
            if (i > 0) {
                await stage.wait(Timings.waveGap);
                stage.shake(chainShake(i + 1));
            }
            const praise = blastPraise(kinds, i);
            if (praise !== null) {
                stage.effects.praise(praise);
            }
            await this.playWave(waves[i], stage, i + 1);
        }
        showPoints(stage, centerOf(waves[0], stage.layout), step.points, waves.length);
    }

    private playWave(wave: BlastWave, stage: TurnStage, chain: number): Promise<void> {
        return this.blasts[wave.blast].play(wave, stage, chain);
    }
}

function showPoints(stage: TurnStage, at: Point, points: number, chain: number): void {
    if (points > 0) {
        stage.effects.scorePopup(at, points, chain);
    }
}

function centerOf(wave: BurnWave, layout: BoardLayout): Point {
    let x = 0;
    let y = 0;
    for (const burned of wave.tiles) {
        const center = layout.cellCenter(burned.at.col, burned.at.row);
        x += center.x;
        y += center.y;
    }
    return { x: x / wave.tiles.length, y: y / wave.tiles.length };
}
