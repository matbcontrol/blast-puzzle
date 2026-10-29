export const SuperKinds = {
    Row: 'row',
    Column: 'column',
    Bomb: 'bomb',
    Field: 'field',
} as const;

export type SuperKind = (typeof SuperKinds)[keyof typeof SuperKinds];

export const ALL_SUPER_KINDS: ReadonlyArray<SuperKind> = Object.keys(SuperKinds).map(
    (name) => SuperKinds[name as keyof typeof SuperKinds],
);
