import * as THREE from "three";

/**
 * Procedural stand-in for a real card model, keyed by shape id. Used only
 * until the matching GLB export (see shapes.js) is present, so the viewer,
 * color UI, and shape picker can be built/tested without CAD assets. Every
 * shape uses the same part names a real export should use.
 */
export function buildPlaceholderModel(shapeId = "classic") {
  if (shapeId === "nfc-keychain") return buildKeychainPlaceholder();

  const group = new THREE.Group();
  group.name = `placeholder_${shapeId}`;

  const body = buildBody(shapeId);
  body.name = "card_body";
  group.add(body);

  const logoGeo = new THREE.CylinderGeometry(10, 10, 1.6, 48);
  const logoMat = new THREE.MeshStandardMaterial({ color: "#c9a227", roughness: 0.35, metalness: 0.4 });
  const logo = new THREE.Mesh(logoGeo, logoMat);
  logo.name = "logo";
  logo.position.set(-24, 2.3, 0);
  group.add(logo);

  // Three separate bodies standing in for individual letters, named with a
  // shared base name ("text", "text.001", "text.002") so the widget groups
  // them into one colorable "Text" swatch row instead of three.
  const textMat = new THREE.MeshStandardMaterial({ color: "#e8e6e1", roughness: 0.6, metalness: 0.0 });
  [0, 1, 2].forEach((i) => {
    const letterGeo = new THREE.BoxGeometry(12, 1.6, 10);
    const letter = new THREE.Mesh(letterGeo, textMat.clone());
    letter.name = i === 0 ? "text" : `text.00${i}`;
    letter.position.set(-6 + i * 16, 2.3, -14);
    group.add(letter);
  });

  group.traverse((obj) => {
    if (obj.isMesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
    }
  });

  return group;
}

// Stand-in for the NFC keychain (nfc-keychain/): a rounded tag with a key
// ring hole at the far end, plus a raised disc. Uses the two part names the
// real export should have - "Body Color" and "Accent Color".
function buildKeychainPlaceholder() {
  const group = new THREE.Group();
  group.name = "placeholder_nfc-keychain";

  const thickness = 4;
  const tag = roundedRectShape(46, 76, 12);
  // Shape +y becomes -z after the rotation below, i.e. the far end of the
  // tag from the default camera.
  const hole = new THREE.Path();
  hole.absarc(0, 28, 5.5, 0, Math.PI * 2, true);
  tag.holes.push(hole);

  const bodyGeo = new THREE.ExtrudeGeometry(tag, { depth: thickness, bevelEnabled: false });
  bodyGeo.rotateX(-Math.PI / 2);
  bodyGeo.translate(0, -thickness / 2, 0);
  const body = new THREE.Mesh(
    bodyGeo,
    new THREE.MeshStandardMaterial({ color: "#070707", roughness: 0.55, metalness: 0.05 })
  );
  body.name = "Body Color";
  group.add(body);

  const accentGeo = new THREE.CylinderGeometry(14, 14, 1.6, 48);
  const accent = new THREE.Mesh(
    accentGeo,
    new THREE.MeshStandardMaterial({ color: "#F3F3F1", roughness: 0.55, metalness: 0.05 })
  );
  accent.name = "Accent Color";
  accent.position.set(0, thickness / 2 + 0.8, -6);
  group.add(accent);

  group.traverse((obj) => {
    if (obj.isMesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
    }
  });

  return group;
}

function buildBody(shapeId) {
  const bodyMat = new THREE.MeshStandardMaterial({ color: "#2b2b2b", roughness: 0.55, metalness: 0.05 });

  if (shapeId === "hex") {
    const geo = new THREE.CylinderGeometry(46, 46, 3, 6);
    return new THREE.Mesh(geo, bodyMat);
  }

  if (shapeId === "rounded") {
    const shape = roundedRectShape(85, 54, 12);
    const geo = new THREE.ExtrudeGeometry(shape, { depth: 3, bevelEnabled: false });
    geo.rotateX(-Math.PI / 2);
    geo.translate(0, -1.5, 0);
    return new THREE.Mesh(geo, bodyMat);
  }

  const geo = new THREE.BoxGeometry(85, 3, 54);
  return new THREE.Mesh(geo, bodyMat);
}

function roundedRectShape(width, depth, radius) {
  const w = width / 2;
  const d = depth / 2;
  const shape = new THREE.Shape();

  shape.moveTo(-w + radius, -d);
  shape.lineTo(w - radius, -d);
  shape.quadraticCurveTo(w, -d, w, -d + radius);
  shape.lineTo(w, d - radius);
  shape.quadraticCurveTo(w, d, w - radius, d);
  shape.lineTo(-w + radius, d);
  shape.quadraticCurveTo(-w, d, -w, d - radius);
  shape.lineTo(-w, -d + radius);
  shape.quadraticCurveTo(-w, -d, -w + radius, -d);

  return shape;
}
