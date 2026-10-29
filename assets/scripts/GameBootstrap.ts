import { GameController } from './app/GameController';
import { parseLevelConfig } from './core/config/parseLevelConfig';
import { createBlastGame } from './core/game/BlastGameFactory';
import { SeededRandom } from './core/random/SeededRandom';
import { BoardView } from './view/BoardView';
import { BoosterPanel } from './view/BoosterPanel';
import { HudView } from './view/HudView';
import { ResultPopup } from './view/ResultPopup';

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

    private controller: GameController | null = null;

    start(): void {
        const config = parseLevelConfig(this.level.json);
        if (config.colors > this.board.skins.colors.length) {
            throw new Error(
                `Level asks for ${config.colors} colors, only ${this.board.skins.colors.length} sprites set`,
            );
        }

        let seed = seedFromUrl() || config.seed || randomSeed();
        this.controller = new GameController(
            () => {
                cc.log(`Blast: seed ${seed}, replay with ?seed=${seed}`);
                const game = createBlastGame(config, new SeededRandom(seed));
                seed = randomSeed();
                return game;
            },
            { board: this.board, hud: this.hud, boosters: this.boosters, result: this.result },
        );
        this.controller.start();
    }

    onDestroy(): void {
        if (this.controller !== null) {
            this.controller.dispose();
        }
    }
}

function seedFromUrl(): number | null {
    if (typeof window === 'undefined' || !window.location) {
        return null;
    }
    const match = /[?&]seed=(\d+)/.exec(window.location.search);
    return match === null ? null : Number(match[1]);
}

function randomSeed(): number {
    return Math.floor(Math.random() * 0x7fffffff) + 1;
}
