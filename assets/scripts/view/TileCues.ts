import { Timings } from './animation/Timings';
import { Point } from './BoardLayout';
import { TweenSlot } from './TweenSlot';

/** How resting tiles answer the player: scales, degrees, board px and seconds. */
export const CueFeel = {
    pressedScale: 0.9,
    press: 0.06,
    /** Back from a press with an overshoot, like a key springing up. */
    release: 0.24,
    liftScale: 1.06,
    lift: 0.12,
    drop: 0.1,
    markScale: 1.12,
    rejectOffset: 8,
    hintAngle: 7,
    hintWiggle: 0.5,
    /** Still between wiggles, so the hint nudges instead of buzzing. */
    hintRest: 1.1,
    hintSettle: 0.1,
    /** One wiggle: each key takes this share of hintWiggle and turns to this share of hintAngle. */
    hintKeys: [
        { time: 0.2, angle: 1 },
        { time: 0.35, angle: -1 },
        { time: 0.25, angle: 0.5 },
        { time: 0.2, angle: 0 },
    ],
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

type ScaleCue = 'rest' | 'lift' | 'mark' | 'press';
type Flag = 'lifted' | 'marked' | 'hinted';

class TilePose {
    pressed = false;
    lifted = false;
    marked = false;
    hinted = false;
    shownScale: ScaleCue = 'rest';
    raised = false;
    wiggling = false;
    readonly scale = new TweenSlot();
    readonly angle = new TweenSlot();
    readonly offset = new TweenSlot();

    constructor(readonly tile: CueTile) {}

    /** A press beats a target mark, which beats a hover lift. */
    get wantedScale(): ScaleCue {
        if (this.pressed) {
            return 'press';
        }
        if (this.marked) {
            return 'mark';
        }
        return this.lifted ? 'lift' : 'rest';
    }
}

/**
 * Press, hover, target and hint cues on tiles resting between turns. Each tile runs one tween per property,
 * the scale picked by priority, so cues never stop each other. reset() hands the tiles to the turn animations.
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

    /** Around the cell, not around node.x: a fast second tap would catch the tile mid-shake. */
    shake(tile: CueTile): void {
        const node = tile.node;
        const x = tile.rest.x;
        const offset = CueFeel.rejectOffset;
        node.x = x;
        this.poseOf(tile).offset.play(
            cc
                .tween(node)
                .to(Timings.reject / 4, { x: x - offset })
                .to(Timings.reject / 2, { x: x + offset })
                .to(Timings.reject / 4, { x }),
        );
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
            pose.scale.play(scaleTween(node, scale, pose.shownScale));
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
        if (pose.hinted !== pose.wiggling) {
            pose.wiggling = pose.hinted;
            pose.angle.play(pose.hinted ? wiggle(node) : cc.tween(node).to(CueFeel.hintSettle, { angle: 0 }));
        }
    }
}

function scaleTween(node: cc.Node, cue: ScaleCue, from: ScaleCue): cc.Tween {
    if (cue === 'press') {
        return cc.tween(node).to(CueFeel.press, { scale: CueFeel.pressedScale }, { easing: 'quadOut' });
    }
    if (cue === 'mark') {
        return cc.tween(node).repeatForever(
            cc
                .tween<cc.Node>()
                .to(Timings.targetPulse / 2, { scale: CueFeel.markScale }, { easing: 'sineInOut' })
                .to(Timings.targetPulse / 2, { scale: 1 }, { easing: 'sineInOut' }),
        );
    }
    const scale = cue === 'lift' ? CueFeel.liftScale : 1;
    if (from === 'press') {
        return cc.tween(node).to(CueFeel.release, { scale }, { easing: 'backOut' });
    }
    return cc.tween(node).to(cue === 'lift' ? CueFeel.lift : CueFeel.drop, { scale }, { easing: 'quadOut' });
}

function wiggle(node: cc.Node): cc.Tween {
    const once = CueFeel.hintKeys.reduce(
        (tween, key) =>
            tween.to(key.time * CueFeel.hintWiggle, { angle: key.angle * CueFeel.hintAngle }, { easing: 'sineInOut' }),
        cc.tween<cc.Node>(),
    );
    return cc.tween(node).repeatForever(once.delay(CueFeel.hintRest));
}
