const { ccclass, requireComponent } = cc._decorator;

/**
 * Keeps the whole 1080x1920 layout on screen without letterboxing:
 * a tall phone fits the width and gets extra height, a desktop window fits the height
 * and gets extra width. The background fills whatever is left (see CoverBackground).
 */
@ccclass
@requireComponent(cc.Canvas)
export class ScreenFit extends cc.Component {
    onLoad(): void {
        this.apply();
        cc.view.on('canvas-resize', this.apply, this);
    }

    onDestroy(): void {
        cc.view.off('canvas-resize', this.apply, this);
    }

    private apply(): void {
        const canvas = this.getComponent(cc.Canvas);
        const frame = cc.view.getFrameSize();
        const design = canvas.designResolution;
        const tallerThanDesign = frame.width / frame.height < design.width / design.height;
        if (canvas.fitWidth !== tallerThanDesign || canvas.fitHeight === tallerThanDesign) {
            canvas.fitWidth = tallerThanDesign;
            canvas.fitHeight = !tallerThanDesign;
        }
    }
}
