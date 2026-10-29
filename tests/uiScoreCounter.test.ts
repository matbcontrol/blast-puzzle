import { ScoreCounter } from '../assets/scripts/view/ScoreCounter';

const FRAME = 1 / 60;
const feel = { catchUp: 6, creditWait: 1.5 };

function run(counter: ScoreCounter, seconds: number): number[] {
    const shown: number[] = [];
    for (let t = 0; t < seconds; t += FRAME) {
        counter.step(FRAME);
        shown.push(counter.shown);
    }
    return shown;
}

describe('ScoreCounter', () => {
    it('shows a reset score at once, with nothing to count', () => {
        const counter = new ScoreCounter(feel);
        counter.reset(250);

        expect(counter.shown).toBe(250);
        expect(counter.step(FRAME)).toBe(false);
    });

    it('waits for the points to land before counting', () => {
        const counter = new ScoreCounter(feel);
        counter.setTotal(300);

        expect(run(counter, 1)).toEqual(Array.from({ length: 60 }, () => 0));

        counter.credit(120);
        run(counter, 1);
        expect(counter.shown).toBe(120);
    });

    it('counts up without overshooting, and lands exactly on the credited points', () => {
        const counter = new ScoreCounter(feel);
        counter.setTotal(4400);
        counter.credit(4400);

        const shown = run(counter, 2);

        shown.forEach((value, i) => expect(value).toBeGreaterThanOrEqual(i === 0 ? 0 : shown[i - 1]));
        expect(Math.max(...shown)).toBe(4400);
        expect(shown[shown.length - 1]).toBe(4400);
    });

    it('never credits past the model score, so a stray popup cannot inflate it', () => {
        const counter = new ScoreCounter(feel);
        counter.setTotal(100);
        counter.credit(60);
        counter.credit(60);
        run(counter, 1);

        expect(counter.shown).toBe(100);
    });

    it('counts the rest in by itself once no popup has landed for a while', () => {
        const counter = new ScoreCounter(feel);
        counter.setTotal(500);
        counter.credit(200);

        run(counter, feel.creditWait - 0.1);
        expect(counter.shown).toBe(200);

        run(counter, 1.5);
        expect(counter.shown).toBe(500);
    });

    it('restarts the wait on every landing', () => {
        const counter = new ScoreCounter(feel);
        counter.setTotal(500);
        run(counter, 1);
        counter.credit(100);
        run(counter, 1);

        expect(counter.shown).toBe(100);
    });

    it('counts everything at once when asked', () => {
        const counter = new ScoreCounter({ catchUp: 5, creditWait: 0 });
        counter.reset(0);
        counter.setTotal(3250);
        counter.creditAll();
        run(counter, 2);

        expect(counter.shown).toBe(3250);
    });
});
