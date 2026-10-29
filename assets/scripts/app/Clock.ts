/** Engine-free timer, so the controller can wait without cc and tests can move time by hand. */
export interface Clock {
    /** Calls fn once after the given seconds. The returned function cancels the call. */
    schedule(seconds: number, fn: () => void): () => void;
}
