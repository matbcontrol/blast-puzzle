const { ccclass } = cc._decorator;

/**
 * Scales the background so it always covers the visible area: a wide desktop window
 * shows more of the scenery, a tall phone gets no empty bars above and below.
 */
@ccclass
export class CoverBackground extends cc.Component {
    onLoad(): void {
        this.fit();
        cc.view.on('canvas-resize', this.fit, this);
    }

    onDestroy(): void {
        cc.view.off('canvas-resize', this.fit, this);
    }

    /** The art is placed off-center in the mockup, so the offset counts towards the size to cover. */
    private fit(): void {
        const visible = cc.view.getVisibleSize();
        const scaleX = (visible.width + 2 * Math.abs(this.node.x)) / this.node.width;
        const scaleY = (visible.height + 2 * Math.abs(this.node.y)) / this.node.height;
        this.node.setScale(Math.max(1, scaleX, scaleY));
    }
}
