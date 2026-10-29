import { GridPos } from '../../../core/board/GridPos';
import { BurnWave } from '../../../core/burn/BurnResolver';
import { Point } from '../../BoardLayout';
import { Feel } from '../Feel';
import { popWave, PopStyles } from '../PopMotion';
import { TileStage } from '../TileStage';
import { Timings } from '../Timings';
import { BlastPresenter } from './BlastPresenters';

export type RocketAxis = 'row' | 'column';

/** Two rockets fly from the super tile to both ends of its line, and every tile pops as a rocket passes it. */
export class RocketBlast implements BlastPresenter {
    constructor(private readonly axis: RocketAxis) {}

    play(wave: BurnWave, stage: TileStage): Promise<void> {
        const from = stage.layout.cellCenter(wave.origin.col, wave.origin.row);
        stage.sound.play('rocket');
        stage.shake(Feel.rocketShake);
        this.launch(stage, from, -1);
        this.launch(stage, from, 1);
        return popWave(
            stage,
            wave,
            (at) => this.cellsBetween(wave.origin, at) * Timings.rocketPerCell,
            PopStyles.hit,
            Feel.hitBurst,
        );
    }

    /** The tiles keep their own clock, so nothing waits for the rocket: a lost effect cannot stall the turn. */
    private launch(stage: TileStage, from: Point, direction: number): void {
        const layout = stage.layout;
        const horizontal = this.axis === 'row';
        const to = horizontal
            ? { x: (direction * layout.width) / 2, y: from.y }
            : { x: from.x, y: (direction * layout.height) / 2 };
        const cells = horizontal ? Math.abs(to.x - from.x) / layout.stepX : Math.abs(to.y - from.y) / layout.stepY;
        void stage.effects.rocket(from, to, cells * Timings.rocketPerCell);
    }

    private cellsBetween(origin: GridPos, at: GridPos): number {
        return this.axis === 'row' ? Math.abs(at.col - origin.col) : Math.abs(at.row - origin.row);
    }
}
