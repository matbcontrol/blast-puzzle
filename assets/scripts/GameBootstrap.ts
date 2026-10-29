import { GameController } from './app/GameController';
import { assertSceneSetup } from './app/SceneSetup';
import { SeedSequence } from './app/SeedSequence';
import { LevelConfig } from './core/config/LevelConfig';
import { parseLevelConfig } from './core/config/parseLevelConfig';
import { createBlastGame } from './core/game/BlastGameFactory';
import { SeededRandom } from './core/random/SeededRandom';
import { MuteButton } from './view/audio/MuteButton';
import { SoundBank } from './view/audio/SoundBank';
import { SoundPlayer } from './view/audio/SoundPlayer';
import { BoardView } from './view/BoardView';
import { BoosterPanel } from './view/BoosterPanel';
import { BoardEffects } from './view/fx/BoardEffects';
import { EffectsLayer } from './view/fx/EffectsLayer';
import { HudView } from './view/HudView';
import { LevelBanner } from './view/LevelBanner';
import { ResultPopup } from './view/ResultPopup';
import { SchedulerClock } from './view/SchedulerClock';

const { ccclass, property } = cc._decorator;

/**
 * Composition root of the scene: reads the level, wires the model, the controller and the views.
 * The only component that knows all three layers.
 */
@ccclass
export class GameBootstrap extends cc.Component {
    @property(cc.JsonAsset)
    level: cc.JsonAsset = null!;

    @property(BoardView)
    board: BoardView = null!;

    @property(HudView)
    hud: HudView = null!;

    @property(BoosterPanel)
    boosters: BoosterPanel = null!;

    @property(ResultPopup)
    result: ResultPopup = null!;

    @property(LevelBanner)
    banner: LevelBanner = null!;

    @property(EffectsLayer)
    effects: EffectsLayer = null!;

    @property(SoundBank)
    sound: SoundBank = null!;

    @property(MuteButton)
    mute: MuteButton = null!;

    private controller: GameController | null = null;

    start(): void {
        const config = parseLevelConfig(this.level.json);
        this.checkScene(config);
        this.wireServices();

        const seeds = new SeedSequence(seedFromUrl(), config.seed);
        this.controller = new GameController(
            () => {
                const seed = seeds.next();
                cc.log(`Blast: seed ${seed}, replay with ?seed=${seed}`);
                return createBlastGame(config, new SeededRandom(seed));
            },
            { board: this.board, hud: this.hud, boosters: this.boosters, result: this.result, banner: this.banner },
            new SchedulerClock(this),
        );
        this.controller.start();
    }

    onDestroy(): void {
        if (this.controller !== null) {
            this.controller.dispose();
        }
    }

    /**
     * Plain services reach the views here and nowhere else, each through one setter typed by its interface,
     * so no view knows the component behind. Until then every view runs on a null object.
     */
    private wireServices(): void {
        const sound: SoundPlayer = this.sound;
        const effects: BoardEffects = this.effects;
        this.board.setSound(sound);
        this.board.setEffects(effects);
        this.boosters.setSound(sound);
        this.result.setSound(sound);
        this.result.setEffects(effects);
        this.mute.setSound(this.sound);
        this.effects.setScoreTarget(this.hud);
    }

    private checkScene(config: LevelConfig): void {
        const skins = this.board.skins;
        assertSceneSetup({
            colorCount: config.colorCount,
            colorSprites: skins.colors.length,
            superKinds: config.superTiles.reduce<string[]>((kinds, rule) => kinds.concat(rule.kinds), []),
            superSprites: skins.supers.map((skin) => skin.kind),
            // Booster ids are defined by the model factory, so a throwaway game is where to read them.
            boosters: createBlastGame(config, new SeededRandom(1)).boosterIds(),
            boosterButtons: this.boosters.buttons.map((button) => button.boosterId),
        });
    }
}

function seedFromUrl(): number | null {
    if (typeof window === 'undefined' || !window.location) {
        return null;
    }
    const match = /[?&]seed=(\d+)/.exec(window.location.search);
    return match === null ? null : Number(match[1]);
}
