import { Point } from '../BoardLayout';
import { toCcColor } from '../fx/FxColors';
import { TweenSlot } from '../TweenSlot';
import { pulse } from '../Tweens';

/** The aiming preview: a lit rim inside each cell. Tint 0xRRGGBB, board px, opacity 0..255 and seconds. */
export const OutlineFeel = {
    tint: 0xffe9a8,
    /** From the cell edge to the middle of the rim. */
    inset: 8,
    radius: 16,
    /** A wide faint stroke under a thin bright one reads as light. */
    halo: { width: 12, opacity: 80 },
    rim: { width: 5, opacity: 255 },
    breath: { peak: 255, rest: 150, rise: 0.45, fall: 0.45 },
};

/**
 * Outlines the cells an aimed booster would hit. A rim, not a filled glow: the tile colors inside stay true,
 * so the player still sees what the booster would take. All rims are one Graphics path, one draw call.
 */
export class CellOutlines {
    private readonly node: cc.Node;
    private readonly graphics: cc.Graphics;
    private readonly breath = new TweenSlot();
    private readonly color = toCcColor(OutlineFeel.tint);
    private shown = false;

    constructor(layer: cc.Node) {
        this.node = new cc.Node('Outlines');
        this.node.parent = layer;
        this.graphics = this.node.addComponent(cc.Graphics);
    }

    show(centers: ReadonlyArray<Point>, cellWidth: number, cellHeight: number): void {
        this.graphics.clear();
        if (centers.length === 0) {
            this.clear();
            return;
        }
        this.stroke(centers, cellWidth, cellHeight, OutlineFeel.halo);
        this.stroke(centers, cellWidth, cellHeight, OutlineFeel.rim);
        if (!this.shown) {
            this.shown = true;
            this.node.opacity = OutlineFeel.breath.peak;
            this.breath.play(pulse(this.node, 'opacity', OutlineFeel.breath));
        }
    }

    clear(): void {
        this.graphics.clear();
        this.breath.stop();
        this.shown = false;
    }

    private stroke(
        centers: ReadonlyArray<Point>,
        cellWidth: number,
        cellHeight: number,
        line: { readonly width: number; readonly opacity: number },
    ): void {
        const graphics = this.graphics;
        const inset = OutlineFeel.inset;
        this.color.a = line.opacity;
        graphics.lineWidth = line.width;
        graphics.strokeColor = this.color;
        centers.forEach((center) =>
            graphics.roundRect(
                center.x - cellWidth / 2 + inset,
                center.y - cellHeight / 2 + inset,
                cellWidth - 2 * inset,
                cellHeight - 2 * inset,
                OutlineFeel.radius,
            ),
        );
        graphics.stroke();
    }
}
