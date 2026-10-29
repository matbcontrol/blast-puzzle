import { GridPos } from '../../core/board/GridPos';
import { Tile } from '../../core/tiles/Tile';
import { Feel } from './Feel';
import { playTween } from './StepAnimator';
import { TileStage } from './TileStage';
import { Timings } from './Timings';

/** The super tile pops into its cell with a sparkle, over its neighbours, and settles there. */
export async function revealSuper(stage: TileStage, tile: Tile, at: GridPos): Promise<void> {
    const node = stage.spawn(tile, at.col, at.row);
    node.scale = 0;
    stage.bringToFront(node);
    stage.effects.burst(stage.layout.cellCenter(at.col, at.row), null, Feel.superSparkle);
    stage.sound.play('superCreate');
    await playTween(
        node,
        cc
            .tween(node)
            .to(Timings.superGrow, { scale: Feel.superGrowScale }, { easing: 'backOut' })
            .to(Timings.superSettle, { scale: 1 }, { easing: 'sineInOut' }),
    );
    stage.sortByRow(node, at.row);
}
