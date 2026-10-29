import { Point } from '../BoardLayout';
import { directionDeg } from './FxMath';

/**
 * A straight flight at constant speed. Trail points are spaced by distance, not by frame,
 * so the trail looks the same at 30 and at 60 fps.
 */
export class RocketFlight {
    readonly angle: number;
    readonly length: number;
    x: number;
    y: number;
    trailX = 0;
    trailY = 0;
    private elapsed = 0;
    private nextTrailAt = 0;

    constructor(
        private readonly from: Point,
        private readonly to: Point,
        readonly duration: number,
    ) {
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        this.angle = directionDeg(dx, dy);
        this.length = Math.sqrt(dx * dx + dy * dy);
        this.x = from.x;
        this.y = from.y;
    }

    get arrived(): boolean {
        return this.elapsed >= this.duration;
    }

    private get progress(): number {
        return this.duration > 0 ? Math.min(1, this.elapsed / this.duration) : 1;
    }

    advance(dt: number): void {
        this.elapsed += dt;
        const t = this.progress;
        this.x = this.from.x + (this.to.x - this.from.x) * t;
        this.y = this.from.y + (this.to.y - this.from.y) * t;
    }

    /** Moves trailX/trailY to the next trail point the head has passed. False when it has passed none. */
    nextTrailPoint(spacing: number): boolean {
        if (this.nextTrailAt > this.length * this.progress) {
            return false;
        }
        const t = this.length > 0 ? this.nextTrailAt / this.length : 1;
        this.trailX = this.from.x + (this.to.x - this.from.x) * t;
        this.trailY = this.from.y + (this.to.y - this.from.y) * t;
        this.nextTrailAt += spacing;
        return true;
    }
}
