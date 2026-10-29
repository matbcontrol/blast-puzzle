import { LoseReason } from '../core/rules/LevelProgress';

/** Strings set from code, ready to be swapped for a localization table. Static labels live in the scene. */
export const Texts = {
    won: 'ПОБЕДА!',
    lost: 'ПОРАЖЕНИЕ',
    score: (score: number, target: number) => `${score}/${target}`,
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
};
