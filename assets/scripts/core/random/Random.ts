export interface Random {
    /** Float in [0, 1). */
    next(): number;
}

export function randomInt(random: Random, maxExclusive: number): number {
    return Math.floor(random.next() * maxExclusive);
}

export function randomItem<T>(random: Random, items: ReadonlyArray<T>): T {
    return items[randomInt(random, items.length)];
}

export function shuffleInPlace<T>(random: Random, items: T[]): void {
    for (let i = items.length - 1; i > 0; i--) {
        const j = randomInt(random, i + 1);
        const tmp = items[i];
        items[i] = items[j];
        items[j] = tmp;
    }
}
