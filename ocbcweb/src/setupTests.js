import '@testing-library/jest-dom';

// React 18 act environment flag to reduce noisy warnings in tests.
// eslint-disable-next-line no-undef
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// JSDOM does not implement these browser APIs by default.
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = function scrollIntoView() {};
}

if (!window.ResizeObserver) {
  window.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

if (!window.requestAnimationFrame) {
  window.requestAnimationFrame = (callback) => setTimeout(callback, 0);
}

if (!window.cancelAnimationFrame) {
  window.cancelAnimationFrame = (id) => clearTimeout(id);
}
