import { fieldScale } from './FieldFit';

const { ccclass, property, requireComponent } = cc._decorator;

export const ScreenFitFeel = {
    /** The board frame may grow until it takes this share of the visible width. */
    fieldWidthShare: 0.96,
};

/**
 * Keeps the whole 1080x1920 layout on screen without letterboxing: a tall phone fits the width and gets extra height,
 * a desktop window fits the height and gets extra width. Widgets pin the HUD to the top and the boosters to the bottom,
 * the board frame grows into the height that opens between them, and the background fills the rest (CoverBackground).
 */
@ccclass
@requireComponent(cc.Canvas)
export class ScreenFit extends cc.Component {
    @property({ type: cc.Node, tooltip: 'Board frame, centered between the HUD and the boosters' })
    field: cc.Node = null!;

    private designField: cc.Size = null!;

    onLoad(): void {
        this.designField = this.field.getContentSize();
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
        this.field.setScale(
            fieldScale(cc.view.getVisibleSize(), design, this.designField, ScreenFitFeel.fieldWidthShare),
        );
    }
}
