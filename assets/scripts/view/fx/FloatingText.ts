import { toCcColor } from './FxColors';
import { logLerp } from './FxMath';
import { FxTuning } from './FxTuning';

export interface TextStyle {
    readonly fontSize: number;
    readonly lineHeight: number;
    readonly outlineWidth: number;
    readonly color: number;
    readonly outline: number;
}

function createOutlinedLabel(name: string, layer: cc.Node, font: cc.Font | null, style: TextStyle): cc.Label {
    const node = new cc.Node(name);
    const label = node.addComponent(cc.Label);
    if (font !== null) {
        label.font = font;
    }
    label.fontSize = style.fontSize;
    label.lineHeight = style.lineHeight;
    label.horizontalAlign = cc.Label.HorizontalAlign.CENTER;
    label.verticalAlign = cc.Label.VerticalAlign.CENTER;
    // Glyphs go to the shared character atlas: a new number reuses them instead of drawing a new texture.
    label.cacheMode = cc.Label.CacheMode.CHAR;
    const outline = node.addComponent(cc.LabelOutline);
    outline.color = toCcColor(style.outline);
    outline.width = style.outlineWidth;
    // The character atlas bakes the color into the glyphs, so it is set once and never tweened.
    node.color = toCcColor(style.color);
    node.opacity = 0;
    node.parent = layer;
    return label;
}

/** "+N" labels. Past the limit the oldest one is reused, so a long chain never piles up text. */
export class ScorePopups {
    private readonly idle: cc.Label[] = [];
    /** Oldest first. */
    private readonly shown: cc.Label[] = [];

    constructor(
        private readonly layer: cc.Node,
        private readonly font: cc.Font | null,
    ) {}

    show(x: number, y: number, points: number): void {
        const tune = FxTuning.scorePopup;
        const label = this.take();
        const node = label.node;
        label.string = '+' + points;
        const scale = logLerp(points, tune.pointsLow, tune.pointsHigh, tune.scaleLow, tune.scaleHigh);
        const startY = y + tune.lift;
        node.setPosition(x, startY);
        node.setScale(0);
        node.opacity = 255;
        node.setSiblingIndex(this.layer.childrenCount - 1);
        cc.tween(node)
            .parallel(
                cc.tween<cc.Node>().to(tune.pop, { scale }, { easing: 'backOut' }),
                cc.tween<cc.Node>().to(tune.life, { y: startY + tune.rise }, { easing: 'quadOut' }),
                cc
                    .tween<cc.Node>()
                    .delay(tune.life * tune.fadeFrom)
                    .to(tune.life * (1 - tune.fadeFrom), { opacity: 0 }),
            )
            .call(() => this.finish(label))
            .start();
    }

    clear(): void {
        while (this.shown.length > 0) {
            this.finish(this.shown[this.shown.length - 1]);
        }
    }

    private take(): cc.Label {
        let label: cc.Label;
        if (this.idle.length > 0) {
            label = this.idle.pop() as cc.Label;
        } else if (this.shown.length < FxTuning.scorePopup.maxLabels) {
            label = createOutlinedLabel('Score', this.layer, this.font, FxTuning.scorePopup);
        } else {
            label = this.shown.shift() as cc.Label;
            cc.Tween.stopAllByTarget(label.node);
        }
        this.shown.push(label);
        return label;
    }

    private finish(label: cc.Label): void {
        cc.Tween.stopAllByTarget(label.node);
        label.node.opacity = 0;
        const index = this.shown.indexOf(label);
        if (index >= 0) {
            this.shown.splice(index, 1);
            this.idle.push(label);
        }
    }
}

/** One big word in the middle of the board. A new praise cuts the current one short. */
export class PraiseBanner {
    private readonly label: cc.Label;
    private tiltSide = 1;

    constructor(layer: cc.Node, font: cc.Font | null) {
        this.label = createOutlinedLabel('Praise', layer, font, FxTuning.praise);
        this.label.overflow = cc.Label.Overflow.SHRINK;
        this.label.enableWrapText = false;
    }

    show(text: string, x: number, y: number, maxWidth: number): void {
        const tune = FxTuning.praise;
        const node = this.label.node;
        cc.Tween.stopAllByTarget(node);
        this.label.string = text;
        node.setContentSize(maxWidth, tune.lineHeight);
        // Each praise leans the other way, so a run of them does not look like one stuck banner.
        this.tiltSide = -this.tiltSide;
        node.setPosition(x, y);
        node.setScale(0);
        node.opacity = 255;
        node.angle = this.tiltSide * tune.tiltFrom;
        cc.tween(node)
            .to(tune.appear, { scale: tune.overshoot, angle: this.tiltSide * tune.tilt }, { easing: 'backOut' })
            .to(tune.settle, { scale: 1 }, { easing: 'sineOut' })
            .delay(tune.hold)
            .to(tune.leave, { y: y + tune.rise, opacity: 0 }, { easing: 'quadIn' })
            .start();
    }

    hide(): void {
        cc.Tween.stopAllByTarget(this.label.node);
        this.label.node.opacity = 0;
    }
}
