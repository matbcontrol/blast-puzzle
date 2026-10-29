import { ConfettiBurst, ConfettiFeel } from './ConfettiBurst';
import { FxSprite, FxSpritePool } from './FxSpritePool';
import { effectRandom } from './FxMath';
import { ParticleSystem } from './ParticleSystem';

const { ccclass, property } = cc._decorator;

/**
 * The win celebration over the whole screen. Lives on its own node at the center of the Canvas, after the result
 * popup, so the pieces fall over the popup too. One layer of plain sprites: one draw call.
 */
@ccclass
export class ScreenConfetti extends cc.Component {
    @property(cc.SpriteFrame)
    confettiFrame: cc.SpriteFrame | null = null;

    private particles: ParticleSystem<FxSprite> = null!;
    private confetti: ConfettiBurst = null!;

    onLoad(): void {
        if (this.confettiFrame === null) {
            cc.warn('ScreenConfetti: no confettiFrame, the win confetti stays invisible');
        }
        const sprites = new FxSpritePool(
            { confetti: { frame: this.confettiFrame, layer: this.node, additive: false } },
            { confetti: ConfettiFeel.count },
        );
        this.particles = new ParticleSystem(sprites, ConfettiFeel.count);
        this.confetti = new ConfettiBurst(this.particles, effectRandom);
    }

    update(dt: number): void {
        this.particles.step(dt);
    }

    onDisable(): void {
        this.particles.clear();
    }

    /** Fires over the visible area, whatever shape the screen has. */
    burst(): void {
        const visible = cc.view.getVisibleSize();
        this.confetti.fire(visible.width, visible.height);
    }
}
