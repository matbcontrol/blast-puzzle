import { Point } from '../BoardLayout';
import { TweenSlot } from '../TweenSlot';
import { after, pressDown, pulse, pulsePeriod, shakeX, springTo } from '../Tweens';

/** One swing of a tile: each key takes this share of the swing's time and turns to this share of its angle. */
type Swing = ReadonlyArray<{ readonly share: number; readonly angle: number }>;

/** How resting tiles answer the player: scales, degrees, board px and seconds. */
export const CueFeel = {
    pressedScale: 0.9,
    press: 0.06,
    /** Back from a press with an overshoot, like a key springing up. */
    release: 0.24,
    liftScale: 1.06,
    lift: 0.12,
    drop: 0.1,
    /** A picked booster target breathes until the booster fires. */
    mark: { peak: 1.12, rest: 1, rise: 0.35, fall: 0.35 },
    rejectOffset: 8,
    reject: 0.24,
    hint: {
        angle: 9,
        /** The wiggle, then stillness, so the hint nudges instead of buzzing. */
        wiggle: 0.5,
        rest: 1.1,
        settle: 0.1,
        /** Rides on the wiggle: up and back down within it. */
        swell: { peak: 1.1, rest: 1, rise: 0.25, fall: 0.25 },
        swing: [
            { share: 0.2, angle: 1 },
            { share: 0.35, angle: -1 },
            { share: 0.25, angle: 0.5 },
            { share: 0.2, angle: 0 },
        ],
    },
    /** Super tiles at rest breathe out of step with each other, and rockets rock as they breathe. */
    idle: {
        breath: { peak: 1.06, rest: 1, rise: 0.6, fall: 0.6 },
        rockAngle: 4,
        rock: [
            { share: 0.25, angle: 1 },
            { share: 0.5, angle: -1 },
            { share: 0.25, angle: 0 },
        ],
    },
};

/** The swell rides on the wiggle and holds still until the next one. The hint glow breathes on this beat too. */
export const HINT_BEAT = {
    rise: CueFeel.hint.swell.rise,
    fall: CueFeel.hint.swell.fall,
    pause: CueFeel.hint.wiggle + CueFeel.hint.rest - CueFeel.hint.swell.rise - CueFeel.hint.swell.fall,
};

/** A tile a cue applies to: its node and the cell it rests on. */
export interface CueTile {
    readonly node: cc.Node;
    readonly row: number;
    readonly rest: Point;
}

/** The draw order part of the board, so a raised tile is drawn over its neighbours. */
export interface TileDepth {
    sortByRow(node: cc.Node, row: number): void;
    bringToFront(node: cc.Node): void;
}

type ScaleCue = 'rest' | 'breathe' | 'lift' | 'hint' | 'mark' | 'press';
type AngleCue = 'still' | 'rock' | 'wiggle';
type Flag = 'lifted' | 'marked' | 'hinted' | 'breathing' | 'rocking';

class TilePose {
    pressed = false;
    lifted = false;
    marked = false;
    hinted = false;
    breathing = false;
    rocking = false;
    shownScale: ScaleCue = 'rest';
    shownAngle: AngleCue = 'still';
    raised = false;
    /** Share of a breath this tile is out of step with the others. */
    readonly phase = Math.random();
    readonly scale = new TweenSlot();
    readonly angle = new TweenSlot();
    readonly offset = new TweenSlot();

    constructor(readonly tile: CueTile) {}

    /** A press beats a target mark, which beats the hint, which beats a hover lift, which beats idle breathing. */
    get wantedScale(): ScaleCue {
        if (this.pressed) {
            return 'press';
        }
        if (this.marked) {
            return 'mark';
        }
        if (this.hinted) {
            return 'hint';
        }
        if (this.lifted) {
            return 'lift';
        }
        return this.breathing ? 'breathe' : 'rest';
    }

    get wantedAngle(): AngleCue {
        if (this.hinted) {
            return 'wiggle';
        }
        return this.rocking ? 'rock' : 'still';
    }
}

/**
 * Press, hover, target, hint and idle cues on tiles resting between turns. Each tile runs one tween per property,
 * the cue picked by priority, so cues never stop each other. reset() hands the tiles to the turn animations.
 */
export class TileCues {
    private readonly poses = new Map<cc.Node, TilePose>();
    private pressed: TilePose | null = null;

    constructor(private readonly depth: TileDepth) {}

    press(tile: CueTile | null): void {
        const pose = tile === null ? null : this.poseOf(tile);
        if (pose === this.pressed) {
            return;
        }
        const previous = this.pressed;
        this.pressed = pose;
        if (previous !== null) {
            previous.pressed = false;
            this.refresh(previous);
        }
        if (pose !== null) {
            pose.pressed = true;
            this.refresh(pose);
        }
    }

    lift(tiles: ReadonlyArray<CueTile>): void {
        this.assign('lifted', tiles);
    }

    mark(tiles: ReadonlyArray<CueTile>): void {
        this.assign('marked', tiles);
    }

    hint(tiles: ReadonlyArray<CueTile>): void {
        this.assign('hinted', tiles);
    }

    /** Super tiles at rest: all of them breathe, and the rocking ones also rock. */
    idle(breathing: ReadonlyArray<CueTile>, rocking: ReadonlyArray<CueTile>): void {
        this.assign('breathing', breathing);
        this.assign('rocking', rocking);
    }

    /** Around the cell, not around node.x: a fast second tap would catch the tile mid-shake. */
    shake(tile: CueTile): void {
        const x = tile.rest.x;
        tile.node.x = x;
        this.poseOf(tile).offset.play(shakeX(tile.node, x, CueFeel.rejectOffset, CueFeel.reject));
    }

    reset(): void {
        this.poses.forEach((pose) => {
            const node = pose.tile.node;
            pose.scale.stop();
            pose.angle.stop();
            pose.offset.stop();
            node.setScale(1);
            node.angle = 0;
            node.setPosition(pose.tile.rest.x, pose.tile.rest.y);
            if (pose.raised) {
                this.depth.sortByRow(node, pose.tile.row);
            }
        });
        this.poses.clear();
        this.pressed = null;
    }

    private assign(flag: Flag, tiles: ReadonlyArray<CueTile>): void {
        const wanted = tiles.map((tile) => this.poseOf(tile));
        this.poses.forEach((pose) => {
            const on = wanted.indexOf(pose) >= 0;
            if (pose[flag] !== on) {
                pose[flag] = on;
                this.refresh(pose);
            }
        });
    }

    private poseOf(tile: CueTile): TilePose {
        let pose = this.poses.get(tile.node);
        if (pose === undefined) {
            pose = new TilePose(tile);
            this.poses.set(tile.node, pose);
        }
        return pose;
    }

    private refresh(pose: TilePose): void {
        const node = pose.tile.node;
        const scale = pose.wantedScale;
        if (scale !== pose.shownScale) {
            pose.scale.play(scaleTween(pose, scale));
            pose.shownScale = scale;
        }
        const raised = pose.lifted || pose.marked;
        if (raised !== pose.raised) {
            pose.raised = raised;
            if (raised) {
                this.depth.bringToFront(node);
            } else {
                this.depth.sortByRow(node, pose.tile.row);
            }
        }
        const angle = pose.wantedAngle;
        if (angle !== pose.shownAngle) {
            pose.angle.play(angleTween(pose, angle));
            pose.shownAngle = angle;
        }
    }
}

/** Called before shownScale moves on, so the tween can tell where the tile comes from. */
function scaleTween(pose: TilePose, cue: ScaleCue): cc.Tween {
    const node = pose.tile.node;
    switch (cue) {
        case 'press':
            return pressDown(node, CueFeel.pressedScale, CueFeel.press);
        case 'mark':
            return pulse(node, 'scale', CueFeel.mark);
        case 'hint':
            return pulse(node, 'scale', { peak: CueFeel.hint.swell.peak, rest: CueFeel.hint.swell.rest, ...HINT_BEAT });
        case 'lift':
            return settleTo(pose, CueFeel.liftScale, CueFeel.lift);
        case 'rest':
            return settleTo(pose, 1, CueFeel.drop);
        case 'breathe': {
            const breath = CueFeel.idle.breath;
            const start = () => pose.scale.play(pulse(node, 'scale', breath));
            // Out of step with the other super tiles when the board comes to rest, at once when a cue lets go.
            return pose.shownScale === 'rest'
                ? after(node, pose.phase * pulsePeriod(breath), start)
                : settleTo(pose, breath.rest, CueFeel.drop).call(start);
        }
    }
}

/** Back from a press with a spring, from any other cue with an ease. */
function settleTo(pose: TilePose, scale: number, duration: number): cc.Tween<cc.Node> {
    const node = pose.tile.node;
    return pose.shownScale === 'press'
        ? springTo(node, scale, CueFeel.release)
        : cc.tween(node).to(duration, { scale }, { easing: 'quadOut' });
}

function angleTween(pose: TilePose, cue: AngleCue): cc.Tween {
    const node = pose.tile.node;
    switch (cue) {
        case 'wiggle': {
            const hint = CueFeel.hint;
            return cc.tween(node).repeatForever(swing(hint.swing, hint.angle, hint.wiggle).delay(hint.rest));
        }
        case 'rock': {
            const idle = CueFeel.idle;
            const period = pulsePeriod(idle.breath);
            const rock = cc.tween(node).repeatForever(swing(idle.rock, idle.rockAngle, period));
            return after(node, pose.phase * period, () => pose.angle.play(rock));
        }
        case 'still':
            return cc.tween(node).to(CueFeel.hint.settle, { angle: 0 });
    }
}

function swing(keys: Swing, angle: number, duration: number): cc.Tween<cc.Node> {
    return keys.reduce(
        (tween, key) => tween.to(key.share * duration, { angle: key.angle * angle }, { easing: 'sineInOut' }),
        cc.tween<cc.Node>(),
    );
}
