import { pulse } from './Tweens';
import { TweenSlot } from './TweenSlot';

const { ccclass } = cc._decorator;

export const BackgroundFeel = {
    /** A slow breath that keeps the still art alive: the cover scale grows by this share and back, seconds each way. */
    breath: { swell: 0.02, half: 10 },
};

/**
 * Scales the background so it always covers the visible area: a wide desktop window
 * shows more of the scenery, a tall phone gets no empty bars above and below.
 */
@ccclass
export class CoverBackground extends cc.Component {
    private readonly breathing = new TweenSlot();

    onLoad(): void {
        this.fit();
        cc.view.on('canvas-resize', this.fit, this);
    }

    onDestroy(): void {
        cc.view.off('canvas-resize', this.fit, this);
        this.breathing.stop();
    }

    /** The art is placed off-center in the mockup, so the offset counts towards the size to cover. */
    private fit(): void {
        const visible = cc.view.getVisibleSize();
        const scaleX = (visible.width + 2 * Math.abs(this.node.x)) / this.node.width;
        const scaleY = (visible.height + 2 * Math.abs(this.node.y)) / this.node.height;
        const cover = Math.max(1, scaleX, scaleY);
        const breath = BackgroundFeel.breath;
        this.node.setScale(cover);
        // Breathes only outward, so the art never uncovers an edge.
        this.breathing.play(
            pulse(this.node, 'scale', {
                peak: cover * (1 + breath.swell),
                rest: cover,
                rise: breath.half,
                fall: breath.half,
            }),
        );
    }
}
