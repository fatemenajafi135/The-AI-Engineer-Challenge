import "@testing-library/jest-dom";

// jsdom does not implement clipboard — provide a no-op mock so widget tests
// that call navigator.clipboard.writeText() don't crash.
Object.defineProperty(global.navigator, "clipboard", {
  value: { writeText: jest.fn().mockResolvedValue(undefined) },
  configurable: true,
  writable: true,
});
