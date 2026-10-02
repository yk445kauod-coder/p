// Jest setup: silence noisy native modules the pure-logic suites never touch.
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

// Supabase is only reached through mocked modules in tests; a stub keeps the
// client from trying to open a websocket during import.
jest.mock("./src/lib/supabase", () => ({
  supabase: null,
  supabaseConfigured: false,
  startAutoRefresh: () => () => {},
}));
