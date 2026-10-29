import { Point } from '../BoardLayout';
import { toCcColor } from '../fx/FxColors';
import { FxFeel } from '../fx/FxFeel';
import { TweenSlot } from '../TweenSlot';
import { PulseShape, pulse } from '../Tweens';
import { HINT_BEAT } from './TileCues';

/** How one set of glows looks. Tint 0xRRGGBB, the layer's opacity breath, and the glow size as a share of a cell. */
export interface GlowLook {
    readonly tint: number;
    readonly breath: PulseShape;
    readonly cellShare: number;
    /** Board px left between neighbouring glows, so a block of them still reads cell by cell. */
    readonly gap: number;
}

/** Glows over or under board cells: opacity, shares of a cell, board px and seconds. */
export const GlowFeel = {
    appearScale: 0.75,
    appear: 0.14,
    /** A picked booster target. */
    target: {
        tint: 0xffe9a8,
        breath: { peak: 190, rest: 95, rise: 0.45, fall: 0.45 },
        cellShare: 1,
        gap: 10,
    },
    /** The hinted move, lit on the beat of its wiggle. */
    hint: {
        tint: 0xfff3c4,
        breath: { peak: 95, rest: 25, ...HINT_BEAT },
        cellShare: 1,
        gap: 10,
    },
    /** Soft light behind a resting super tile, so its smaller sprite does not read as a hole in the board. */
    superBacking: {
        tint: FxFeel.palette.super,
        breath: { peak: 150, rest: 90, rise: 0.6, fall: 0.6 },
        cellShare: 1.3,
        gap: 0,
    },
};

/**
 * Additive glows over board cells, on a layer of their own. Pooled, because a preview follows the pointer
 * cell by cell. The layer breathes as a whole, so shown glows run one tween, not one per cell.
 */
export class CellGlows {
    private readonly glows: cc.Node[] = [];
    private readonly breath = new TweenSlot();
    private shown = 0;

    constructor(
        private readonly layer: cc.Node,
        private readonly frame: cc.SpriteFrame | null,
        private readonly look: GlowLook,
    ) {}

    show(centers: ReadonlyArray<Point>, cellWidth: number, cellHeight: number): void {
        const frame = this.frame;
        if (centers.length === 0 || frame === null) {
            this.clear();
            return;
        }
        const look = this.look;
        centers.forEach((center, i) => {
            const glow = i < this.glows.length ? this.glows[i] : this.create(frame);
            cc.Tween.stopAllByTarget(glow);
            glow.setPosition(center.x, center.y);
            glow.setContentSize(cellWidth * look.cellShare - look.gap, cellHeight * look.cellShare - look.gap);
            glow.opacity = 255;
            glow.setScale(GlowFeel.appearScale);
            cc.tween(glow).to(GlowFeel.appear, { scale: 1 }, { easing: 'backOut' }).start();
        });
        for (let i = centers.length; i < this.shown; i++) {
            this.hide(this.glows[i]);
        }
        if (this.shown === 0) {
            this.layer.opacity = look.breath.rest;
            this.breath.play(pulse(this.layer, 'opacity', look.breath));
        }
        this.shown = centers.length;
    }

    clear(): void {
        for (let i = 0; i < this.shown; i++) {
            this.hide(this.glows[i]);
        }
        this.shown = 0;
        this.breath.stop();
    }

    /** Stays parented at opacity 0: the render walk skips it, and nothing is reattached on the next show. */
    private hide(glow: cc.Node): void {
        cc.Tween.stopAllByTarget(glow);
        glow.opacity = 0;
    }

    private create(frame: cc.SpriteFrame): cc.Node {
        const node = new cc.Node('Glow');
        const sprite = node.addComponent(cc.Sprite);
        sprite.type = cc.Sprite.Type.SLICED;
        sprite.sizeMode = cc.Sprite.SizeMode.CUSTOM;
        sprite.trim = false;
        sprite.spriteFrame = frame;
        // Light adds up over the tiles instead of covering them.
        sprite.dstBlendFactor = cc.macro.BlendFactor.ONE;
        node.color = toCcColor(this.look.tint);
        node.parent = this.layer;
        this.glows.push(node);
        return node;
    }
}
