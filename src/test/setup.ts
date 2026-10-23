import '@testing-library/jest-dom/vitest'

// jsdom has no canvas; components must tolerate a null 2D context.
HTMLCanvasElement.prototype.getContext = (() => null) as never
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
}
