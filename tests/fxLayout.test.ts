import { praiseLayout, scorePopupLayout } from '../assets/scripts/view/fx/FloatingTextLayout';
import { FxFeel } from '../assets/scripts/view/fx/FxFeel';

const WIDTH = 900;
const HEIGHT = 1000;

describe('score popup layout', () => {
    const tune = FxFeel.scorePopup;

    it('starts a little above the burn in the middle of the board', () => {
        const layout = scorePopupLayout({ x: 50, y: -100 }, 30, 1, WIDTH, HEIGHT);
        expect(layout.text).toBe('+30');
        expect(layout.x).toBe(50);
        expect(layout.y).toBe(-100 + tune.lift);
    });

    it('keeps a top-row popup and its rise inside the board', () => {
        const layout = scorePopupLayout({ x: 0, y: HEIGHT / 2 - 50 }, 30, 1, WIDTH, HEIGHT);
        const top = layout.y + tune.rise + (tune.lineHeight * layout.scale) / 2;
        expect(top).toBeLessThanOrEqual(HEIGHT / 2 - tune.edge + 1e-9);
    });

    it('keeps a wide popup off the side edges', () => {
        const layout = scorePopupLayout({ x: WIDTH / 2 - 50, y: 0 }, 900, 1, WIDTH, HEIGHT);
        const halfWidth = (layout.text.length * tune.fontSize * tune.glyphWidth * layout.scale) / 2;
        expect(layout.x + halfWidth).toBeLessThanOrEqual(WIDTH / 2 - tune.edge + 1e-9);
        expect(layout.x).toBeLessThan(WIDTH / 2 - 50);
    });

    it('grows with every chained wave and leaves room for the badge above', () => {
        const single = scorePopupLayout({ x: 0, y: HEIGHT / 2 - 50 }, 150, 1, WIDTH, HEIGHT);
        const chained = scorePopupLayout({ x: 0, y: HEIGHT / 2 - 50 }, 150, 3, WIDTH, HEIGHT);
        expect(chained.scale).toBeCloseTo(single.scale * (1 + 2 * tune.chainGrowth));
        const badge = FxFeel.chainBadge;
        const badgeTop = chained.y + tune.rise + (badge.raise + badge.lineHeight / 2) * chained.scale;
        expect(badgeTop).toBeLessThanOrEqual(HEIGHT / 2 - tune.edge + 1e-9);
    });
});

describe('praise layout', () => {
    const tune = FxFeel.praise;

    it('puts a praise with no place in the upper part of the board, across it', () => {
        const layout = praiseLayout(null, WIDTH, HEIGHT);
        expect(layout).toEqual({ x: 0, y: HEIGHT * tune.restShare, width: WIDTH * tune.widthShare });
    });

    it('puts a placed praise above the action, as far sideways as its width allows', () => {
        const layout = praiseLayout({ x: 300, y: -200 }, WIDTH, HEIGHT);
        expect(layout.y).toBe(-200 + tune.aboveAction);
        expect(layout.x).toBeCloseTo((WIDTH - layout.width) / 2);
    });

    it('keeps the word inside the board above the top row', () => {
        const layout = praiseLayout({ x: 0, y: HEIGHT / 2 - 50 }, WIDTH, HEIGHT);
        expect(layout.y + (tune.lineHeight * tune.overshoot) / 2).toBeLessThanOrEqual(HEIGHT / 2 + 1e-9);
    });
});
