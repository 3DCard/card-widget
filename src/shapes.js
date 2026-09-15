/**
 * Registry of selectable card shapes. Add a new shape by exporting its GLB
 * (see README.md for the export requirements) to public/models/ and adding
 * an entry here — the dropdown and viewer pick it up automatically.
 *
 * Until a shape's `file` exists, the viewer falls back to a placeholder
 * model for that shape id so the picker can be built/tested before every
 * export is ready.
 */
export const SHAPES = [
  { id: "landscape", label: "Landscape", file: "public/models/landscape.glb" },
  { id: "portrait", label: "Portrait", file: "public/models/Portrait.glb" },
  { id: "square", label: "Square", file: "public/models/square.glb" },
  { id: "circle", label: "Circle", file: "public/models/circle.glb" },
  { id: "oval", label: "Oval", file: "public/models/oval.glb" },
  { id: "arch", label: "Arch", file: "public/models/Arch.glb" },
];

export const DEFAULT_SHAPE_ID = SHAPES[0].id;
