import "@testing-library/jest-dom/vitest";

// jsdom does not implement ResizeObserver, which recharts' ResponsiveContainer
// subscribes to on mount.
if (!globalThis.ResizeObserver) {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

// This jsdom/Node combination does not attach a localStorage implementation
// to window, which crashes any component or hook that reads/writes it
// (OnboardingChecklist, useCurrency, etc.) with "Cannot read properties of
// undefined". A minimal in-memory Storage polyfill is enough for tests,
// which never need persistence across process runs.
if (typeof window !== "undefined" && !window.localStorage) {
  class MemoryStorage implements Storage {
    private store = new Map<string, string>();

    get length() {
      return this.store.size;
    }

    clear() {
      this.store.clear();
    }

    getItem(key: string) {
      return this.store.has(key) ? this.store.get(key)! : null;
    }

    key(index: number) {
      return Array.from(this.store.keys())[index] ?? null;
    }

    removeItem(key: string) {
      this.store.delete(key);
    }

    setItem(key: string, value: string) {
      this.store.set(key, String(value));
    }
  }

  Object.defineProperty(window, "localStorage", {
    value: new MemoryStorage(),
    configurable: true,
  });
  Object.defineProperty(globalThis, "localStorage", {
    value: window.localStorage,
    configurable: true,
  });
}
