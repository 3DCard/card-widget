import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { buildPlaceholderModel } from "./placeholderModel.js";

/**
 * Sets up the Three.js scene bound to `canvas`, loads `initialShape`'s
 * model (real GLB if present, otherwise a placeholder), and starts the
 * render loop. Resolves with the list of colorable parts found on the
 * model ([{ name, meshes }] — meshes sharing a base name are grouped
 * together) plus a `loadShape(shape)` method for switching to a different
 * shape later.
 */
export async function createViewer(canvas, container, initialShape) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#f4f3f0");

  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 2000);
  camera.position.set(60, 70, 110);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  // Rotation is handled by spinning the model itself (see the pointer
  // handlers below) rather than orbiting the camera around it, so the
  // (fixed) lights and shadow read naturally as the card turns - like
  // spinning a card under a desk lamp, instead of flying a camera around a
  // static scene where the light-to-card relationship never actually
  // changes. OrbitControls is kept only for scroll-to-zoom.
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0, 0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 60;
  controls.maxDistance = 260;
  controls.enableRotate = false;
  controls.enablePan = false;

  setupLighting(scene);

  // The camera never moves angularly (rotate/pan are off, and zoom only
  // dollies along this same line), so this direction stays valid for the
  // lifetime of the viewer - presets below reuse it to frame the model.
  const cameraDirection = camera.position.clone().sub(controls.target).normalize();

  let currentGroup = await loadModel(initialShape.file, initialShape.id);
  scene.add(currentGroup);
  let parts = extractParts(currentGroup);
  frameCameraToObject(camera, controls, currentGroup, cameraDirection);

  // Measured from the canvas itself, not the container - the container also
  // holds the preset-buttons row now, so it's taller than the canvas alone.
  function resize() {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    renderer.setSize(width, height, false);
    camera.aspect = width / Math.max(height, 1);
    camera.updateProjectionMatrix();
  }

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas);
  resize();

  // Drag-to-spin the model. A small velocity carries over after release
  // and eases out, echoing the damped feel OrbitControls used to give the
  // camera.
  let isDragging = false;
  let lastPointer = { x: 0, y: 0 };
  let rotVelocityX = 0;
  let rotVelocityZ = 0;
  const ROTATE_SPEED = 0.01;

  canvas.addEventListener("pointerdown", (event) => {
    isDragging = true;
    lastPointer = { x: event.clientX, y: event.clientY };
    rotVelocityX = 0;
    rotVelocityZ = 0;
    viewAnimation = null;
    canvas.setPointerCapture(event.pointerId);
  });

  canvas.addEventListener("pointermove", (event) => {
    if (!isDragging) return;
    const dx = event.clientX - lastPointer.x;
    const dy = event.clientY - lastPointer.y;
    lastPointer = { x: event.clientX, y: event.clientY };

    // Up/down drag pitches the card; left/right drag rolls it - yaw is
    // unused for now, trying a roll+pitch-only control scheme at the
    // user's request.
    rotVelocityX = dy * ROTATE_SPEED;
    rotVelocityZ = -dx * ROTATE_SPEED;
    currentGroup.rotation.x += rotVelocityX;
    currentGroup.rotation.z += rotVelocityZ;
  });

  function endDrag(event) {
    isDragging = false;
    canvas.releasePointerCapture(event.pointerId);
  }
  canvas.addEventListener("pointerup", endDrag);
  canvas.addEventListener("pointercancel", endDrag);

  // Drives the smooth transition used by the view presets below - a plain
  // quaternion slerp + position/target lerp over a fixed duration, eased.
  // Starting a new one mid-flight is fine: it just captures wherever the
  // camera/card currently are as the new starting point.
  let viewAnimation = null;

  function animateToView(toQuaternion, toCameraPos, toTarget, duration = 650) {
    viewAnimation = {
      startTime: performance.now(),
      duration,
      fromQuat: currentGroup.quaternion.clone(),
      toQuat: toQuaternion.clone(),
      fromCameraPos: camera.position.clone(),
      toCameraPos: toCameraPos.clone(),
      fromTarget: controls.target.clone(),
      toTarget: toTarget.clone(),
    };
  }

  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
  }

  renderer.setAnimationLoop(() => {
    if (viewAnimation) {
      const t = Math.min((performance.now() - viewAnimation.startTime) / viewAnimation.duration, 1);
      const eased = easeInOutCubic(t);
      currentGroup.quaternion.slerpQuaternions(viewAnimation.fromQuat, viewAnimation.toQuat, eased);
      camera.position.lerpVectors(viewAnimation.fromCameraPos, viewAnimation.toCameraPos, eased);
      controls.target.lerpVectors(viewAnimation.fromTarget, viewAnimation.toTarget, eased);
      const dist = camera.position.distanceTo(controls.target);
      camera.near = dist / 100;
      camera.far = dist * 100;
      camera.updateProjectionMatrix();
      if (t >= 1) viewAnimation = null;
    } else if (!isDragging && (Math.abs(rotVelocityX) > 0.0001 || Math.abs(rotVelocityZ) > 0.0001)) {
      currentGroup.rotation.x += rotVelocityX;
      currentGroup.rotation.z += rotVelocityZ;
      rotVelocityX *= 0.92;
      rotVelocityZ *= 0.92;
    }
    controls.update();
    renderer.render(scene, camera);
  });

  // Guards against switching shapes faster than they can load: if a newer
  // request starts before an older one resolves, the older one's result is
  // discarded instead of stomping over the shape the visitor is now on.
  let loadGeneration = 0;

  async function loadShape(shape) {
    const generation = ++loadGeneration;
    const newGroup = await loadModel(shape.file, shape.id);

    if (generation !== loadGeneration) {
      disposeGroup(newGroup);
      return parts;
    }

    newGroup.rotation.copy(currentGroup.rotation);
    scene.remove(currentGroup);
    disposeGroup(currentGroup);
    currentGroup = newGroup;
    scene.add(currentGroup);
    parts = extractParts(currentGroup);
    frameCameraToObject(camera, controls, currentGroup, cameraDirection);
    return parts;
  }

  // Preset camera-style views, since removing yaw (see the drag handlers
  // above) means there's no easy way to spin back to "straight on" by hand.
  //
  // "squared"/"back" face the (fixed) camera with a small amount of extra
  // yaw/pitch dialed in for depth, but built from an explicit basis rather
  // than a naive minimal-rotation quaternion - the naive approach leaves an
  // incidental roll baked in (since the camera direction isn't purely
  // vertical), which visibly tilts the card's text/edge off-level. Here the
  // "right" (text-direction) axis is always derived as horizontal
  // (perpendicular to world up), so text stays level on screen no matter
  // the yaw/pitch amount.
  const WORLD_UP = new THREE.Vector3(0, 1, 0);

  function buildFacingQuaternion(yawDeg, pitchDeg, showBack) {
    const yawed = cameraDirection.clone().applyAxisAngle(WORLD_UP, THREE.MathUtils.degToRad(yawDeg));
    const right = new THREE.Vector3().crossVectors(WORLD_UP, yawed).normalize();
    let faceNormal = yawed.applyAxisAngle(right, THREE.MathUtils.degToRad(pitchDeg)).normalize();
    if (showBack) faceNormal = faceNormal.negate();
    const depthAxis = new THREE.Vector3().crossVectors(right, faceNormal).normalize();
    const basis = new THREE.Matrix4().makeBasis(right, faceNormal, depthAxis);
    return new THREE.Quaternion().setFromRotationMatrix(basis);
  }

  function setView(name) {
    rotVelocityX = 0;
    rotVelocityZ = 0;

    let targetQuat;
    let direction = cameraDirection;
    let distanceMultiplier = 1;

    if (name === "start") {
      targetQuat = new THREE.Quaternion();
    } else if (name === "zoom") {
      // A steeper, more overhead angle than the other presets - computed
      // fresh from the fixed cameraDirection each time (never read off
      // camera.position, which other presets may have since moved).
      const yawed = cameraDirection.clone().applyAxisAngle(WORLD_UP, THREE.MathUtils.degToRad(15));
      const right = new THREE.Vector3().crossVectors(WORLD_UP, yawed).normalize();
      direction = yawed.applyAxisAngle(right, THREE.MathUtils.degToRad(-20));
      distanceMultiplier = 0.65;
      targetQuat = new THREE.Quaternion();
    } else if (name === "squared") {
      targetQuat = buildFacingQuaternion(1, 0.75, false);
    } else if (name === "back") {
      targetQuat = buildFacingQuaternion(45, 10, true);
    } else {
      return;
    }

    const { cameraPos, target } = computeFraming(camera, currentGroup, direction, distanceMultiplier);
    animateToView(targetQuat, cameraPos, target);
  }

  return { scene, camera, renderer, controls, parts, loadShape, setView };
}

// Meshes whose names only differ by a trailing numeric suffix (Blender-style
// "text.001", "text.002", or "text_1", "text_2") are grouped into one part,
// so several separate CAD bodies (e.g. one per letter) can be colored as a
// single unit instead of one swatch row per body.
function baseName(name) {
  return name.replace(/[._-]\d+$/, "");
}

function extractParts(group) {
  const byBaseName = new Map();
  group.traverse((obj) => {
    if (!obj.isMesh) return;
    obj.material = obj.material.clone();
    obj.castShadow = true;
    obj.receiveShadow = true;

    const rawName = obj.name || `part_${byBaseName.size + 1}`;
    const key = baseName(rawName);
    if (!byBaseName.has(key)) byBaseName.set(key, { name: key, meshes: [] });
    byBaseName.get(key).meshes.push(obj);
  });
  return Array.from(byBaseName.values());
}

function disposeGroup(group) {
  group.traverse((obj) => {
    if (!obj.isMesh) return;
    obj.geometry?.dispose();
    const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
    materials.forEach((m) => m?.dispose());
  });
}

function setupLighting(scene) {
  // Ground color is fairly bright (not near-black) so the underside of a
  // model - now freely viewable since rotation is no longer capped at the
  // horizon - still reads its true material color instead of going dark.
  const hemi = new THREE.HemisphereLight("#ffffff", "#9a9890", 1.1);
  scene.add(hemi);

  const key = new THREE.DirectionalLight("#ffffff", 2.2);
  key.position.set(120, 160, 90);
  key.castShadow = false; // shadow disabled for comparison - see ground plane below
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.near = 10;
  key.shadow.camera.far = 400;
  key.shadow.camera.left = -120;
  key.shadow.camera.right = 120;
  key.shadow.camera.top = 120;
  key.shadow.camera.bottom = -120;
  key.shadow.bias = -0.0015;
  scene.add(key);

  const fill = new THREE.DirectionalLight("#ffffff", 0.6);
  fill.position.set(-100, 60, -80);
  scene.add(fill);

  // Lights the underside directly, since visitors can now orbit all the way
  // around and under the model.
  const under = new THREE.DirectionalLight("#ffffff", 0.9);
  under.position.set(-40, -140, 60);
  scene.add(under);

  // Sits well below the model - now that the card itself rotates in place
  // (rather than the camera orbiting a static card), a plane placed close
  // underneath it would clip into a tilted card. Placing it far below and
  // keeping the shadow faint reads as the card floating, with a soft,
  // grounding shadow rather than a contact shadow.
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(2000, 2000),
    new THREE.ShadowMaterial({ opacity: 0.1 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -60;
  ground.receiveShadow = true;
  // scene.add(ground); // shadow disabled for comparison
}

// CAD tools export at wildly different scales (meters, mm, cm, inches).
// The camera, lighting, and OrbitControls distance limits are all tuned to
// the placeholder's ~85-unit card size, so a model exported in meters
// (~0.07 units for a business card) would be too small for the camera to
// ever get close enough to see. Normalize every loaded model to roughly
// the same on-screen size regardless of its source units.
const TARGET_MAX_DIMENSION = 85;

function normalizeScale(object) {
  const box = new THREE.Box3().setFromObject(object);
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);
  if (maxDim > 0 && Number.isFinite(maxDim)) {
    object.scale.setScalar(TARGET_MAX_DIMENSION / maxDim);
  }
}

// Created once and reused for every load. DRACOLoader spins up a pool of
// decoder web workers - creating a fresh one per shape switch (as this used
// to) leaked workers on every switch until the browser stopped granting new
// ones, at which point decoding would silently fail and every shape fell
// back to the placeholder model.
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath("https://cdn.jsdelivr.net/npm/three@0.169.0/examples/jsm/libs/draco/");

const gltfLoader = new GLTFLoader();
gltfLoader.setDRACOLoader(dracoLoader);

async function loadModel(url, shapeId) {
  const available = await headOk(url);
  if (!available) {
    console.info("[viewer] No GLB found at", url, "- using placeholder model for", shapeId);
    return buildPlaceholderModel(shapeId);
  }

  try {
    const gltf = await gltfLoader.loadAsync(url);
    normalizeScale(gltf.scene);
    return gltf.scene;
  } catch (err) {
    console.error("[viewer] Failed to load", url, "- falling back to placeholder.", err);
    return buildPlaceholderModel(shapeId);
  }
}

async function headOk(url) {
  try {
    const res = await fetch(url, { method: "HEAD" });
    return res.ok;
  } catch {
    return false;
  }
}

// Measures size/center at identity rotation regardless of the object's
// current orientation. A world-space AABB of a thin, tilted card is much
// larger than the card itself (the box has to cover its tilted corners),
// which would otherwise make the tilted preset views zoom out and shrink
// the card - measuring "flat" keeps framing consistent across all of them.
function measureNatural(object) {
  const savedQuat = object.quaternion.clone();
  object.quaternion.identity();
  object.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(object);
  object.quaternion.copy(savedQuat);
  object.updateMatrixWorld(true);
  return box;
}

// `direction` is required (not inferred from the camera's current position)
// so framing is always deterministic regardless of which preset ran last -
// deriving it from camera.position previously meant a preset that moved the
// camera to a custom angle (like "zoom") would leak that angle into every
// preset framed afterward, since each one unknowingly reused whatever
// direction the camera was last left pointing.
function computeFraming(camera, object, direction, distanceMultiplier = 1) {
  const box = measureNatural(object);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());

  const maxDim = Math.max(size.x, size.y, size.z);
  const fitDistance = maxDim / (2 * Math.tan((camera.fov * Math.PI) / 360));
  const distance = fitDistance * 1.7 * distanceMultiplier;

  return {
    cameraPos: center.clone().add(direction.clone().multiplyScalar(distance)),
    target: center,
    distance,
  };
}

// Instant version, used for the initial load and shape switches (an
// animated transition there would fight with the new model popping in).
function frameCameraToObject(camera, controls, object, direction, distanceMultiplier = 1) {
  const { cameraPos, target, distance } = computeFraming(camera, object, direction, distanceMultiplier);
  camera.position.copy(cameraPos);
  controls.target.copy(target);
  camera.near = distance / 100;
  camera.far = distance * 100;
  camera.updateProjectionMatrix();
  controls.update();
}
