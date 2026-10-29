/** The model has no engine dependencies, so it is tested in plain Node. */
module.exports = {
    testEnvironment: 'node',
    roots: ['<rootDir>/tests'],
    transform: {
        '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.test.json' }],
    },
    collectCoverageFrom: ['assets/scripts/core/**/*.ts'],
};
