import { GridPos } from '../../core/board/GridPos';
import { BurnWave } from '../../core/burn/BurnResolver';
import { BurnStep } from '../../core/game/TurnStep';
import { BoardLayout, Point } from '../BoardLayout';
import { Texts } from '../Texts';
import { BlastPresenters } from './blast/BlastPresenters';
import { collapseGroup } from './GroupCollapse';
import { StepAnimator } from './StepAnimator';
import { TileStage } from './TileStage';
import { Timings } from './Timings';

/** The first rule a group reaches names it, so the biggest come first. */
const GROUP_PRAISE = [
    { minTiles: 10, text: Texts.praise.awesome },
    { minTiles: 8, text: Texts.praise.great },
    { minTiles: 6, text: Texts.praise.good },
];

/**
 * Plays the waves of a burn in order, each with the look of whatever fired it, then shows the points.
 * A group that earned a super tile collapses into its cell instead of popping in place.
 */
export class BurnAnimator implements StepAnimator<'burn'> {
    readonly type = 'burn';

    constructor(private readonly blasts: BlastPresenters) {}

    async play(step: BurnStep, stage: TileStage): Promise<void> {
        const waves = step.waves.filter((wave) => wave.tiles.length > 0);
        if (waves.length === 0) {
            return;
        }
        if (step.fromGroup) {
            praiseGroup(stage, waves[0].tiles.length);
        }
        for (let i = 0; i < waves.length; i++) {
            if (i > 0) {
                await stage.wait(Timings.waveGap);
            }
            await this.playWave(waves[i], step.collapseTo, stage);
        }
        if (step.points > 0) {
            stage.effects.scorePopup(scorePoint(step.collapseTo, waves[0], stage.layout), step.points);
        }
    }

    private playWave(wave: BurnWave, collapseTo: GridPos | null, stage: TileStage): Promise<void> {
        // The tapped group is the only wave without a blast, and only it can turn into a super tile.
        if (wave.blast === null && collapseTo !== null) {
            return collapseGroup(wave, collapseTo, stage);
        }
        return this.blasts.forWave(wave).play(wave, stage);
    }
}

function praiseGroup(stage: TileStage, size: number): void {
    const rule = GROUP_PRAISE.filter((praise) => size >= praise.minTiles)[0];
    if (rule !== undefined) {
        stage.effects.praise(rule.text);
    }
}

function scorePoint(collapseTo: GridPos | null, first: BurnWave, layout: BoardLayout): Point {
    if (collapseTo !== null) {
        return layout.cellCenter(collapseTo.col, collapseTo.row);
    }
    let x = 0;
    let y = 0;
    for (const burned of first.tiles) {
        const center = layout.cellCenter(burned.at.col, burned.at.row);
        x += center.x;
        y += center.y;
    }
    return { x: x / first.tiles.length, y: y / first.tiles.length };
}
