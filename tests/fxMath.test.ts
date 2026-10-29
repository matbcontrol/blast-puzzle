import { SeededRandom } from '../assets/scripts/core/random/SeededRandom';
import { budgeted, logLerp, mixColor, spreadAngle, uprightDeg } from '../assets/scripts/view/fx/FxMath';
import { RocketFlight } from '../assets/scripts/view/fx/RocketFlight';

describe('fx math', () => {
    it('gives every piece of a burst its own sector of the circle', () => {
        const random = new SeededRandom(3);
        const count = 8;
        const sector = (2 * Math.PI) / count;
        for (let i = 0; i < count; i++) {
            const angle = spreadAngle(i, count, 0, 1, random);
            expect(angle).toBeGreaterThanOrEqual(i * sector);
            expect(angle).toBeLessThanOrEqual((i + 1) * sector);
        }
    });

    it('thins effects as the particle system fills up', () => {
        expect(budgeted(14, 0, 2)).toBe(14);
        expect(budgeted(14, 0.5, 2)).toBe(7);
        expect(budgeted(14, 0.95, 2)).toBe(2);
        expect(budgeted(3, 1, 0)).toBe(0);
    });

    it('mixes colors channel by channel', () => {
        expect(mixColor(0xff0000, 0xffffff, 0.5)).toBe(0xff8080);
        expect(mixColor(0x123456, 0x000000, 0)).toBe(0x123456);
    });

    it('grows on a log scale between the two points', () => {
        expect(logLerp(10, 20, 600, 1, 2)).toBe(1);
        expect(logLerp(600, 20, 600, 1, 2)).toBe(2);
        expect(logLerp(5000, 20, 600, 1, 2)).toBe(2);
        expect(logLerp(Math.sqrt(20 * 600), 20, 600, 1, 2)).toBeCloseTo(1.5);
    });

    it('never turns two-way art upside down', () => {
        expect(uprightDeg(0)).toBe(0);
        expect(uprightDeg(180)).toBe(0);
        expect(uprightDeg(90)).toBe(90);
        expect(uprightDeg(-90)).toBe(90);
        expect(uprightDeg(135)).toBe(-45);
        expect(uprightDeg(-135)).toBe(45);
    });
});

describe('RocketFlight', () => {
    it('moves at constant speed and arrives after its duration', () => {
        const flight = new RocketFlight({ x: 0, y: 0 }, { x: 400, y: 0 }, 0.4);
        flight.advance(0.1);
        expect(flight.x).toBeCloseTo(100);
        expect(flight.arrived).toBe(false);
        flight.advance(0.35);
        expect(flight.x).toBe(400);
        expect(flight.arrived).toBe(true);
    });

    it('points along its direction', () => {
        expect(new RocketFlight({ x: 0, y: 0 }, { x: 0, y: -100 }, 1).angle).toBeCloseTo(-90);
        expect(new RocketFlight({ x: 0, y: 0 }, { x: -100, y: 0 }, 1).angle).toBeCloseTo(180);
    });

    it('spaces trail points by distance, whatever the frame rate', () => {
        const count = (frame: number) => {
            const flight = new RocketFlight({ x: 0, y: 0 }, { x: 260, y: 0 }, 0.5);
            let points = 0;
            while (!flight.arrived) {
                flight.advance(frame);
                while (flight.nextTrailPoint(26)) {
                    points++;
                }
            }
            return points;
        };
        expect(count(1 / 60)).toBe(11);
        expect(count(1 / 20)).toBe(11);
        expect(count(1)).toBe(11);
    });

    it('lands at once with no duration', () => {
        const flight = new RocketFlight({ x: 0, y: 0 }, { x: 100, y: 0 }, 0);
        flight.advance(0);
        expect(flight.arrived).toBe(true);
        expect(flight.x).toBe(100);
    });
});
