import { FxFeel } from './FxFeel';

/** A white panel over the whole board that blinks and fades. Nine-sliced, so its corners stay round at any size. */
export class BoardFlash {
    private readonly node: cc.Node;

    constructor(layer: cc.Node, frame: cc.SpriteFrame | null) {
        this.node = new cc.Node('Flash');
        const sprite = this.node.addComponent(cc.Sprite);
        sprite.type = cc.Sprite.Type.SLICED;
        sprite.sizeMode = cc.Sprite.SizeMode.CUSTOM;
        sprite.trim = false;
        if (frame !== null) {
            sprite.spriteFrame = frame;
        }
        this.node.opacity = 0;
        this.node.parent = layer;
    }

    play(width: number, height: number): void {
        const tune = FxFeel.flash;
        const node = this.node;
        cc.Tween.stopAllByTarget(node);
        node.setContentSize(width + 2 * tune.padding, height + 2 * tune.padding);
        node.opacity = tune.opacity;
        cc.tween(node).to(tune.duration, { opacity: 0 }, { easing: 'quadOut' }).start();
    }

    stop(): void {
        cc.Tween.stopAllByTarget(this.node);
        this.node.opacity = 0;
    }
}
