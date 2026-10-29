import { SuperKind } from '../core/tiles/SuperKinds';
import { Tile } from '../core/tiles/Tile';

const { ccclass, property } = cc._decorator;

@ccclass('SuperTileSkin')
export class SuperTileSkin {
    @property(cc.String)
    kind = '';

    @property(cc.SpriteFrame)
    frame: cc.SpriteFrame = null!;
}

/** Sprites per tile color and per super tile kind. A new kind gets its sprite in the inspector, not in code. */
@ccclass
export class TileSkins extends cc.Component {
    @property([cc.SpriteFrame])
    colors: cc.SpriteFrame[] = [];

    @property([SuperTileSkin])
    supers: SuperTileSkin[] = [];

    frameFor(tile: Tile): cc.SpriteFrame {
        return tile.color !== null ? this.colors[tile.color] : this.superFrame(tile.requireSuperKind());
    }

    superFrame(kind: SuperKind): cc.SpriteFrame {
        for (const skin of this.supers) {
            if (skin.kind === kind) {
                return skin.frame;
            }
        }
        throw new Error(`No sprite for super tile "${kind}"`);
    }
}
