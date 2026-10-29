import { Random } from '../../core/random/Random';
import { TileColor } from '../../core/tiles/Tile';
import { Point } from '../BoardLayout';
import { BoardEffects } from './BoardEffects';
import { BoardFlash } from './BoardFlash';
import { PraiseBanner, ScorePopups } from './FloatingText';
import { toHex } from './FxColors';
import { FxEmitters } from './FxEmitters';
import { FxSprite, FxSpritePool } from './FxSpritePool';
import { FxTuning } from './FxTuning';
import { ParticleSystem } from './ParticleSystem';
import { RocketHeadLook, RocketLauncher } from './RocketLauncher';

const { ccclass, property } = cc._decorator;

const WHITE = 0xffffff;

/**
 * Lives on a child of the board placed after the masked tiles, so effects draw over the tiles and the frame
 * without being clipped, in the same coordinates as BoardLayout. Assembles the effect parts and drives them.
 */
@ccclass
export class EffectsLayer extends cc.Component implements BoardEffects {
    @property(cc.SpriteFrame)
    glowFrame: cc.SpriteFrame = null!;

    @property(cc.SpriteFrame)
    sparkleFrame: cc.SpriteFrame = null!;

    @property(cc.SpriteFrame)
    shardFrame: cc.SpriteFrame = null!;

    @property(cc.SpriteFrame)
    ringFrame: cc.SpriteFrame = null!;

    @property(cc.SpriteFrame)
    confettiFrame: cc.SpriteFrame = null!;

    @property(cc.SpriteFrame)
    streakFrame: cc.SpriteFrame = null!;

    @property({ type: cc.SpriteFrame, tooltip: 'Nine-sliced white panel the flash stretches over the board' })
    flashFrame: cc.SpriteFrame = null!;

    @property({ type: cc.SpriteFrame, tooltip: 'Rocket head. Without it the head is a glow' })
    rocketFrame: cc.SpriteFrame | null = null;

    @property(cc.Font)
    font: cc.Font | null = null;

    @property({ type: [cc.Color], tooltip: 'Shard tint per tile color index: blue, green, purple, red, yellow' })
    tileColors: cc.Color[] = [];

    private readonly random: Random = { next: () => Math.random() };
    private particles: ParticleSystem<FxSprite> = null!;
    private emitters: FxEmitters = null!;
    private rockets: RocketLauncher = null!;
    private popups: ScorePopups = null!;
    private banner: PraiseBanner = null!;
    private boardFlash: BoardFlash = null!;

    onLoad(): void {
        this.warnAboutMissingArt();
        // Layers draw in this order. Each holds one blend mode, so it batches into a single draw call.
        const flash = this.addLayer('Flash');
        const debris = this.addLayer('Debris');
        const light = this.addLayer('Light');
        const heads = this.addLayer('Rockets');
        const confetti = this.addLayer('Confetti');
        const popups = this.addLayer('Popups');
        const praise = this.addLayer('Praise');

        const sprites = new FxSpritePool({
            shard: { frame: this.shardFrame, layer: debris, additive: false },
            glow: { frame: this.glowFrame, layer: light, additive: true },
            sparkle: { frame: this.sparkleFrame, layer: light, additive: true },
            ring: { frame: this.ringFrame, layer: light, additive: true },
            streak: { frame: this.streakFrame, layer: light, additive: true },
            confetti: { frame: this.confettiFrame, layer: confetti, additive: false },
        });
        sprites.prewarm(FxTuning.prewarm);
        this.particles = new ParticleSystem(sprites, FxTuning.maxParticles);
        this.emitters = new FxEmitters(this.particles, this.random, this.tileTints());
        this.rockets = new RocketLauncher(heads, this.rocketHead(), this.emitters);
        this.popups = new ScorePopups(popups, this.font);
        this.banner = new PraiseBanner(praise, this.font);
        this.boardFlash = new BoardFlash(flash, this.flashFrame);
    }

    update(dt: number): void {
        this.particles.step(dt);
        this.rockets.step(dt);
    }

    /** Also runs before onDestroy. A rocket still in flight has to land, or the turn awaiting it never ends. */
    onDisable(): void {
        this.rockets.landAll();
        this.particles.clear();
        this.popups.clear();
        this.banner.hide();
        this.boardFlash.stop();
    }

    burst(at: Point, color: TileColor | null, strength: number): void {
        this.emitters.burst(at.x, at.y, color, strength);
    }

    scorePopup(at: Point, points: number): void {
        this.popups.show(at.x, at.y, points);
    }

    praise(text: string): void {
        const width = this.boardSize.width * FxTuning.praise.widthShare;
        this.emitters.praise(0, 0, width);
        this.banner.show(text, 0, 0, width);
    }

    shockwave(at: Point, radius: number): void {
        this.emitters.shockwave(at.x, at.y, radius);
    }

    flash(): void {
        const size = this.boardSize;
        this.boardFlash.play(size.width, size.height);
    }

    rocket(from: Point, to: Point, duration: number): Promise<void> {
        // Without update() the flight would never land.
        if (!this.enabledInHierarchy) {
            return Promise.resolve();
        }
        return this.rockets.launch(from, to, duration);
    }

    confetti(): void {
        const size = this.boardSize;
        this.emitters.confetti(size.width, size.height);
    }

    /** BoardView sizes the board node to the grid on every render, so effects follow a board of any size. */
    private get boardSize(): cc.Size {
        return this.node.parent.getContentSize();
    }

    private addLayer(name: string): cc.Node {
        const layer = new cc.Node(name);
        layer.parent = this.node;
        return layer;
    }

    private tileTints(): number[] {
        return this.tileColors.length > 0 ? this.tileColors.map(toHex) : FxTuning.palette.tiles;
    }

    private rocketHead(): RocketHeadLook {
        const tune = FxTuning.rocket;
        return this.rocketFrame !== null
            ? { frame: this.rocketFrame, scale: tune.headScale, tint: WHITE, upright: tune.uprightArt }
            : { frame: this.glowFrame, scale: tune.fallbackHeadScale, tint: FxTuning.palette.gold, upright: false };
    }

    /** Effects are decoration: missing art leaves them invisible, it does not stop the game. */
    private warnAboutMissingArt(): void {
        const frames: Array<[string, cc.SpriteFrame | null]> = [
            ['glowFrame', this.glowFrame],
            ['sparkleFrame', this.sparkleFrame],
            ['shardFrame', this.shardFrame],
            ['ringFrame', this.ringFrame],
            ['confettiFrame', this.confettiFrame],
            ['streakFrame', this.streakFrame],
            ['flashFrame', this.flashFrame],
        ];
        const missing = frames.filter((entry) => entry[1] === null).map((entry) => entry[0]);
        if (missing.length > 0) {
            cc.warn(`EffectsLayer: no sprite frame in ${missing.join(', ')}`);
        }
    }
}
