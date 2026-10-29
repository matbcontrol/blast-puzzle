type Listener<T> = (payload: T) => void;

/** Typed event, the TypeScript twin of a C# event. A misspelled event name is a compile error here. */
export class Signal<T = void> {
    private listeners: Array<Listener<T>> = [];

    /** Returns an unsubscribe function. */
    add(listener: Listener<T>): () => void {
        this.listeners.push(listener);
        return () => this.remove(listener);
    }

    remove(listener: Listener<T>): void {
        this.listeners = this.listeners.filter((l) => l !== listener);
    }

    dispatch(payload: T): void {
        this.listeners.slice().forEach((listener) => listener(payload));
    }

    clear(): void {
        this.listeners = [];
    }
}
