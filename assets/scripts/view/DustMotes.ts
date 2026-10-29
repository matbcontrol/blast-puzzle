import { toCcColor } from './fx/FxColors';
import { effectRandom, FULL_TURN, inRange } from './fx/FxMath';

const { ccclass, property } = cc._decorator;

/** Counts, design px, opacities and seconds of the dust over the background. */
export const DustFeel = {
    count: 7,
    size: { min: 40, max: 90 },
    peakOpacity: { min: 40, max: 70 },
    /** Each mote fades in, drifts this far and fades out over one leg, then shows up somewhere else. */
    drift: { min: 120, max: 260 },
    leg: { min: 8, max: 13 },
    tint: 0xfff1d6,
};

/**
 * A few soft lights drifting over the background, so the scenery never stands still. One additive layer of
 * a handful of sprites placed between the background and the HUD: one draw call, no update loop.
 */
@ccclass
export class DustMotes extends cc.Component {
    @property({ type: cc.SpriteFrame, tooltip: 'Soft round glow' })
    frame: cc.SpriteFrame | null = null;

    onLoad(): void {
        if (this.frame === null) {
            cc.warn('DustMotes: no frame, the background dust stays off');
            return;
        }
        for (let i = 0; i < DustFeel.count; i++) {
            this.drift(this.createMote(this.frame));
        }
    }

    onDestroy(): void {
        this.node.children.forEach((mote) => cc.Tween.stopAllByTarget(mote));
    }

    private createMote(frame: cc.SpriteFrame): cc.Node {
        const node = new cc.Node('Mote');
        const sprite = node.addComponent(cc.Sprite);
        sprite.sizeMode = cc.Sprite.SizeMode.CUSTOM;
        sprite.spriteFrame = frame;
        sprite.dstBlendFactor = cc.macro.BlendFactor.ONE;
        node.color = toCcColor(DustFeel.tint);
        node.opacity = 0;
        node.parent = this.node;
        return node;
    }

    /** One leg: fade in while drifting, fade out, start over at a new place. The only tween a mote has. */
    private drift(mote: cc.Node): void {
        const visible = cc.view.getVisibleSize();
        const size = inRange(DustFeel.size, effectRandom);
        const leg = inRange(DustFeel.leg, effectRandom);
        const angle = effectRandom.next() * FULL_TURN;
        const reach = inRange(DustFeel.drift, effectRandom);
        const x = (effectRandom.next() - 0.5) * visible.width;
        const y = (effectRandom.next() - 0.5) * visible.height;
        mote.setContentSize(size, size);
        mote.setPosition(x, y);
        mote.opacity = 0;
        cc.tween(mote)
            .parallel(
                cc.tween<cc.Node>().to(leg, { x: x + reach * Math.cos(angle), y: y + reach * Math.sin(angle) }),
                cc
                    .tween<cc.Node>()
                    .to(leg / 2, { opacity: inRange(DustFeel.peakOpacity, effectRandom) }, { easing: 'sineInOut' })
                    .to(leg / 2, { opacity: 0 }, { easing: 'sineInOut' }),
            )
            .call(() => this.drift(mote))
            .start();
    }
}
