import { FxKind } from '../assets/scripts/view/fx/FxArt';
import {
    blankSpec,
    NO_FADE,
    ParticleSpec,
    ParticleSprite,
    ParticleSprites,
    ParticleSystem,
    resetSpec,
} from '../assets/scripts/view/fx/ParticleSystem';

class FakeSprite implements ParticleSprite {
    x = 0;
    y = 0;
    angle = 0;
    scaleX = 0;
    scaleY = 0;
    opacity = 0;
    placed = 0;

    constructor(readonly kind: FxKind) {}

    place(x: number, y: number, angle: number, scaleX: number, scaleY: number, opacity: number): void {
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.scaleX = scaleX;
        this.scaleY = scaleY;
        this.opacity = opacity;
        this.placed++;
    }
}

class FakeSprites implements ParticleSprites<FakeSprite> {
    readonly made: FakeSprite[] = [];
    readonly idle: FakeSprite[] = [];
    acquired = 0;

    acquire(kind: FxKind): FakeSprite {
        this.acquired++;
        const sprite = this.idle.pop() || new FakeSprite(kind);
        if (this.made.indexOf(sprite) < 0) {
            this.made.push(sprite);
        }
        return sprite;
    }

    release(sprite: FakeSprite): void {
        this.idle.push(sprite);
    }
}

function spec(overrides: Partial<ParticleSpec> = {}): ParticleSpec {
    return Object.assign(resetSpec(blankSpec(), 'shard', 0xffffff, 0, 0), overrides);
}

describe('ParticleSystem', () => {
    let sprites: FakeSprites;
    let system: ParticleSystem<FakeSprite>;

    beforeEach(() => {
        sprites = new FakeSprites();
        system = new ParticleSystem(sprites, 3);
    });

    it('drops particles past its capacity without taking sprites for them', () => {
        expect([1, 2, 3, 4, 5].map(() => system.emit(spec()))).toEqual([true, true, true, false, false]);
        expect(system.count).toBe(3);
        expect(system.load).toBe(1);
        expect(sprites.acquired).toBe(3);
    });

    it('returns a sprite when its particle dies and reuses the slot', () => {
        system.emit(spec({ life: 0.1 }));
        system.emit(spec({ life: 1 }));
        system.step(0.2);
        expect(system.count).toBe(1);
        expect(sprites.idle).toHaveLength(1);

        system.emit(spec());
        system.emit(spec());
        expect(system.count).toBe(3);
        expect(sprites.made).toHaveLength(3);
    });

    it('keeps the survivors when a particle in the middle dies', () => {
        system.emit(spec({ life: 1, x: 1 }));
        system.emit(spec({ life: 0.1, x: 2 }));
        system.emit(spec({ life: 1, x: 3 }));
        system.step(0.2);
        expect(system.count).toBe(2);
        const alive = sprites.made.filter((s) => sprites.idle.indexOf(s) < 0).map((s) => s.x);
        expect(alive.sort()).toEqual([1, 3]);
    });

    it('copies the spec, so an emitter can reuse one object', () => {
        const shared = spec({ vx: 100 });
        system.emit(shared);
        shared.vx = -100;
        system.step(0.1);
        expect(sprites.made[0].x).toBeCloseTo(10);
    });

    it('pulls particles down by gravity and slows them by drag', () => {
        system.emit(spec({ gravity: 1000 }));
        system.emit(spec({ vx: 100, drag: 5 }));
        system.step(0.1);
        system.step(0.1);
        expect(sprites.made[0].y).toBeLessThan(-20);
        expect(sprites.made[1].x).toBeGreaterThan(0);
        expect(sprites.made[1].x).toBeLessThan(20);
    });

    it('keeps a delayed particle hidden until its delay has passed', () => {
        system.emit(spec({ delay: 0.3, vx: 100 }));
        system.step(0.2);
        expect(sprites.made[0].placed).toBe(0);
        system.step(0.2);
        expect(sprites.made[0].placed).toBe(1);
        // Moved only for the 0.1 s it has been alive, not for the whole frame.
        expect(sprites.made[0].x).toBeCloseTo(10);
    });

    it('scales from start to end and fades after fadeFrom', () => {
        system.emit(spec({ life: 1, scaleFrom: 1, scaleTo: 0, fadeFrom: 0.5, opacity: 200 }));
        system.step(0.25);
        expect(sprites.made[0].scaleY).toBeCloseTo(0.75);
        expect(sprites.made[0].opacity).toBe(200);
        system.step(0.5);
        // Half way through the fading half of its life.
        expect(sprites.made[0].opacity).toBeCloseTo(100);
    });

    it('stays opaque to the end with NO_FADE', () => {
        system.emit(spec({ life: 1, fadeFrom: NO_FADE }));
        system.step(0.95);
        expect(sprites.made[0].opacity).toBe(255);
    });

    it('flips confetti around its vertical axis without touching its height', () => {
        system.emit(spec({ life: 2, flip: 1, scaleFrom: 1, scaleTo: 1 }));
        system.step(0.5);
        expect(sprites.made[0].scaleX).toBeCloseTo(-1);
        expect(sprites.made[0].scaleY).toBeCloseTo(1);
    });

    it('releases every sprite on clear', () => {
        system.emit(spec());
        system.emit(spec());
        system.clear();
        expect(system.count).toBe(0);
        expect(sprites.idle).toHaveLength(2);
    });
});
