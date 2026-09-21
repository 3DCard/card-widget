/**
 * The NFC keychain variant has a single shape, so there's no picker - this
 * registry just names the one model. It needs two meshes named "Body Color"
 * and "Accent Color" (same convention as the main widget). Until the GLB is
 * exported to public/models/, the viewer falls back to a placeholder
 * keychain with those same part names.
 */
export const SHAPES = [
  { id: "nfc-keychain", label: "NFC Keychain", file: "../public/models/Keychain.glb" },
];

export const DEFAULT_SHAPE_ID = SHAPES[0].id;
