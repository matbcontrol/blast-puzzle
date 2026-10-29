import { BoosterIds } from '../core/boosters/BoosterIds';
import { LoseReason } from '../core/rules/LevelProgress';

const AIM_CAPTIONS: { readonly [boosterId: string]: string } = {
    [BoosterIds.Bomb]: 'Выбери клетку для бомбы',
    [BoosterIds.Teleport]: 'Выбери два тайла, чтобы поменять их местами',
};

/** Strings set from code, ready to be swapped for a localization table. Static labels live in the scene. */
export const Texts = {
    won: 'ПОБЕДА!',
    lost: 'ПОРАЖЕНИЕ',
    almost: 'ПОЧТИ!',
    score: (score: number, target: number): string => `${score}/${target}`,
    /** The final count on a won level: the bar above it already shows the goal. */
    total: (score: number): string => `Очки: ${score}`,
    /** Every value is drawn into the glyph atlas at load, so a praise word never draws its glyphs mid-blast. */
    praise: {
        great: 'Отлично!',
        awesome: 'Супер!',
        incredible: 'Невероятно!',
        shuffle: 'Перемешиваем!',
        levelDone: 'Уровень пройден!',
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
    shortBy: (points: number): string => `Не хватило ${points} ${plural(points, 'очка', 'очков', 'очков')}`,
    goal: (score: number, moves: number): string =>
        `Набери ${score} ${plural(score, 'очко', 'очка', 'очков')}\nза ${moveCount(moves)}`,
    lowMoves: (moves: number): string => `${plural(moves, 'Остался', 'Осталось', 'Осталось')} ${moveCount(moves)}!`,
    finale: (moves: number): string => `Бонус за ${moveCount(moves)}!`,
    aimCaption: (boosterId: string): string => AIM_CAPTIONS[boosterId] || 'Выбери клетку',
};

function moveCount(moves: number): string {
    return `${moves} ${plural(moves, 'ход', 'хода', 'ходов')}`;
}

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
