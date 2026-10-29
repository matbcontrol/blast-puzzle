import { TweenSlot } from '../TweenSlot';

/** How the board dims around an aimed booster: brightness 0..255 of a dimmed tile, and seconds. */
export const DimFeel = {
    brightness: 145,
    fadeIn: 0.15,
    fadeOut: 0.12,
};

const LIT = 255;

/**
 * Darkens resting tiles by tint, not by a shade over the board, so the tiles in focus keep their true colors.
 * One tween fades every dimmed tile together, however many there are.
 */
export class TileDimmer {
    private dimmed: ReadonlyArray<cc.Node> = [];
    /** 0 lit, 1 fully dimmed. */
    private readonly level = { value: 0 };
    private readonly fade = new TweenSlot();
    private readonly tint = new cc.Color(LIT, LIT, LIT);

    /** These tiles go dark and every other one lights up again. [] lights the board. */
    dim(nodes: ReadonlyArray<cc.Node>): void {
        if (nodes.length === 0) {
            this.fadeTo(0, DimFeel.fadeOut);
            return;
        }
        this.dimmed.forEach((node) => {
            if (nodes.indexOf(node) < 0) {
                node.color = cc.Color.WHITE;
            }
        });
        this.dimmed = nodes.slice();
        this.apply(this.level.value);
        this.fadeTo(1, DimFeel.fadeIn);
    }

    /** Lights every tile at once: they go back to the animations. */
    reset(): void {
        this.fade.stop();
        this.apply(0);
        this.dimmed = [];
    }

    private fadeTo(target: number, duration: number): void {
        const level = this.level;
        this.fade.play(
            cc.tween(level).to(
                duration,
                { value: target },
                {
                    progress: (start: number, end: number, _current: number, ratio: number) => {
                        const value = start + (end - start) * ratio;
                        this.apply(value);
                        return value;
                    },
                },
            ),
        );
    }

    private apply(value: number): void {
        this.level.value = value;
        const brightness = Math.round(LIT + (DimFeel.brightness - LIT) * value);
        this.tint.r = brightness;
        this.tint.g = brightness;
        this.tint.b = brightness;
        this.dimmed.forEach((node) => (node.color = this.tint));
    }
}
