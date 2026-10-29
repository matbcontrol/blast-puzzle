import { Tile } from '../../core/tiles/Tile';
import { TILE_BEVEL, TILE_FACE } from '../TileArt';
import { TileSkins } from '../TileSkins';

/** Anchored at the center of the face, so the bevel sticks out above the cell. */
const TILE_ANCHOR_Y = TILE_FACE / 2 / (TILE_FACE + TILE_BEVEL);

/**
 * Tiles are plain sprite nodes built in code, so there is no prefab to keep in sync. A released tile stays under
 * the layer at opacity 0: the render walk skips it, and taking it back costs no detach and no reactivation,
 * which matters when a field blast refills all 90 cells in one frame.
 */
export class TileNodePool {
    private readonly idle: cc.Node[] = [];

    constructor(
        private readonly skins: TileSkins,
        private readonly layer: cc.Node,
    ) {}

    acquire(tile: Tile): cc.Node {
        const node = this.idle.pop() || this.create();
        node.getComponent(cc.Sprite).spriteFrame = this.skins.frameFor(tile);
        node.setScale(1);
        node.angle = 0;
        node.color = cc.Color.WHITE;
        node.opacity = 255;
        return node;
    }

    release(node: cc.Node): void {
        cc.Tween.stopAllByTarget(node);
        node.opacity = 0;
        this.idle.push(node);
    }

    clear(): void {
        this.idle.forEach((node) => node.destroy());
        this.idle.length = 0;
    }

    private create(): cc.Node {
        const node = new cc.Node('Tile');
        const sprite = node.addComponent(cc.Sprite);
        sprite.sizeMode = cc.Sprite.SizeMode.RAW;
        sprite.trim = false;
        node.setAnchorPoint(0.5, TILE_ANCHOR_Y);
        node.parent = this.layer;
        return node;
    }
}
