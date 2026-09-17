// Color palette and small UI helpers shared by both the main widget
// (src/colorPicker.js) and the 3-color variant (three-color/src/*).

export const DEFAULT_PALETTE = [
  "#070707", // Black
  "#F3F3F1", // White
  "#6C7477", // Grey
  "#626B76", // Dark Grey
  "#AC0200", // Red
  "#B7571F", // Burnt Orange
  "#DC6E38", // Orange
  "#5A3323", // Brown
  "#B68C61", // Army Beige
  "#A8A38D", // Flat Dark Earth
  "#F0C940", // Yellow
  "#697240", // Army Green
  "#05AF47", // Green
  "#5FCCB7", // Teal
  "#0F5EA0", // Blue
  "#7762E3", // Purple
  "#FF469B", // Magenta
  "#FFC4DD", // Pink
];

// Shown in the hover tooltip alongside the hex code. Keyed uppercase since
// hex values are compared/displayed uppercase throughout.
const COLOR_NAMES = {
  "#070707": "Black",
  "#F3F3F1": "White",
  "#6C7477": "Grey",
  "#626B76": "Dark Grey",
  "#AC0200": "Red",
  "#B7571F": "Burnt Orange",
  "#DC6E38": "Orange",
  "#5A3323": "Brown",
  "#B68C61": "Army Beige",
  "#A8A38D": "Flat Dark Earth",
  "#F0C940": "Yellow",
  "#697240": "Army Green",
  "#05AF47": "Green",
  "#5FCCB7": "Teal",
  "#0F5EA0": "Blue",
  "#7762E3": "Purple",
  "#FF469B": "Magenta",
  "#FFC4DD": "Pink",
};

export function nameForHex(hex) {
  return COLOR_NAMES[hex.toUpperCase()] ?? null;
}

export function labelForHex(hex) {
  const name = nameForHex(hex);
  return name ? `${name} (${hex})` : hex;
}

export function prettyName(name) {
  return name
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// A single shared tooltip element, positioned with fixed coordinates on
// hover/focus rather than living inside each swatch. Swatch grids often sit
// in a scrollable panel, and an element positioned relative to a swatch near
// the panel's edge would get silently clipped by the panel's own overflow -
// fixed positioning (plus the clamping below) keeps it fully on-screen
// regardless of which swatch it's for.
let tooltipEl = null;

function getTooltipEl() {
  if (!tooltipEl) {
    tooltipEl = document.createElement("div");
    tooltipEl.className = "swatch-tooltip";
    document.body.appendChild(tooltipEl);
  }
  return tooltipEl;
}

export function showTooltip(anchorEl, text) {
  const tooltip = getTooltipEl();
  tooltip.textContent = text;
  tooltip.style.visibility = "hidden";
  tooltip.classList.add("visible");

  const anchorRect = anchorEl.getBoundingClientRect();
  const tooltipRect = tooltip.getBoundingClientRect();
  const margin = 8;

  let left = anchorRect.left + anchorRect.width / 2 - tooltipRect.width / 2;
  left = Math.max(margin, Math.min(left, window.innerWidth - tooltipRect.width - margin));
  let top = anchorRect.top - tooltipRect.height - margin;
  let arrowBelow = false;
  if (top < margin) {
    // Not enough room above (e.g. swatch near the top of the viewport) -
    // show the tooltip below the swatch instead.
    top = anchorRect.bottom + margin;
    arrowBelow = true;
  }

  tooltip.style.left = `${left}px`;
  tooltip.style.top = `${top}px`;
  tooltip.style.setProperty("--arrow-offset", `${anchorRect.left + anchorRect.width / 2 - left}px`);
  tooltip.classList.toggle("arrow-below", arrowBelow);
  tooltip.style.visibility = "visible";
}

export function hideTooltip() {
  tooltipEl?.classList.remove("visible");
}
