import { GridPos } from '../../core/board/GridPos';
import { BurnedTile, BurnWave } from '../../core/burn/BurnResolver';
import { Point } from '../BoardLayout';
import { Feel } from './Feel';
import { groupBurst, groupWeight, shakeForGroup } from './GroupImpact';
import { playTween } from './StepAnimator';
import { TileStage } from './TileStage';
import { Timings } from './Timings';

/** A group that earned a super tile is pulled into the cell the super tile appears in and bursts there once. */
export async function collapseGroup(wave: BurnWave, into: GridPos, stage: TileStage): Promise<void> {
    const target = stage.layout.cellCenter(into.col, into.row);
    const size = wave.tiles.length;
    stage.sound.play('pop', groupWeight(size));
    await Promise.all(wave.tiles.map((burned) => pullInto(burned, target, stage)));
    stage.effects.burst(target, wave.tiles[0].tile.color, groupBurst(size));
    shakeForGroup(stage, size);
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
