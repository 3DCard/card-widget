import { createViewer } from "../../src/viewer.js";
import { renderColorPicker } from "../../src/colorPicker.js";
import { SHAPES, DEFAULT_SHAPE_ID } from "./shapes.js";
import { readState, writeState } from "../../src/urlState.js";

// Display order for the swatch rows - sort by this list rather than
// relying on the order the meshes happen to be exported in. Names are
// compared with underscores treated as spaces because three.js's GLTF
// loader turns "Body Color" into "Body_Color" when it loads the model.
const PART_ORDER = ["body color", "accent color"];

function orderParts(parts) {
  const rank = (name) => {
    const i = PART_ORDER.indexOf(name.replace(/_/g, " ").toLowerCase());
    return i === -1 ? PART_ORDER.length : i;
  };
  return [...parts].sort((a, b) => rank(a.name) - rank(b.name));
}

async function main() {
  const canvas = document.getElementById("viewer-canvas");
  const viewerContainer = document.getElementById("viewer-container");
  const partList = document.getElementById("part-list");
  const shareBtn = document.getElementById("share-btn");

  // Single shape: no picker, and any ?shape= in a shared link is ignored.
  const shape = SHAPES.find((s) => s.id === DEFAULT_SHAPE_ID) || SHAPES[0];
  const { colors: urlColors } = readState();

  const viewer = await createViewer(canvas, viewerContainer, shape);

  const selection = renderColorPicker(partList, orderParts(viewer.parts), {
    initialColors: urlColors,
    onChange: (_name, _hex, current) => writeState(shape.id, current),
  });
  writeState(shape.id, selection);

  document.querySelectorAll("#view-presets button").forEach((btn) => {
    btn.addEventListener("click", () => viewer.setView(btn.dataset.view));
  });

  shareBtn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      shareBtn.textContent = "Link copied!";
      shareBtn.classList.add("copied");
      setTimeout(() => {
        shareBtn.textContent = "Copy shareable link";
        shareBtn.classList.remove("copied");
      }, 1500);
    } catch {
      window.prompt("Copy this link:", window.location.href);
    }
  });
}

main();
