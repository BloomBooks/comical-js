// Simple seedable RNG, adapted from https://gist.github.com/lsenta/15d7f6fcfc2987176b54
// We don't need terribly good randomness, but we do need to be able to provide a seed,
// so that the bubble will not change shape every time we generate it.
export class SimpleRandom {
    private seed: number;

    constructor(seed: number) {
        this.seed = seed;
    }

    private next(min: number, max: number): number {
        max = max || 0;
        min = min || 0;

        this.seed = (this.seed * 9301 + 49297) % 233280;
        var rnd = this.seed / 233280;

        return min + rnd * (max - min);
    }

    public nextDouble(): number {
        return this.next(0, 1);
    }
}
