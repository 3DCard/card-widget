/**
 * Registry of selectable card shapes for the 3-color variant. Each model
 * needs meshes named Body, Brand, and Contact - if Name and Contact Info
 * come out of the CAD export as two separate meshes rather than one, name
 * the second one Contact_001 (an underscore suffix, not a dot - see
 * "Multiple bodies that should color together" in the README) so they
 * group into one "Contact" color.
 */
export const SHAPES = [
  { id: "landscape", label: "Landscape", file: "../public/models/3-color-landscape.glb" },
  { id: "portrait", label: "Portrait", file: "../public/models/3-color-portrait.glb" },
  { id: "square", label: "Square", file: "../public/models/3-color-square.glb" },
  { id: "circle", label: "Circle", file: "../public/models/3-color-circle.glb" },
  { id: "oval", label: "Oval", file: "../public/models/3-color-oval.glb" },
  { id: "arch", label: "Arch", file: "../public/models/3-color-arch.glb" },
];

export const DEFAULT_SHAPE_ID = SHAPES[0].id;
