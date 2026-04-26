/** @type {import('tailwindcss').Config} */
module.exports = {
  // Include all screen files — add more directories if you have components elsewhere
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  // NativeWind v4 requires this preset — do NOT use darkMode: 'class' manually
  presets: [require("nativewind/preset")],
  theme: {
    extend: {},
  },
  plugins: [],
};
