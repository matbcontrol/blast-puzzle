import { Point } from '../BoardLayout';
import { TILE_FACE } from '../TileArt';
import { Feel } from './Feel';
import { playTween } from './StepAnimator';
import { TileStage } from './TileStage';
import { Timings } from './Timings';

/** The anchor is the face center: dipping by this much keeps the bottom of a squashed tile on its cell. */
const SQUASH_DIP = (TILE_FACE / 2) * (1 - Feel.landSquashY);

/** Grows with the square root of the distance, as under gravity. */
export function fallTime(cells: number): number {
    return Timings.fallOneCell * Math.sqrt(Math.max(cells, 0));
}

/**
 * Falls, squashes on landing and bounces back to rest. Every tile accelerates alike,
 * so a tile that starts above another one and no earlier never catches up with it.
 */
export function dropNode(
    node: cc.Node,
    target: Point,
    cells: number,
    delay: number,
    onLand: () => void,
): Promise<void> {
    return playTween(
        node,
        cc
            .tween(node)
            .delay(delay)
            .to(fallTime(cells), { position: cc.v3(target.x, target.y, 0) }, { easing: 'quadIn' })
            .call(onLand)
            .to(
                Timings.landSquash,
                { scaleX: Feel.landSquashX, scaleY: Feel.landSquashY, y: target.y - SQUASH_DIP },
                { easing: 'quadOut' },
            )
            .to(Timings.landSettle, { scaleX: 1, scaleY: 1, y: target.y }, { easing: 'backOut' }),
    );
}

/** One thud, when the first tile of a step lands: a thud per tile would turn into noise. */
export function landingThud(stage: TileStage): () => void {
    let played = false;
    return () => {
        if (!played) {
            played = true;
            stage.sound.play('land');
        }
    };
}
