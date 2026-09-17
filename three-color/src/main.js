import { createViewer } from "../../src/viewer.js";
import { renderColorPicker } from "../../src/colorPicker.js";
import { SHAPES, DEFAULT_SHAPE_ID } from "./shapes.js";
import { readState, writeState } from "../../src/urlState.js";

// The model's mesh order (Contact, Brand, Body) doesn't match the display
// order we want - sort by this list instead of relying on export order.
const PART_ORDER = ["Body", "Brand", "Contact"];

function orderParts(parts) {
  return [...parts].sort((a, b) => PART_ORDER.indexOf(a.name) - PART_ORDER.indexOf(b.name));
}

async function main() {
  const canvas = document.getElementById("viewer-canvas");
  const viewerContainer = document.getElementById("viewer-container");
  const partList = document.getElementById("part-list");
  const shareBtn = document.getElementById("share-btn");
  const shapeSelect = document.getElementById("shape-select");

  SHAPES.forEach((shape) => {
    const option = document.createElement("option");
    option.value = shape.id;
    option.textContent = shape.label;
    shapeSelect.appendChild(option);
  });

  const { shapeId: urlShapeId, colors: urlColors } = readState();
  const initialShape =
    SHAPES.find((s) => s.id === urlShapeId) ||
    SHAPES.find((s) => s.id === DEFAULT_SHAPE_ID) ||
    SHAPES[0];
  shapeSelect.value = initialShape.id;

  const viewer = await createViewer(canvas, viewerContainer, initialShape);

  let currentColors = renderColorPicker(partList, orderParts(viewer.parts), {
    initialColors: urlColors,
    onChange: (_name, _hex, selection) => {
      currentColors = selection;
      writeState(shapeSelect.value, currentColors);
    },
  });
  writeState(shapeSelect.value, currentColors);

  shapeSelect.addEventListener("change", async () => {
    const shape = SHAPES.find((s) => s.id === shapeSelect.value);
    const parts = await viewer.loadShape(shape);

    currentColors = renderColorPicker(partList, orderParts(parts), {
      initialColors: currentColors,
      onChange: (_name, _hex, selection) => {
        currentColors = selection;
        writeState(shapeSelect.value, currentColors);
      },
    });
    writeState(shapeSelect.value, currentColors);
  });

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
