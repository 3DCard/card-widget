/**
 * Registry of selectable card shapes for the 3-color variant. Each model
 * needs exactly 4 meshes named Body, Brand, Contact, and Contact.001 (or
 * any `.001`-style numeric suffix - see src/viewer.js `baseName`) so Name
 * and Contact Info group together as one "Contact" color.
 */
export const SHAPES = [
  { id: "landscape", label: "Landscape", file: "../public/models/3-color-landscape.glb" },
];

export const DEFAULT_SHAPE_ID = SHAPES[0].id;
