import { Board } from '../assets/scripts/core/board/Board';
import { Shuffler } from '../assets/scripts/core/board/Shuffler';
import { SeededRandom } from '../assets/scripts/core/random/SeededRandom';
import { GroupRules } from '../assets/scripts/core/rules/GroupRules';
import { boardFromText, boardToText } from './helpers/boardText';

const sortedSymbols = (board: Board) => boardToText(board).join('').split('').sort().join('');

describe('Shuffler', () => {
    const deadBoard = () =>
        boardFromText([
            'RGBY', //
            'GBYR',
            'BYRG',
            'YRGB',
        ]);

    it('keeps the same set of tiles', () => {
        const board = deadBoard();
        const before = sortedSymbols(board);

        new Shuffler(new SeededRandom(1), new GroupRules(2)).shuffle(board);

        expect(sortedSymbols(board)).toBe(before);
    });

    it('always leaves a move, whatever the seed', () => {
        const rules = new GroupRules(2);
        for (let seed = 0; seed < 200; seed++) {
            const board = deadBoard();
            new Shuffler(new SeededRandom(seed), rules).shuffle(board);
            expect(rules.hasMove(board)).toBe(true);
        }
    });

    it('plants a group even when the minimum group is large', () => {
        const rules = new GroupRules(4);
        for (let seed = 0; seed < 100; seed++) {
            const board = deadBoard();
            new Shuffler(new SeededRandom(seed), rules).shuffle(board);
            expect(rules.hasMove(board)).toBe(true);
        }
    });

    it('reports where every tile went, the ones that stayed included', () => {
        const board = deadBoard();
        const idsBefore = new Map<number, string>();
        board.positions().forEach((p) => idsBefore.set(board.tileAt(p)!.id, `${p.col}:${p.row}`));

        const moves = new Shuffler(new SeededRandom(7), new GroupRules(2)).shuffle(board);

        expect(moves).toHaveLength(idsBefore.size);
        for (const move of moves) {
            expect(idsBefore.get(move.tileId)).toBe(`${move.from.col}:${move.from.row}`);
            expect(board.tileAt(move.to)!.id).toBe(move.tileId);
        }
    });
});
