import { Point } from '../BoardLayout';
import { toCcColor } from './FxColors';
import { FxFeel } from './FxFeel';
import { uprightDeg } from './FxMath';
import { RocketFlight } from './RocketFlight';

export interface RocketHeadLook {
    /** Null when the art is missing: the head stays invisible and only the trail shows. */
    readonly frame: cc.SpriteFrame | null;
    readonly scale: number;
    readonly tint: number;
    /** Art that faces both ways is never turned upside down. */
    readonly upright: boolean;
}

/** Leaves the trail behind a rocket. index counts the trail points of one flight. */
export interface RocketTrail {
    rocketTrail(x: number, y: number, angle: number, index: number): void;
}

interface Flight {
    readonly path: RocketFlight;
    readonly head: cc.Node;
    trailPoints: number;
}

/** Rocket heads in flight. Stepped by the owner's update instead of tweens, on the same clock as the particles. */
export class RocketLauncher {
    private readonly flying: Flight[] = [];
    private readonly idleHeads: cc.Node[] = [];

    constructor(
        private readonly layer: cc.Node,
        private readonly look: RocketHeadLook,
        private readonly trail: RocketTrail,
    ) {}

    launch(from: Point, to: Point, duration: number): void {
        const path = new RocketFlight(from, to, duration);
        const head = this.idleHeads.length > 0 ? (this.idleHeads.pop() as cc.Node) : this.createHead();
        head.angle = this.look.upright ? uprightDeg(path.angle) : path.angle;
        head.setPosition(from.x, from.y);
        head.opacity = 255;
        this.flying.push({ path, head, trailPoints: 0 });
    }

    step(dt: number): void {
        const spacing = FxFeel.rocket.trailSpacing;
        // Backwards, because a landed flight is swapped with the last one.
        for (let i = this.flying.length - 1; i >= 0; i--) {
            const flight = this.flying[i];
            const path = flight.path;
            path.advance(dt);
            while (path.nextTrailPoint(spacing)) {
                this.trail.rocketTrail(path.trailX, path.trailY, path.angle, flight.trailPoints++);
            }
            flight.head.setPosition(path.x, path.y);
            if (path.arrived) {
                this.land(i);
            }
        }
    }

    /** Hides every head still in flight. */
    clear(): void {
        while (this.flying.length > 0) {
            this.land(this.flying.length - 1);
        }
    }

    private land(index: number): void {
        const flight = this.flying[index];
        this.flying[index] = this.flying[this.flying.length - 1];
        this.flying.pop();
        flight.head.opacity = 0;
        this.idleHeads.push(flight.head);
    }

    private createHead(): cc.Node {
        const node = new cc.Node('Rocket');
        const sprite = node.addComponent(cc.Sprite);
        sprite.sizeMode = cc.Sprite.SizeMode.RAW;
        sprite.trim = false;
        if (this.look.frame !== null) {
            sprite.spriteFrame = this.look.frame;
        }
        node.color = toCcColor(this.look.tint);
        node.setScale(this.look.scale);
        node.parent = this.layer;
        return node;
    }
}
