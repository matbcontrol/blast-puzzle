import { Point } from '../BoardLayout';

/**
 * Flies the node to `to` on an arc bent to the left of its way by `bend` of the distance.
 * Two tiles trading places with the same bend pass each other on opposite sides.
 */
export function arcTo(node: cc.Node, from: Point, to: Point, bend: number, duration: number): cc.Tween {
    const sideX = -(to.y - from.y) * bend;
    const sideY = (to.x - from.x) * bend;
    return cc.tween(node).to(
        duration,
        { position: cc.v3(to.x, to.y, 0) },
        {
            easing: 'sineInOut',
            progress: (start: cc.Vec3, end: cc.Vec3, current: cc.Vec3, t: number) => {
                const lift = 4 * t * (1 - t);
                current.x = start.x + (end.x - start.x) * t + sideX * lift;
                current.y = start.y + (end.y - start.y) * t + sideY * lift;
                return current;
            },
        },
    );
}
