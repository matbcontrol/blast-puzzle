import { Tile } from '../core/tiles/Tile';
import { TileSkins } from './TileSkins';

/** The sprite is 100x112: a 100x100 face plus a 12 px top bevel that overlaps the row above. */
const TILE_ANCHOR_Y = 50 / 112;

/**
 * Tiles are plain sprite nodes built in code, so there is no prefab to keep in sync.
 * Pooling them keeps cascades free of allocations and GC pauses.
 */
export class TileNodePool {
    private readonly pool = new cc.NodePool();

    constructor(
        private readonly skins: TileSkins,
        private readonly parent: cc.Node,
    ) {}

    acquire(tile: Tile): cc.Node {
        const node = this.pool.size() > 0 ? this.pool.get() : this.create();
        node.getComponent(cc.Sprite).spriteFrame = this.skins.frameFor(tile);
        node.setScale(1);
        node.opacity = 255;
        node.angle = 0;
        node.parent = this.parent;
        return node;
    }

    release(node: cc.Node): void {
        cc.Tween.stopAllByTarget(node);
        this.pool.put(node);
    }

    clear(): void {
        this.pool.clear();
    }

    private create(): cc.Node {
        const node = new cc.Node('Tile');
        const sprite = node.addComponent(cc.Sprite);
        sprite.sizeMode = cc.Sprite.SizeMode.RAW;
        sprite.trim = false;
        node.setAnchorPoint(0.5, TILE_ANCHOR_Y);
        return node;
    }
}
