module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
    ],
    // NOTE: Do NOT add "expo-router/babel" here — it was removed in Expo SDK 50+
    // and is now built into babel-preset-expo automatically.
  };
};