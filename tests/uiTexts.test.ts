import { BoosterIds } from '../assets/scripts/core/boosters/BoosterIds';
import { Texts } from '../assets/scripts/view/Texts';

describe('Texts', () => {
    it('agrees the moves with their number', () => {
        expect([1, 2, 5, 11, 21, 24].map(Texts.lowMoves)).toEqual([
            'Остался 1 ход!',
            'Осталось 2 хода!',
            'Осталось 5 ходов!',
            'Осталось 11 ходов!',
            'Остался 21 ход!',
            'Осталось 24 хода!',
        ]);
        expect([0, 1, 3, 7].map(Texts.finale)).toEqual([
            'Бонус!',
            'Бонус за 1 ход!',
            'Бонус за 3 хода!',
            'Бонус за 7 ходов!',
        ]);
        expect(Texts.goal(3200, 30)).toBe('Набери 3200 очков\nза 30 ходов');
    });

    it('says how many points a loss fell short by', () => {
        expect([1, 3, 840, 21].map(Texts.shortBy)).toEqual([
            'Не хватило 1 очка',
            'Не хватило 3 очков',
            'Не хватило 840 очков',
            'Не хватило 21 очка',
        ]);
    });

    it('has a caption for every booster', () => {
        [BoosterIds.Bomb, BoosterIds.Teleport].forEach((id) =>
            expect(Texts.aimCaption(id)).not.toBe(Texts.aimCaption('unknown')),
        );
    });
});
