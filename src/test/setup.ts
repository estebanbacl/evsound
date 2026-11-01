import '@testing-library/jest-dom/vitest'

// jsdom has no canvas; components must tolerate a null 2D context.
HTMLCanvasElement.prototype.getContext = (() => null) as never
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
}

// the app opens with the instructions popup; tests start past it
sessionStorage.setItem('ev-skip-intro', '1')
