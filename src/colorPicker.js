const DEFAULT_PALETTE = [
  "#070707", // black
  "#F3F3F1", // white
  "#6C7477", // grey
  "#626B76", // dark grey
  "#AC0200", // red
  "#B7571F", // rust orange
  "#DC6E38", // orange
  "#5A3323", // dark brown
  "#B68C61", // tan
  "#A8A38D", // warm grey / khaki
  "#F0C940", // yellow
  "#697240", // olive
  "#05AF47", // green
  "#5FCCB7", // teal / mint
  "#0F5EA0", // blue
  "#7762E3", // purple
  "#FF469B", // magenta / pink
  "#FFC4DD", // light pink
];

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
      const swatch = document.createElement("button");
      swatch.type = "button";
      swatch.className = "swatch";
      swatch.style.background = hex;
      swatch.setAttribute("aria-label", `${prettyName(part.name)}: ${hex}`);
      if (hex.toLowerCase() === startColor.toLowerCase()) {
        swatch.classList.add("selected");
      }

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
