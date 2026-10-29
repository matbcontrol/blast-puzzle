import { LoseReason } from '../core/rules/LevelProgress';

const AIM_CAPTIONS: { readonly [boosterId: string]: string } = {
    bomb: 'Выбери клетку для бомбы',
    teleport: 'Выбери два тайла, чтобы поменять их местами',
};

/** Strings set from code, ready to be swapped for a localization table. Static labels live in the scene. */
export const Texts = {
    won: 'ПОБЕДА!',
    lost: 'ПОРАЖЕНИЕ',
    score: (score: number, target: number) => `${score}/${target}`,
    praise: {
        good: 'Хорошо!',
        great: 'Отлично!',
        awesome: 'Супер!',
        incredible: 'Невероятно!',
        shuffle: 'Перемешиваем!',
    },
    loseReason: (reason: LoseReason | null): string => {
        switch (reason) {
            case 'outOfMoves':
                return 'Закончились ходы';
            case 'noMoves':
                return 'На поле не осталось ходов';
            default:
                return '';
        }
    },
    goal: (score: number, moves: number): string =>
        `Набери ${score} ${plural(score, 'очко', 'очка', 'очков')}\nза ${moves} ${plural(moves, 'ход', 'хода', 'ходов')}`,
    aimCaption: (boosterId: string): string => AIM_CAPTIONS[boosterId] || 'Выбери клетку',
};

/** Russian plural: 1 ход, 2 хода, 5 ходов, 11 ходов, 21 ход. */
function plural(count: number, one: string, few: string, many: string): string {
    const lastTwo = Math.abs(count) % 100;
    const last = lastTwo % 10;
    if (lastTwo >= 11 && lastTwo <= 14) {
        return many;
    }
    if (last === 1) {
        return one;
    }
    return last >= 2 && last <= 4 ? few : many;
}
