/** @type {import('tailwindcss').Config} */
module.exports = {
  // NOTE: Update this to include the paths to all files that contain Nativewind classes.
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        main: "#0F172A",
        blackoutlines: "#939393",
        blue: "6998FF",
        light: "#F2F2F7",
        borderseparators: "#F4A9AA",
        dark: "#111827",
        placeholder: "#5E6367",
      },
      fontFamily: {
        dzongkha: ["Dzongkha", "sans-serif"],
      },
    },
  },
  plugins: [],
};
