import { Point } from './BoardLayout';
import { toCcColor } from './fx/FxColors';
import { TweenSlot } from './TweenSlot';

/** The aiming preview: warm light over the cells an aimed booster would hit. Tint 0xRRGGBB, opacity, px, seconds. */
export const GlowFeel = {
    tint: 0xffe9a8,
    /** Gap between neighbouring glows, so a block of them still reads cell by cell. */
    gap: 10,
    appearScale: 0.75,
    appear: 0.14,
    bright: 190,
    dim: 95,
    breath: 0.9,
};

/**
 * Rounded additive glows over board cells, on a layer of their own. Pooled, because the preview follows
 * the pointer cell by cell. The layer breathes as a whole, so a shown preview runs one tween, not one per cell.
 */
export class CellGlows {
    private readonly glows: cc.Node[] = [];
    private readonly breath = new TweenSlot();
    private shown = 0;

    constructor(
        private readonly layer: cc.Node,
        private readonly frame: cc.SpriteFrame | null,
    ) {}

    show(centers: ReadonlyArray<Point>, width: number, height: number): void {
        const frame = this.frame;
        if (centers.length === 0 || frame === null) {
            this.clear();
            return;
        }
        centers.forEach((center, i) => {
            const glow = i < this.glows.length ? this.glows[i] : this.create(frame);
            cc.Tween.stopAllByTarget(glow);
            glow.setPosition(center.x, center.y);
            glow.setContentSize(width - GlowFeel.gap, height - GlowFeel.gap);
            glow.opacity = 255;
            glow.setScale(GlowFeel.appearScale);
            cc.tween(glow).to(GlowFeel.appear, { scale: 1 }, { easing: 'backOut' }).start();
        });
        for (let i = centers.length; i < this.shown; i++) {
            this.hide(this.glows[i]);
        }
        if (this.shown === 0) {
            this.breathe();
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

    private breathe(): void {
        this.layer.opacity = GlowFeel.bright;
        this.breath.play(
            cc.tween(this.layer).repeatForever(
                cc
                    .tween<cc.Node>()
                    .to(GlowFeel.breath / 2, { opacity: GlowFeel.dim }, { easing: 'sineInOut' })
                    .to(GlowFeel.breath / 2, { opacity: GlowFeel.bright }, { easing: 'sineInOut' }),
            ),
        );
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
        node.color = toCcColor(GlowFeel.tint);
        node.parent = this.layer;
        this.glows.push(node);
        return node;
    }
}
