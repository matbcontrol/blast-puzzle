import { fieldScale } from '../assets/scripts/view/FieldFit';

const design = { width: 1080, height: 1920 };
const field = { width: 980, height: 1092 };

describe('fieldScale', () => {
    it('keeps the design size on the design screen and on a wide window', () => {
        expect(fieldScale(design, design, field, 0.96)).toBe(1);
        expect(fieldScale({ width: 2400, height: 1920 }, design, field, 0.96)).toBe(1);
    });

    it('grows into the extra height of a tall phone, up to the width share', () => {
        const iphoneX = { width: 1080, height: (1080 * 812) / 375 };

        expect(fieldScale(iphoneX, design, field, 0.96)).toBeCloseTo((0.96 * 1080) / 980);
    });

    it('grows only by the height that opened when that is the tighter limit', () => {
        const slightlyTaller = { width: 1080, height: 1950 };

        expect(fieldScale(slightlyTaller, design, field, 0.96)).toBeCloseTo((1092 + 30) / 1092);
    });
});
