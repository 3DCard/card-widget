const DEFAULT_PALETTE = [
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
// hex values are compared/displayed uppercase throughout this file.
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

function nameForHex(hex) {
  return COLOR_NAMES[hex.toUpperCase()] ?? null;
}

// A single shared tooltip element, positioned with fixed coordinates on
// hover/focus rather than living inside each swatch. The swatch grid sits
// in a scrollable panel (#controls-panel), and an element positioned
// relative to a swatch near the panel's edge would get silently clipped by
// the panel's own overflow - fixed positioning (plus the clamping below)
// keeps it fully on-screen regardless of which swatch it's for.
let tooltipEl = null;

function getTooltipEl() {
  if (!tooltipEl) {
    tooltipEl = document.createElement("div");
    tooltipEl.className = "swatch-tooltip";
    document.body.appendChild(tooltipEl);
  }
  return tooltipEl;
}

function showTooltip(anchorEl, text) {
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

function hideTooltip() {
  tooltipEl?.classList.remove("visible");
}

// Palettes can be overridden per part name (matched by substring, case-insensitive)
// e.g. metallic finishes only for a "logo" part, matte plastics for the body.
const PART_PALETTE_OVERRIDES = {};

function paletteFor(partName) {
  const key = Object.keys(PART_PALETTE_OVERRIDES).find((k) =>
    partName.toLowerCase().includes(k.toLowerCase())
  );
  return key ? PART_PALETTE_OVERRIDES[key] : DEFAULT_PALETTE;
}

// The starting color shown before a visitor picks anything - matched by
// substring like PART_PALETTE_OVERRIDES above. Without this every part
// would default to the first palette color (black), so a visitor's very
// first view would be an all-black card.
const DEFAULT_COLOR_OVERRIDES = {
  accent: "#F3F3F1", // white
  body: "#070707", // black
};

function defaultColorFor(partName) {
  const key = Object.keys(DEFAULT_COLOR_OVERRIDES).find((k) =>
    partName.toLowerCase().includes(k.toLowerCase())
  );
  return key ? DEFAULT_COLOR_OVERRIDES[key] : DEFAULT_PALETTE[0];
}

function prettyName(name) {
  return name
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Renders one swatch row per part into `container` and wires clicks to
 * update every mesh in that part's `meshes` group (multiple CAD bodies
 * sharing a base name — see viewer.js `extractParts` — are recolored
 * together as one unit). `initialColors` (keyed by part name) seeds the
 * starting selection — pass the previous shape's selection when switching
 * shapes so matching part names carry their color over. Calls
 * `onChange(partName, hex, selection)` after every change so the caller
 * can persist state (e.g. to the URL). Returns the selection map.
 */
export function renderColorPicker(container, parts, { initialColors = {}, onChange } = {}) {
  container.innerHTML = "";
  const selection = {};

  parts.forEach((part) => {
    const palette = paletteFor(part.name);
    const startColor = initialColors[part.name] || defaultColorFor(part.name);

    part.meshes.forEach((mesh) => mesh.material.color.set(startColor));
    selection[part.name] = startColor;

    const group = document.createElement("div");
    group.className = "part-group";

    const heading = document.createElement("h3");
    heading.textContent = prettyName(part.name);
    group.appendChild(heading);

    const row = document.createElement("div");
    row.className = "swatch-row";

    palette.forEach((hex) => {
      const name = nameForHex(hex);
      const label = name ? `${name} (${hex})` : hex;

      const swatch = document.createElement("button");
      swatch.type = "button";
      swatch.className = "swatch";
      swatch.style.background = hex;
      swatch.setAttribute("aria-label", `${prettyName(part.name)}: ${label}`);
      if (hex.toLowerCase() === startColor.toLowerCase()) {
        swatch.classList.add("selected");
      }

      swatch.addEventListener("mouseenter", () => showTooltip(swatch, label));
      swatch.addEventListener("focus", () => showTooltip(swatch, label));
      swatch.addEventListener("mouseleave", hideTooltip);
      swatch.addEventListener("blur", hideTooltip);

      swatch.addEventListener("click", () => {
        part.meshes.forEach((mesh) => mesh.material.color.set(hex));
        selection[part.name] = hex;
        row.querySelectorAll(".swatch").forEach((el) => el.classList.remove("selected"));
        swatch.classList.add("selected");
        onChange?.(part.name, hex, selection);
      });

      row.appendChild(swatch);
    });

    group.appendChild(row);
    container.appendChild(group);
  });

  return selection;
}
