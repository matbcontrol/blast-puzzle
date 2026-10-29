import { Clock } from '../../app/Clock';
import { SuperKind } from '../../core/tiles/SuperKinds';

/** The tiles of a rewarding group, as nodes. */
export interface BadgedGroup {
    readonly tiles: ReadonlyArray<cc.Node>;
    readonly kinds: ReadonlyArray<SuperKind>;
}

/** Badge size as a share of the sprite, its offset from the face center in tile px, opacity and seconds. */
export const BadgeFeel = {
    scale: 0.42,
    offsetX: 28,
    offsetY: 30,
    opacity: 230,
    appear: 0.15,
    /** A group that may earn one of several kinds shows each of them in turn. */
    cycle: 0.8,
};

interface Badge {
    readonly node: cc.Node;
    readonly kinds: ReadonlyArray<SuperKind>;
}

/**
 * Puts the icon of the super tile a group will earn on every tile of the group, so the player can plan around it,
 * as in every commercial blast game. A badge is a child of its tile, so it follows every cue on the tile.
 */
export class TileBadges {
    private readonly idle: cc.Node[] = [];
    private shown: Badge[] = [];
    private turn = 0;
    private stopCycle: (() => void) | null = null;

    constructor(
        private readonly frameOf: (kind: SuperKind) => cc.SpriteFrame,
        private readonly clock: Clock,
    ) {}

    show(groups: ReadonlyArray<BadgedGroup>): void {
        this.clear();
        groups.forEach((group) => {
            if (group.kinds.length > 0) {
                group.tiles.forEach((tile) => this.attach(tile, group.kinds));
            }
        });
        if (this.shown.some((badge) => badge.kinds.length > 1)) {
            this.scheduleCycle();
        }
    }

    clear(): void {
        if (this.stopCycle !== null) {
            this.stopCycle();
            this.stopCycle = null;
        }
        this.shown.forEach((badge) => {
            cc.Tween.stopAllByTarget(badge.node);
            badge.node.removeFromParent(false);
            this.idle.push(badge.node);
        });
        this.shown = [];
        this.turn = 0;
    }

    private attach(tile: cc.Node, kinds: ReadonlyArray<SuperKind>): void {
        const node = this.idle.pop() || this.create();
        node.parent = tile;
        node.setPosition(BadgeFeel.offsetX, BadgeFeel.offsetY);
        node.setScale(BadgeFeel.scale);
        node.opacity = 0;
        this.paint(node, kinds[0]);
        cc.tween(node).to(BadgeFeel.appear, { opacity: BadgeFeel.opacity }).start();
        this.shown.push({ node, kinds });
    }

    private scheduleCycle(): void {
        this.stopCycle = this.clock.schedule(BadgeFeel.cycle, () => {
            this.turn++;
            this.shown.forEach((badge) => {
                if (badge.kinds.length > 1) {
                    this.paint(badge.node, badge.kinds[this.turn % badge.kinds.length]);
                }
            });
            this.scheduleCycle();
        });
    }

    private paint(node: cc.Node, kind: SuperKind): void {
        node.getComponent(cc.Sprite).spriteFrame = this.frameOf(kind);
    }

    private create(): cc.Node {
        const node = new cc.Node('Badge');
        const sprite = node.addComponent(cc.Sprite);
        sprite.sizeMode = cc.Sprite.SizeMode.RAW;
        sprite.trim = false;
        return node;
    }
}
