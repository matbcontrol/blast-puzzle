import { FinaleActionFactory } from '../actions/FinaleActionFactory';
import { TapActionFactory } from '../actions/TapActionFactory';
import { Board } from '../board/Board';
import { BoardFiller } from '../board/BoardFiller';
import { Shuffler } from '../board/Shuffler';
import { BombBooster } from '../boosters/BombBooster';
import { BoosterInventory } from '../boosters/BoosterInventory';
import { TeleportBooster } from '../boosters/TeleportBooster';
import { BurnResolver } from '../burn/BurnResolver';
import { ColumnArea } from '../burn/ColumnArea';
import { RadiusArea } from '../burn/RadiusArea';
import { RowArea } from '../burn/RowArea';
import { SuperTileCatalog } from '../burn/SuperTileCatalog';
import { WholeBoardArea } from '../burn/WholeBoardArea';
import { LevelConfig } from '../config/LevelConfig';
import { Random } from '../random/Random';
import { AutoShuffle } from '../rules/AutoShuffle';
import { GroupRules } from '../rules/GroupRules';
import { BigGroupHint } from '../rules/HintPolicy';
import { LevelProgress } from '../rules/LevelProgress';
import { BlastScore } from '../rules/ScoreFormula';
import { SuperTileRewards } from '../rules/SuperTileRewards';
import { SuperKinds } from '../tiles/SuperKinds';
import { SuperTilePicker } from '../tiles/SuperTilePicker';
import { TileFactory } from '../tiles/TileFactory';
import { BlastGame } from './BlastGame';

/**
 * Composition root of the model: the only place that knows concrete classes.
 * `layout` is a hand-made starting board; empty cells in it are filled randomly.
 */
export function createBlastGame(config: LevelConfig, random: Random, layout?: Board): BlastGame {
    const catalog = new SuperTileCatalog({
        [SuperKinds.Row]: new RowArea(),
        [SuperKinds.Column]: new ColumnArea(),
        [SuperKinds.Bomb]: new RadiusArea(config.superBombRadius),
        [SuperKinds.Field]: new WholeBoardArea(),
    });

    const tiles = new TileFactory(random, config.colorCount);
    const rules = new GroupRules(config.minGroupSize);
    const burner = new BurnResolver(catalog);
    const filler = new BoardFiller(tiles);
    const shuffler = new Shuffler(random, rules);
    const superTiles = new SuperTilePicker(config.superTiles, random);

    const tapActions = new TapActionFactory(rules, burner, superTiles, tiles);
    const finale = new FinaleActionFactory(random, [SuperKinds.Row, SuperKinds.Column], tiles, burner);
    const boosters = new BoosterInventory()
        .add(new BombBooster(new RadiusArea(config.bombRadius), burner, SuperKinds.Bomb), config.bombCharges)
        .add(new TeleportBooster(), config.teleportCharges);

    const board = layout || new Board(config.cols, config.rows);
    filler.fillEmpty(board);
    if (!rules.hasMove(board)) {
        shuffler.shuffle(board);
    }

    return new BlastGame({
        board,
        progress: new LevelProgress(
            config.targetScore,
            config.starScores,
            config.moves,
            new BlastScore(config.pointsPerTile),
        ),
        rules,
        tapActions,
        finale,
        boosters,
        filler,
        autoShuffle: new AutoShuffle(shuffler, config.maxShuffles),
        hints: new BigGroupHint(rules, superTiles),
        rewards: new SuperTileRewards(rules, superTiles),
    });
}
