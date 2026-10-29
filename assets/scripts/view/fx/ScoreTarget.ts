import { Point } from '../BoardLayout';

/** Where score popups fly once they have popped, and who counts them in: the HUD score. */
export interface ScoreTarget {
    /** World position the popups fly to, read as each one sets off. */
    scoreWorldPoint(): Point;
    /**
     * A popup carrying these points has landed, or was cut short by newer popups. Called once per popup that set off
     * toward this target, except for popups still in flight when the effects layer goes away with the scene.
     */
    scoreArrived(points: number): void;
}
