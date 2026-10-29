import { Point } from '../BoardLayout';
import { playTween } from './StepAnimator';
import { Timings } from './Timings';

/** Falling feels right when time grows with the square root of distance, like a real drop. */
export function dropNode(node: cc.Node, target: Point, cells: number, delay: number): Promise<void> {
    const duration = Timings.fallMin + Math.sqrt(Math.max(cells, 0)) * Timings.fallPerCell;
    return playTween(
        node,
        cc
            .tween(node)
            .delay(delay)
            .to(duration, { position: cc.v3(target.x, target.y, 0) }, { easing: 'quadIn' })
            .to(Timings.landSquash, { scaleX: 1.08, scaleY: 0.9 })
            .to(Timings.landSquash, { scaleX: 1, scaleY: 1 }),
    );
}
