import { GridPos } from '../../../core/board/GridPos';
import { BurnedTile, BurnWave } from '../../../core/burn/BurnResolver';
import { Point } from '../../BoardLayout';
import { Feel } from '../Feel';
import { groupBurst, groupWeight } from '../Impact';
import { popWave, PopStyles } from '../PopMotion';
import { playTween } from '../StepAnimator';
import { TileStage } from '../TileStage';
import { Timings } from '../Timings';
import { GroupLook } from './BurnLooks';

/**
 * A tapped group. It squeezes and pops in a ripple from the tapped cell, or, when it earned a super tile,
 * gathers into the tile's cell and bursts there once. Only an earned tile shakes the board:
 * most taps of a level are small groups, and shaking on each would make the board jitter all the time.
 */
export class GroupPop implements GroupLook {
    pop(group: BurnWave, stage: TileStage): Promise<void> {
        const size = group.tiles.length;
        stage.sound.play('pop', groupWeight(size));
        return popWave(
            stage,
            group,
            (at) => stage.layout.distance(group.origin, at) * Timings.burnRipplePerCell,
            PopStyles.group,
            groupBurst(size),
        );
    }

    async collapse(group: BurnWave, into: GridPos, stage: TileStage): Promise<void> {
        const target = stage.layout.cellCenter(into.col, into.row);
        const size = group.tiles.length;
        stage.sound.play('pop', groupWeight(size));
        await Promise.all(group.tiles.map((burned) => pullInto(burned, target, stage)));
        stage.effects.burst(target, group.tiles[0].tile.color, groupBurst(size));
        stage.shake(groupWeight(size));
    }
}

function pullInto(burned: BurnedTile, target: Point, stage: TileStage): Promise<void> {
    const node = stage.nodeOf(burned.tile.id);
    stage.bringToFront(node);
    return playTween(
        node,
        cc
            .tween(node)
            .to(Timings.burnSqueeze, { scale: Feel.burnSqueezeScale }, { easing: 'quadOut' })
            .to(
                Timings.collapse,
                { position: cc.v3(target.x, target.y, 0), scale: Feel.collapseScale },
                { easing: 'quadIn' },
            ),
    ).then(() => stage.remove(burned.tile.id));
}
