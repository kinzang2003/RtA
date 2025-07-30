// utils/color.ts

const COLOR_PALETTE = [
  "#001219", // rich-black
  "#005f73", // midnight-green
  "#0a9396", // dark-cyan
  "#94d2bd", // tiffany-blue
  "#e9d8a6", // vanilla
  "#ee9b00", // gamboge
  "#ca6702", // alloy-orange
  "#bb3e03", // rust
  "#ae2012", // rufous
  "#9b2226", // auburn
];

/**
 * Generates a stable color from a predefined palette based on a given ID.
 * The same ID will always result in the same color.
 * @param {string} id - A unique identifier for the item.
 * @returns {string} A hexadecimal color string from the palette.
 */
export function getStableColorForId(id: string): string {
  // Simple hashing to get a consistent index.
  // We sum character codes and then use modulo to map to palette size.
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % COLOR_PALETTE.length;
  return COLOR_PALETTE[index];
}
