# 3D Card Color Customizer

An embeddable Three.js widget that lets visitors pick a card shape, change
the color of each part, and rotate/zoom to preview it.

No build step required — it's plain HTML/JS using ES module imports, so it
can be deployed to any static host as-is.

## Running it locally

Any static file server works, e.g. with Python (preinstalled on macOS):

```bash
python3 -m http.server 5173
```

Then open `http://localhost:5173`. Until real models are added (see below),
the viewer shows a placeholder card (with a distinct silhouette per shape)
so you can test the shape picker, color UI, camera controls, and responsive
layout right away.

## Adding your real models

STL has no material/color data, and STEP isn't well supported by browsers,
so the widget expects **glTF Binary (.glb)** files with each colorable part
as its own named mesh:

1. In your CAD tool (or Blender), export each shape as glTF/GLB with each
   component — body, logo, text, etc. — as a separate, clearly named mesh
   (e.g. `card_body`, `logo`, `text`). The color-picker UI is generated
   automatically from these names, so name them the way you'd want them to
   appear on the site (they're auto-formatted, e.g. `card_body` → "Card Body").
   **Use the same part names across every shape** so a color choice carries
   over automatically when a visitor switches shapes.
2. Enable Draco compression on export if your tool supports it (keeps mobile
   load times fast). Blender: glTF export panel → Mesh → Compression.
3. Save each file under `public/models/` and register it in
   [src/shapes.js](src/shapes.js), e.g.:

   ```js
   export const SHAPES = [
     { id: "Landscape", label: "Landscape", file: "public/models/landscape.glb" },
     { id: "rounded", label: "Rounded", file: "public/models/card-rounded.glb" },
     { id: "hex", label: "Hex", file: "public/models/card-hex.glb" },
   ];
   ```

   The `label` is what shows up in the shape dropdown. Add or remove entries
   here to add or remove shapes from the picker — a shape whose `file` isn't
   present yet just falls back to a placeholder, so you can add entries
   before every export is ready.
4. Reload the page. If a shape's GLB fails to load for any reason, the
   console will log an error and its placeholder is shown instead, so the
   widget never breaks visibly.

### If your CAD tool drops names on export (e.g. Shapr3D)

Shapr3D's GLB export doesn't carry the Items-list body names into the file
at all, even after renaming the bodies there — every mesh comes out
nameless. If that happens (you'll see every part merged into one generic
"Mesh" swatch), use [scripts/rename_glb_meshes.py](scripts/rename_glb_meshes.py)
to inject names after export, in the order the bodies appear in the file:

```bash
python3 scripts/rename_glb_meshes.py public/models/card-classic.glb public/models/card-classic.glb "Body Color" "Accent Color"
```

Pass the same path twice to rename in place. The order has to match how
your CAD tool wrote the bodies into the file, which isn't always the order
you created them in — if the swatches end up controlling the wrong parts,
just re-run the script with the names swapped, no need to re-export.

### Multiple bodies that should color together

If a part is made of several separate bodies in CAD on purpose (e.g. one
body per letter of the text, not merged into a single solid), you don't
need to combine them — just give them the same base name. The widget groups
any meshes whose names only differ by a trailing numeric suffix into one
swatch row that recolors all of them together. Both of these patterns work:

- `text`, `text.001`, `text.002`, ... (what Blender auto-generates when you
  duplicate/rename objects the same)
- `text_1`, `text_2`, `text_3`, ...

Whatever your tool auto-suffixes duplicate names with is fine, as long as
it's a number after a `.`, `_`, or `-`.

To customize which colors are offered per part (e.g. metallic finishes only
for the logo), edit `PART_PALETTE_OVERRIDES` in [src/colorPicker.js](src/colorPicker.js).

## Deploying and embedding in Squarespace

1. Deploy this folder to a static host (Vercel, Netlify, Cloudflare Pages,
   or GitHub Pages all work with zero config since there's no build step).
2. In Squarespace, add a **Code Block** where you want the widget and paste:

   ```html
   <iframe
     src="https://YOUR-DEPLOYED-URL/"
     style="width: 100%; height: 520px; border: 0;"
     loading="lazy"
     title="3D card color customizer"
   ></iframe>
   ```

3. Adjust the `height` to taste:
   - **≥640px wide** (desktop-ish): the viewer and controls sit side by
     side and share the iframe's height, so pick whatever height looks
     good - the controls panel scrolls internally if it doesn't fit.
   - **<640px wide** (mobile, or a narrow Squarespace column): the controls
     move below the viewer and the panel expands to its full natural
     height instead of scrolling internally, so the page needs to actually
     be that tall to avoid clipping. The current 18-color palette needs
     about **700px** total at this width - use `height: 700px` (or taller,
     for a margin of safety) for sections that render narrow.

The selected shape and colors are also encoded into the URL
(`?shape=...&colors=...`), so the "Copy shareable link" button lets a
visitor send you their exact configuration.
