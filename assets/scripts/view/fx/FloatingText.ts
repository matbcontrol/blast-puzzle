import { toCcColor } from './FxColors';
import { FxFeel } from './FxFeel';
import { PraiseLayout, ScorePopupLayout } from './FloatingTextLayout';
import { ScoreTarget } from './ScoreTarget';

export interface TextStyle {
    readonly fontSize: number;
    readonly lineHeight: number;
    readonly outlineWidth: number;
    readonly color: number;
    readonly outline: number;
}

function createOutlinedLabel(name: string, parent: cc.Node, font: cc.Font | null, style: TextStyle): cc.Label {
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
    node.parent = parent;
    return label;
}

/**
 * A label that draws these glyphs of this style into the character atlas on the next frame. Stroking and uploading
 * a big outlined glyph costs about a millisecond, so doing them all up front keeps the first praise from landing
 * a dozen of them in the frame its blast starts. The caller destroys the node once that frame is drawn.
 */
function warmGlyphs(parent: cc.Node, font: cc.Font | null, style: TextStyle, glyphs: string): cc.Node {
    const label = createOutlinedLabel('GlyphWarmUp', parent, font, style);
    label.string = glyphs;
    // The render walk skips a node at opacity 0, and then nothing would be drawn.
    label.node.opacity = 1;
    return label.node;
}

/** One "+N" with its chain badge. points are what it still owes its target. */
class ScorePopup {
    points = 0;
    target: ScoreTarget | null = null;

    constructor(
        readonly label: cc.Label,
        readonly badge: cc.Label,
    ) {}

    get node(): cc.Node {
        return this.label.node;
    }
}

/**
 * "+N" labels. Each one pops, then rises and fades, or flies into the score target when there is one.
 * Past the limit the oldest one is cut short and reused, so a long chain never piles up text.
 */
export class ScorePopups {
    private readonly idle: ScorePopup[] = [];
    /** Oldest first. */
    private readonly shown: ScorePopup[] = [];

    constructor(
        private readonly layer: cc.Node,
        private readonly font: cc.Font | null,
    ) {}

    show(layout: ScorePopupLayout, points: number, chain: number, target: ScoreTarget | null): void {
        const tune = FxFeel.scorePopup;
        const popup = this.take();
        const node = popup.node;
        popup.label.string = layout.text;
        node.setPosition(layout.x, layout.y);
        node.setScale(0);
        node.opacity = 255;
        node.setSiblingIndex(this.layer.childrenCount - 1);
        this.showBadge(popup.badge, chain);

        const pop = cc.tween<cc.Node>().to(tune.pop, { scale: layout.scale }, { easing: 'backOut' });
        if (target === null) {
            cc.tween(node)
                .parallel(
                    pop,
                    cc.tween<cc.Node>().to(tune.life, { y: layout.y + tune.rise }, { easing: 'quadOut' }),
                    cc
                        .tween<cc.Node>()
                        .delay(tune.life * tune.fadeFrom)
                        .to(tune.life * (1 - tune.fadeFrom), { opacity: 0 }),
                )
                .call(() => this.finish(popup))
                .start();
            return;
        }

        popup.points = points;
        popup.target = target;
        const world = target.scoreWorldPoint();
        const to = this.layer.convertToNodeSpaceAR(cc.v2(world.x, world.y));
        cc.tween(node)
            .parallel(
                pop,
                cc.tween<cc.Node>().to(tune.pop + tune.hold, { y: layout.y + tune.rise }, { easing: 'quadOut' }),
            )
            .to(tune.fly, { x: to.x, y: to.y, scale: layout.scale * tune.flyScale }, { easing: 'quadIn' })
            .call(() => this.finish(popup))
            .start();
    }

    /** For teardown: what is still in flight is dropped, since the target may already be gone with the scene. */
    clear(): void {
        while (this.shown.length > 0) {
            const popup = this.shown[this.shown.length - 1];
            popup.target = null;
            this.finish(popup);
        }
    }

    /** Glyph warm-up labels for both styles, to be destroyed after the next frame. */
    warmUp(): cc.Node[] {
        return [
            warmGlyphs(this.layer, this.font, FxFeel.scorePopup, '+0123456789'),
            warmGlyphs(this.layer, this.font, FxFeel.chainBadge, 'x0123456789'),
        ];
    }

    private take(): ScorePopup {
        if (this.idle.length === 0) {
            if (this.shown.length < FxFeel.scorePopup.maxLabels) {
                this.idle.push(this.create());
            } else {
                this.finish(this.shown[0]);
            }
        }
        const popup = this.idle.pop() as ScorePopup;
        this.shown.push(popup);
        return popup;
    }

    /** Hides the popup and pays out its points, whether it landed or was cut short. */
    private finish(popup: ScorePopup): void {
        cc.Tween.stopAllByTarget(popup.node);
        cc.Tween.stopAllByTarget(popup.badge.node);
        popup.node.opacity = 0;
        const index = this.shown.indexOf(popup);
        if (index >= 0) {
            this.shown.splice(index, 1);
            this.idle.push(popup);
        }
        const target = popup.target;
        const points = popup.points;
        popup.target = null;
        popup.points = 0;
        if (target !== null && points > 0) {
            target.scoreArrived(points);
        }
    }

    private showBadge(badge: cc.Label, chain: number): void {
        const tune = FxFeel.chainBadge;
        const node = badge.node;
        if (chain < 2) {
            node.opacity = 0;
            return;
        }
        badge.string = 'x' + chain;
        node.setPosition(0, tune.raise);
        node.setScale(0);
        node.angle = tune.tilt;
        node.opacity = 255;
        cc.tween(node)
            .delay(tune.delay)
            .to(tune.pop, { scale: tune.overshoot }, { easing: 'backOut' })
            .to(tune.settle, { scale: 1 }, { easing: 'sineOut' })
            .start();
    }

    private create(): ScorePopup {
        const label = createOutlinedLabel('Score', this.layer, this.font, FxFeel.scorePopup);
        // A child, so it follows the popup's position, scale and fade without tweens of its own for them.
        const badge = createOutlinedLabel('Chain', label.node, this.font, FxFeel.chainBadge);
        return new ScorePopup(label, badge);
    }
}

/** One big word on the board. A new praise cuts the current one short. */
export class PraiseBanner {
    private readonly label: cc.Label;
    private tiltSide = 1;

    constructor(
        private readonly layer: cc.Node,
        private readonly font: cc.Font | null,
    ) {
        this.label = createOutlinedLabel('Praise', layer, font, FxFeel.praise);
        this.label.overflow = cc.Label.Overflow.SHRINK;
        this.label.enableWrapText = false;
    }

    show(text: string, layout: PraiseLayout): void {
        const tune = FxFeel.praise;
        const node = this.label.node;
        cc.Tween.stopAllByTarget(node);
        this.label.string = text;
        node.setContentSize(layout.width, tune.lineHeight);
        // Each praise leans the other way, so a run of them does not look like one stuck banner.
        this.tiltSide = -this.tiltSide;
        node.setPosition(layout.x, layout.y);
        node.setScale(0);
        node.opacity = 255;
        node.angle = this.tiltSide * tune.tiltFrom;
        cc.tween(node)
            .to(tune.appear, { scale: tune.overshoot, angle: this.tiltSide * tune.tilt }, { easing: 'backOut' })
            .to(tune.settle, { scale: 1 }, { easing: 'sineOut' })
            .delay(tune.hold)
            .to(tune.leave, { y: layout.y + tune.rise, opacity: 0 }, { easing: 'quadIn' })
            .start();
    }

    hide(): void {
        cc.Tween.stopAllByTarget(this.label.node);
        this.label.node.opacity = 0;
    }

    /**
     * A glyph warm-up label for every word this banner may show, to be destroyed after the next frame. The glyph
     * cache is keyed by font size before SHRINK applies, so an unshrunk label fills the same entries.
     */
    warmUp(words: ReadonlyArray<string>): cc.Node {
        return warmGlyphs(this.layer, this.font, FxFeel.praise, words.join(''));
    }
}
