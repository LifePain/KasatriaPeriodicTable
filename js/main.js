/**
 * main.js (ES module)
 * Three.js CSS3D visualization — adapted from the official
 * css3d_periodictable example. Four layouts: Table (20×10),
 * Sphere, double Helix, and Grid (5×4×10).
 */

import * as THREE from "three";
import TWEEN from "three/addons/libs/tween.module.js";
import { TrackballControls } from "three/addons/controls/TrackballControls.js";
import { CSS3DRenderer, CSS3DObject } from "three/addons/renderers/CSS3DRenderer.js";
import { fetchPeople } from "./data.js";

let camera, scene, renderer, controls;

const objects = [];                                  // CSS3DObjects (one per person)
const targets = { table: [], sphere: [], helix: [], grid: [], tetrahedron: [] };

const loader = document.getElementById("loader");
const errorBanner = document.getElementById("error-banner");
const errorMessage = document.getElementById("error-message");

/* ------------------------------------------------------------------ */
/* Boot: wait for auth, then fetch + build                             */
/* ------------------------------------------------------------------ */

window.addEventListener("app:authenticated", boot);
document.getElementById("retry-btn").addEventListener("click", boot);

async function boot() {
  errorBanner.hidden = true;
  loader.hidden = false;
  try {
    const people = await fetchPeople();
    loader.hidden = true;
    init(people);
    animate();
  } catch (err) {
    loader.hidden = true;
    errorMessage.textContent = err.message;
    errorBanner.hidden = false;
  }
}

/* ------------------------------------------------------------------ */
/* Tile factory                                                        */
/* ------------------------------------------------------------------ */

/**
 * Builds one tile per Image B:
 *   country (top-left) | rank (top-right)
 *   photo (center)
 *   name + interest (bottom)
 * Tier class (red/orange/green) drives background + border color in CSS.
 */
function createTile(person) {
  const el = document.createElement("div");
  el.className = `element tier-${person.tier}`;

  const country = document.createElement("div");
  country.className = "country";
  country.textContent = person.country;
  el.appendChild(country);

  const rank = document.createElement("div");
  rank.className = "rank";
  rank.textContent = person.rank;
  el.appendChild(rank);

  const photo = document.createElement("img");
  photo.className = "photo";
  photo.src = person.photo;
  photo.alt = person.name;
  photo.loading = "lazy";
  photo.draggable = false;
  // Graceful fallback if an image URL is broken
  photo.addEventListener("error", () => photo.classList.add("broken"));
  el.appendChild(photo);

  const name = document.createElement("div");
  name.className = "name";
  name.textContent = person.name;
  el.appendChild(name);

  const interest = document.createElement("div");
  interest.className = "interest";
  interest.textContent = person.interest;
  el.appendChild(interest);

  return el;
}

/* ------------------------------------------------------------------ */
/* Scene init + layout target computation                              */
/* ------------------------------------------------------------------ */

function init(people) {
  const n = people.length; // 200 with the provided dataset

  camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 1, 10000);
  camera.position.z = 3000;

  scene = new THREE.Scene();

  // ---- Create one CSS3DObject per person (random scatter start) ----
  for (const person of people) {
    const object = new CSS3DObject(createTile(person));
    object.position.x = Math.random() * 4000 - 2000;
    object.position.y = Math.random() * 4000 - 2000;
    object.position.z = Math.random() * 4000 - 2000;
    scene.add(object);
    objects.push(object);
  }

  /* ---------------- TABLE: 20 columns × 10 rows ----------------
   * col = i % 20, row = floor(i / 20)
   * Tile pitch: 140px horizontally, 180px vertically (tile is 120×160
   * plus breathing room). Centering offsets:
   *   x: (20-1)/2 * 140 = 1330   y: (10-1)/2 * 180 = 810
   */
  for (let i = 0; i < n; i++) {
    const target = new THREE.Object3D();
    target.position.x = (i % 20) * 140 - 1330;
    target.position.y = -Math.floor(i / 20) * 180 + 810;
    targets.table.push(target);
  }

  /* ---------------- SPHERE (default demo math) ----------------
   * Distribute points evenly with the "golden spiral" method:
   *   phi   = arccos(-1 + 2i/n)   -> polar angle, evenly spaced in cos
   *   theta = sqrt(n * PI) * phi  -> azimuth, spreads points spirally
   * Each tile then looks outward from the sphere center.
   */
  const sphereVector = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    const phi = Math.acos(-1 + (2 * i) / n);
    const theta = Math.sqrt(n * Math.PI) * phi;
    const target = new THREE.Object3D();
    target.position.setFromSphericalCoords(800, phi, theta);
    sphereVector.copy(target.position).multiplyScalar(2);
    target.lookAt(sphereVector);
    targets.sphere.push(target);
  }

  /* ---------------- DOUBLE HELIX ----------------
   * Two interleaved strands like DNA:
   *   strand = i % 2          -> alternate tiles between strands
   *   idx    = floor(i / 2)   -> position along the strand (0..99)
   *   theta  = idx * 0.30 + strand * PI
   *            (same angular step for both strands; the second strand
   *             is rotated 180° so it sits opposite the first)
   *   y      = -idx * 14 + 700  -> descend 14px per step, centered
   * setFromCylindricalCoords(radius, theta, y) places the tile on a
   * cylinder of radius 800; lookAt a point directly outward (x,z
   * doubled, same y) keeps tiles tangent to the cylinder.
   */
  const helixVector = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    const strand = i % 2;
    const idx = Math.floor(i / 2);
    const theta = idx * 0.55 + strand * Math.PI;
    const y = -idx * 20 + 700;

    const target = new THREE.Object3D();
    target.position.setFromCylindricalCoords(800, theta, y);
    helixVector.set(target.position.x * 2, target.position.y, target.position.z * 2);
    target.lookAt(helixVector);
    targets.helix.push(target);
  }

  /* ---------------- GRID: 5 × 4 × 10 (x × y × z) ----------------
   * Index decomposition (5 per row, 20 per "slab", 10 slabs deep):
   *   x = i % 5                  -> 0..4   (5 across)
   *   y = floor(i / 5) % 4       -> 0..3   (4 down)
   *   z = floor(i / 20)          -> 0..9   (10 deep)
   * 5 × 4 × 10 = 200 = exactly the dataset size.
   * Spacing 400 (x), 400 (y), 600 (z); offsets center each axis:
   *   x: (5-1)/2*400 = 800, y: (4-1)/2*400 = 600, z: (10-1)/2*600 = 2700
   */
  for (let i = 0; i < n; i++) {
    const target = new THREE.Object3D();
    target.position.x = (i % 5) * 400 - 800;
    target.position.y = -(Math.floor(i / 5) % 4) * 400 + 600;
    target.position.z = -Math.floor(i / 20) * 600 + 2700;
    targets.grid.push(target);
  }

  /* ---------------- TETRAHEDRON: 4 faces × 50 tiles ----------------
 * A regular tetrahedron has vertices at alternating cube corners:
 * (1,1,1), (1,-1,-1), (-1,1,-1), (-1,-1,1) — scaled by R.
 * Each of the 4 faces is the triangle formed by leaving one vertex out.
 *
 * Tiles are placed on a face with BARYCENTRIC coordinates (u, v, w):
 *   P = u·A + v·B + w·C   where u + v + w = 1
 * We fill each face as a triangular grid of `rows` rows: row r holds
 * r+1 tiles, so `rows` rows hold rows(rows+1)/2 slots. rows=10 gives 55
 * slots for 50 tiles — the last row is simply left partially filled.
 * Tiles lookAt along the face's outward normal so they lie flat on it.
 */
  {
    const R = 1300 ; // circumradius — sized so faces fit ~50 tiles
    const V = [
      new THREE.Vector3(1, 1, 1).multiplyScalar(R / Math.sqrt(3)),
      new THREE.Vector3(1, -1, -1).multiplyScalar(R / Math.sqrt(3)),
      new THREE.Vector3(-1, 1, -1).multiplyScalar(R / Math.sqrt(3)),
      new THREE.Vector3(-1, -1, 1).multiplyScalar(R / Math.sqrt(3)),
    ];
    // Each face's corner indices, ordered so normals point outward
    const faces = [[0, 1, 2], [0, 3, 1], [0, 2, 3], [1, 3, 2]];

    const perFace = Math.ceil(n / faces.length); // 50
    const rows = 10;                             // 10·11/2 = 55 ≥ 50
    const inset = 0.12; // pull tiles slightly inward from face edges

    for (let i = 0; i < n; i++) {
      const face = faces[Math.floor(i / perFace)];
      const k = i % perFace;                     // index within this face

      // Convert k -> (row, col) in the triangular grid
      const row = Math.floor((-1 + Math.sqrt(1 + 8 * k)) / 2);
      const col = k - (row * (row + 1)) / 2;

      // Barycentric coords: rows sweep A->BC edge; col sweeps B->C
      let u = 1 - row / (rows - 1);
      let t = row === 0 ? 0 : col / row;
      let v = (1 - u) * (1 - t);
      let w = (1 - u) * t;

      // Inset from edges so tiles don't overlap face boundaries
      u = u * (1 - 3 * inset) + inset;
      v = v * (1 - 3 * inset) + inset;
      w = w * (1 - 3 * inset) + inset;

      const [A, B, C] = [V[face[0]], V[face[1]], V[face[2]]];
      const target = new THREE.Object3D();
      target.position
        .copy(A).multiplyScalar(u)
        .addScaledVector(B, v)
        .addScaledVector(C, w);

      // Face the tile outward along the face normal
      const normal = new THREE.Vector3()
        .subVectors(B, A).cross(new THREE.Vector3().subVectors(C, A))
        .normalize();
      target.lookAt(target.position.clone().add(normal));

      targets.tetrahedron.push(target);
    }
  }

  // ---- Renderer + controls ----
  renderer = new CSS3DRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.getElementById("container").appendChild(renderer.domElement);

  controls = new TrackballControls(camera, renderer.domElement);
  controls.minDistance = 500;
  controls.maxDistance = 6000;
  controls.addEventListener("change", render);

  // ---- Layout buttons ----
  for (const key of ["table", "sphere", "helix", "grid", "tetrahedron"]) {
    document.getElementById(key).addEventListener("click", () => {
      setActiveButton(key);
      transform(targets[key], 2000);
    });
  }

  window.addEventListener("resize", onWindowResize);

  setActiveButton("table");
  transform(targets.table, 2000);
}

/* ------------------------------------------------------------------ */
/* Transitions + render loop                                           */
/* ------------------------------------------------------------------ */

/**
 * Tween every object to its target position/rotation.
 * Durations are staggered (duration..2×duration) so tiles arrive in a
 * cascade rather than as one rigid block — same trick as the demo.
 */
function transform(layoutTargets, duration) {
  TWEEN.removeAll();

  for (let i = 0; i < objects.length; i++) {
    const object = objects[i];
    const target = layoutTargets[i];
    const d = Math.random() * duration + duration;

    new TWEEN.Tween(object.position)
      .to({ x: target.position.x, y: target.position.y, z: target.position.z }, d)
      .easing(TWEEN.Easing.Exponential.InOut)
      .start();

    new TWEEN.Tween(object.rotation)
      .to({ x: target.rotation.x, y: target.rotation.y, z: target.rotation.z }, d)
      .easing(TWEEN.Easing.Exponential.InOut)
      .start();
  }

  // One driver tween guarantees re-render for the whole duration window.
  new TWEEN.Tween({}).to({}, duration * 2).onUpdate(render).start();
}

function setActiveButton(id) {
  document.querySelectorAll("#menu button").forEach((b) =>
    b.classList.toggle("active", b.id === id)
  );
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  render();
}

function animate() {
  requestAnimationFrame(animate);
  TWEEN.update();
  controls.update();
}

function render() {
  renderer.render(scene, camera);
}
