import { ResumeQueue } from '../assets/scripts/view/audio/ResumeQueue';

describe('ResumeQueue', () => {
    it('hands back what was asked for during the unlock, oldest first', () => {
        const queue = new ResumeQueue<string>(150, 4);
        queue.push('pop', 1000);
        queue.push('select', 1010);

        expect(queue.drain(1060)).toEqual(['pop', 'select']);
    });

    it('drops a sound that would land too late after its picture', () => {
        const queue = new ResumeQueue<string>(150, 4);
        queue.push('pop', 1000);
        queue.push('land', 1100);

        expect(queue.drain(1200)).toEqual(['land']);
    });

    it('plays each held sound once', () => {
        const queue = new ResumeQueue<string>(150, 4);
        queue.push('pop', 0);

        expect(queue.drain(10)).toEqual(['pop']);
        expect(queue.drain(20)).toEqual([]);
    });

    it('keeps only the latest requests when more arrive than it holds', () => {
        const queue = new ResumeQueue<string>(150, 2);
        ['a', 'b', 'c'].forEach((id, i) => queue.push(id, i));

        expect(queue.drain(5)).toEqual(['b', 'c']);
    });

    it('forgets everything when cleared', () => {
        const queue = new ResumeQueue<string>(150, 4);
        queue.push('pop', 0);
        queue.clear();

        expect(queue.drain(1)).toEqual([]);
    });
});
