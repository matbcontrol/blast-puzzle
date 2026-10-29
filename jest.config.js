/**
 * The code that runs in plain Node: model, controller and the engine-free parts of the view.
 * Coverage measures exactly these files, and ESLint keeps cc out of them.
 */
const ENGINE_FREE = [
    'assets/scripts/core/**/*.ts',
    'assets/scripts/app/**/*.ts',
    'assets/scripts/view/{BoardLayout,FieldFit,GoalScale,ScoreCounter,Texts}.ts',
    'assets/scripts/view/board/BoardPointer.ts',
    'assets/scripts/view/animation/{BurnAnimator,ColumnGates,Feel,Impact,Praise,Timings,TurnPlayer}.ts',
    'assets/scripts/view/audio/{AudioUnlock,MutePreference,ResumeQueue,SoundCatalog,SoundPlayer,SoundSwitch,SoundThrottle}.ts',
    'assets/scripts/view/fx/{BoardEffects,ConfettiBurst,FloatingTextLayout,FxArt,FxEmitters,FxFeel,FxMath,NoEffects,ParticleSystem,RocketFlight,ScoreTarget}.ts',
];

module.exports = {
    testEnvironment: 'node',
    roots: ['<rootDir>/tests'],
    transform: {
        '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.test.json' }],
    },
    collectCoverageFrom: ENGINE_FREE,
};
