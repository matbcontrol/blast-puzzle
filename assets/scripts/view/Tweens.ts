/**
 * Tween shapes the views share. Each returns the tween unstarted, so a TweenSlot or playTween owns it,
 * and takes its numbers from the caller's Feel object.
 */

/** One breath of a number property: up to peak, back to rest, then still for pause. Values and seconds. */
export interface PulseShape {
    readonly peak: number;
    readonly rest: number;
    readonly rise: number;
    readonly fall: number;
    readonly pause?: number;
}

export type PulseProperty = 'scale' | 'opacity';

const BREATH = { easing: 'sineInOut' };

export function pulsePeriod(shape: PulseShape): number {
    return shape.rise + shape.fall + (shape.pause || 0);
}

/** Breathes forever. Starts from the current value, so it can take over from another tween smoothly. */
export function pulse(node: cc.Node, property: PulseProperty, shape: PulseShape): cc.Tween<cc.Node> {
    const to = (value: number) => (property === 'scale' ? { scale: value } : { opacity: value });
    const breath = cc.tween<cc.Node>().to(shape.rise, to(shape.peak), BREATH).to(shape.fall, to(shape.rest), BREATH);
    return cc.tween(node).repeatForever(shape.pause ? breath.delay(shape.pause) : breath);
}

/** A "no": out to one side, across to the other and back to restX, in a quarter, a half and a quarter of the time. */
export function shakeX(node: cc.Node, restX: number, offset: number, duration: number): cc.Tween<cc.Node> {
    return cc
        .tween(node)
        .to(duration / 4, { x: restX - offset })
        .to(duration / 2, { x: restX + offset })
        .to(duration / 4, { x: restX });
}

/** Down fast under a finger. */
export function pressDown(node: cc.Node, scale: number, duration: number): cc.Tween<cc.Node> {
    return cc.tween(node).to(duration, { scale }, { easing: 'quadOut' });
}

/** Up with an overshoot, like a key springing back. */
export function springTo(node: cc.Node, scale: number, duration: number): cc.Tween<cc.Node> {
    return cc.tween(node).to(duration, { scale }, { easing: 'backOut' });
}

/** Calls start once delay has passed. A loop has to start in a call like this: inside a sequence it never repeats. */
export function after(node: cc.Node, delay: number, start: () => void): cc.Tween<cc.Node> {
    return cc.tween(node).delay(delay).call(start);
}

/** A one-off swell: up to peak, then a springy settle back to scale 1. Scale and seconds. */
export interface PunchShape {
    readonly peak: number;
    readonly rise: number;
    readonly settle: number;
}

/** The UI's "this just changed" beat, from the current scale. */
export function punch(node: cc.Node, shape: PunchShape): cc.Tween<cc.Node> {
    return cc
        .tween(node)
        .to(shape.rise, { scale: shape.peak }, { easing: 'quadOut' })
        .to(shape.settle, { scale: 1 }, { easing: 'backOut' });
}
