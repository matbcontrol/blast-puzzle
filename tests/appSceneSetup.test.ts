import { assertSceneSetup, findSceneProblems, SceneSetup } from '../assets/scripts/app/SceneSetup';

function sceneSetup(overrides: Partial<SceneSetup> = {}): SceneSetup {
    return {
        colorCount: 5,
        colorSprites: 5,
        superKinds: ['row', 'column', 'row'],
        superSprites: ['row', 'column', 'bomb'],
        boosters: ['bomb', 'teleport'],
        boosterButtons: ['teleport', 'bomb'],
        ...overrides,
    };
}

describe('findSceneProblems', () => {
    it('accepts a scene that covers the level', () => {
        expect(findSceneProblems(sceneSetup())).toEqual([]);
    });

    it('needs a sprite for every color the level deals', () => {
        expect(findSceneProblems(sceneSetup({ colorSprites: 4 }))).toEqual([
            'level deals 5 colors, TileSkins has 4 color sprites',
        ]);
    });

    it('names each super tile without a sprite once', () => {
        expect(findSceneProblems(sceneSetup({ superKinds: ['field', 'row', 'field'] }))).toEqual([
            'super tile "field" has no sprite in TileSkins',
        ]);
    });

    it('needs exactly one button per booster', () => {
        expect(findSceneProblems(sceneSetup({ boosterButtons: ['bomb', 'bomb'] }))).toEqual([
            'booster "bomb" has 2 buttons in BoosterPanel, expected 1',
            'booster "teleport" has 0 buttons in BoosterPanel, expected 1',
        ]);
    });

    it('rejects buttons for boosters the model does not have', () => {
        expect(findSceneProblems(sceneSetup({ boosterButtons: ['bomb', 'teleport', 'rocket', ''] }))).toEqual([
            'BoosterPanel has a button for unknown booster "rocket"',
            'BoosterPanel has a button for unknown booster ""',
        ]);
    });
});

describe('assertSceneSetup', () => {
    it('throws one error that lists every problem', () => {
        const broken = sceneSetup({ colorSprites: 0, superSprites: [], boosterButtons: [] });

        expect(() => assertSceneSetup(broken)).toThrow(
            [
                'Scene does not match the level:',
                'level deals 5 colors, TileSkins has 0 color sprites',
                'super tile "row" has no sprite in TileSkins',
                'super tile "column" has no sprite in TileSkins',
                'booster "bomb" has 0 buttons in BoosterPanel, expected 1',
                'booster "teleport" has 0 buttons in BoosterPanel, expected 1',
            ].join('\n'),
        );
    });

    it('stays quiet when the scene is fine', () => {
        expect(() => assertSceneSetup(sceneSetup())).not.toThrow();
    });
});
