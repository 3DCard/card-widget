/**
 * Reads/writes the widget's shareable state (selected shape + per-part
 * colors) to the URL query string, e.g. ?shape=rounded&colors=card_body:1c1b19,logo:c9a227
 */
export function readState() {
  const params = new URLSearchParams(window.location.search);
  const shapeId = params.get("shape") || null;

  const raw = params.get("colors");
  const colors = {};
  if (raw) {
    raw.split(",").forEach((pair) => {
      const [name, hex] = pair.split(":");
      if (name && hex) colors[name] = `#${hex.replace(/^#/, "")}`;
    });
  }

  return { shapeId, colors };
}

export function writeState(shapeId, colors) {
  const encodedColors = Object.entries(colors)
    .map(([name, hex]) => `${name}:${hex.replace(/^#/, "")}`)
    .join(",");

  const url = new URL(window.location.href);
  url.searchParams.set("shape", shapeId);
  url.searchParams.set("colors", encodedColors);
  window.history.replaceState({}, "", url);
}
