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

/**
 * Generates a linear gradient [bright, dark] from a palette color for a given ID.
 * @param {string} id - A unique identifier for the item.
 * @returns {[string, string]} A tuple of [brightColor, darkColor] for LinearGradient
 */
export function getGradientColorsForId(id: string): [string, string] {
  const baseColor = getStableColorForId(id);
  
  // Lighten the color by mixing with white
  const brightColor = lightenColor(baseColor, 0.6);
  
  // Darken the color
  const darkColor = darkenColor(baseColor, 0.3);
  
  return [brightColor, darkColor];
}

/**
 * Lighten a hex color by mixing it with white
 * @param {string} hex - Hex color code
 * @param {number} factor - Amount to lighten (0-1, where 1 is white)
 * @returns {string} Lightened hex color
 */
function lightenColor(hex: string, factor: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  
  const lightened = {
    r: Math.round(rgb.r + (255 - rgb.r) * factor),
    g: Math.round(rgb.g + (255 - rgb.g) * factor),
    b: Math.round(rgb.b + (255 - rgb.b) * factor),
  };
  
  return rgbToHex(lightened.r, lightened.g, lightened.b);
}

/**
 * Darken a hex color
 * @param {string} hex - Hex color code
 * @param {number} factor - Amount to darken (0-1)
 * @returns {string} Darkened hex color
 */
function darkenColor(hex: string, factor: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  
  const darkened = {
    r: Math.round(rgb.r * (1 - factor)),
    g: Math.round(rgb.g * (1 - factor)),
    b: Math.round(rgb.b * (1 - factor)),
  };
  
  return rgbToHex(darkened.r, darkened.g, darkened.b);
}

/**
 * Convert hex color to RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

/**
 * Convert RGB to hex color
 */
function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("")}`;
}
