import { FX_TEXTURES, FxKind } from './FxArt';
import { toCcColor } from './FxColors';
import { ParticleSprite, ParticleSprites } from './ParticleSystem';

export interface FxLook {
    /** Null when the art is missing: the sprites stay invisible, which decoration can afford. */
    readonly frame: cc.SpriteFrame | null;
    /** Sprites of one layer batch together, so a layer holds one blend mode. */
    readonly layer: cc.Node;
    /** Overlapping light adds up instead of covering: glows and sparkles. */
    readonly additive: boolean;
}

/** Stays parented while idle: the render walk skips a node at opacity 0, and nothing is reattached per particle. */
export class FxSprite implements ParticleSprite {
    constructor(
        readonly kind: FxKind,
        readonly node: cc.Node,
    ) {}

    place(x: number, y: number, angle: number, scaleX: number, scaleY: number, opacity: number): void {
        const node = this.node;
        node.setPosition(x, y);
        node.angle = angle;
        node.setScale(scaleX, scaleY);
        node.opacity = opacity;
    }
}

interface KindStock {
    readonly kind: FxKind;
    readonly look: FxLook;
    readonly idle: FxSprite[];
}

/**
 * Sprite nodes for particles, one free list per kind it has a look for. The prewarmed nodes are made at load,
 * and the free lists only grow when a kind outruns its prewarm count.
 */
export class FxSpritePool<K extends FxKind> implements ParticleSprites<FxSprite> {
    private readonly stocks = new Map<FxKind, KindStock>();
    private readonly tint = new cc.Color();

    constructor(looks: { readonly [P in K]: FxLook }, prewarm: { readonly [P in K]: number }) {
        (Object.keys(looks) as K[]).forEach((kind) => {
            const stock: KindStock = { kind, look: looks[kind], idle: [] };
            while (stock.idle.length < prewarm[kind]) {
                stock.idle.push(this.create(stock));
            }
            this.stocks.set(kind, stock);
        });
    }

    acquire(kind: FxKind, tint: number): FxSprite {
        const stock = this.stockOf(kind);
        const sprite = stock.idle.length > 0 ? (stock.idle.pop() as FxSprite) : this.create(stock);
        sprite.node.color = toCcColor(tint, this.tint);
        return sprite;
    }

    release(sprite: FxSprite): void {
        sprite.node.opacity = 0;
        this.stockOf(sprite.kind).idle.push(sprite);
    }

    private stockOf(kind: FxKind): KindStock {
        const stock = this.stocks.get(kind);
        if (stock === undefined) {
            throw new Error(`FxSpritePool: no look for "${kind}"`);
        }
        return stock;
    }

    private create(stock: KindStock): FxSprite {
        const look = stock.look;
        const size = FX_TEXTURES[stock.kind];
        const node = new cc.Node(stock.kind);
        const sprite = node.addComponent(cc.Sprite);
        sprite.sizeMode = cc.Sprite.SizeMode.CUSTOM;
        sprite.trim = false;
        if (look.frame !== null) {
            sprite.spriteFrame = look.frame;
        }
        if (look.additive) {
            sprite.dstBlendFactor = cc.macro.BlendFactor.ONE;
        }
        node.setContentSize(size.width, size.height);
        node.opacity = 0;
        node.parent = look.layer;
        return new FxSprite(stock.kind, node);
    }
}
