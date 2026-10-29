/** What the level and the model need next to what the scene provides, as plain values so the check runs in Node. */
export interface SceneSetup {
    readonly colorCount: number;
    readonly colorSprites: number;
    readonly superKinds: ReadonlyArray<string>;
    readonly superSprites: ReadonlyArray<string>;
    readonly boosters: ReadonlyArray<string>;
    readonly boosterButtons: ReadonlyArray<string>;
}

/** Lists every mismatch at once, so the scene is fixed in one pass. */
export function findSceneProblems(setup: SceneSetup): string[] {
    const problems: string[] = [];
    if (setup.colorCount > setup.colorSprites) {
        problems.push(`level deals ${setup.colorCount} colors, TileSkins has ${setup.colorSprites} color sprites`);
    }
    unique(setup.superKinds)
        .filter((kind) => setup.superSprites.indexOf(kind) < 0)
        .forEach((kind) => problems.push(`super tile "${kind}" has no sprite in TileSkins`));
    setup.boosters.forEach((id) => {
        const buttons = setup.boosterButtons.filter((button) => button === id).length;
        if (buttons !== 1) {
            problems.push(`booster "${id}" has ${buttons} buttons in BoosterPanel, expected 1`);
        }
    });
    unique(setup.boosterButtons)
        .filter((id) => setup.boosters.indexOf(id) < 0)
        .forEach((id) => problems.push(`BoosterPanel has a button for unknown booster "${id}"`));
    return problems;
}

export function assertSceneSetup(setup: SceneSetup): void {
    const problems = findSceneProblems(setup);
    if (problems.length > 0) {
        throw new Error('Scene does not match the level:\n' + problems.join('\n'));
    }
}

function unique(ids: ReadonlyArray<string>): string[] {
    return ids.filter((id, index) => ids.indexOf(id) === index);
}
