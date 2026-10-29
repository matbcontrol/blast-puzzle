import { FX_KINDS, FX_TEXTURES, FxKind } from './FxArt';
import { toCcColor } from './FxColors';
import { ParticleSprite, ParticleSprites } from './ParticleSystem';

export interface FxLook {
    readonly frame: cc.SpriteFrame;
    /** Sprites of one layer batch together, so a layer holds one blend mode. */
    readonly layer: cc.Node;
    /** Overlapping light adds up instead of covering: glows and sparkles. */
    readonly additive: boolean;
}

export type FxLooks = { readonly [K in FxKind]: FxLook };

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

/** Sprite nodes for particles, one free list per kind. Nodes are made once and reused for the whole game. */
export class FxSpritePool implements ParticleSprites<FxSprite> {
    private readonly idle: { [K in FxKind]: FxSprite[] } = {
        glow: [],
        sparkle: [],
        shard: [],
        ring: [],
        confetti: [],
        streak: [],
    };
    private readonly tint = new cc.Color();

    constructor(private readonly looks: FxLooks) {}

    prewarm(counts: { readonly [K in FxKind]: number }): void {
        FX_KINDS.forEach((kind) => {
            const idle = this.idle[kind];
            while (idle.length < counts[kind]) {
                idle.push(this.create(kind));
            }
        });
    }

    acquire(kind: FxKind, tint: number): FxSprite {
        const idle = this.idle[kind];
        const sprite = idle.length > 0 ? (idle.pop() as FxSprite) : this.create(kind);
        sprite.node.color = toCcColor(tint, this.tint);
        return sprite;
    }

    release(sprite: FxSprite): void {
        sprite.node.opacity = 0;
        this.idle[sprite.kind].push(sprite);
    }

    private create(kind: FxKind): FxSprite {
        const look = this.looks[kind];
        const size = FX_TEXTURES[kind];
        const node = new cc.Node(kind);
        const sprite = node.addComponent(cc.Sprite);
        sprite.sizeMode = cc.Sprite.SizeMode.CUSTOM;
        sprite.trim = false;
        sprite.spriteFrame = look.frame;
        if (look.additive) {
            sprite.dstBlendFactor = cc.macro.BlendFactor.ONE;
        }
        node.setContentSize(size.width, size.height);
        node.opacity = 0;
        node.parent = look.layer;
        return new FxSprite(kind, node);
    }
}
