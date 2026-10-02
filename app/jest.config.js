/**
 * Jest config for the Expo app.
 *
 * `jest-expo` provides the React Native / Expo module mocks, and the
 * `node` project runs the pure-logic suites (domain maths, i18n parity, the
 * agent stream parser) without pulling in a renderer.
 */
module.exports = {
  preset: "jest-expo",
  testMatch: ["**/*.test.ts", "**/*.test.tsx"],
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  transformIgnorePatterns: [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg|@nivo/.*|d3-.*))",
  ],
  collectCoverageFrom: ["src/**/*.{ts,tsx}", "!src/**/*.d.ts"],
};
