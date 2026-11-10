import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/**
 * Procedural barber tools and shelf products, shared by the cursor-follow tool on the
 * price list, the manifesto objects and the 3D product shelf.
 * Every builder returns a Group normalised so its largest dimension is 2 units and
 * centred on the origin. Some expose `userData.animate(time)` for idle motion.
 */

const lathe = (pts, mat, seg = 56) => new THREE.Mesh(new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), seg), mat);
const mesh = (geo, mat, pos = [0, 0, 0], rot = [0, 0, 0]) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(...pos);
    m.rotation.set(...rot);
    return m;
};

function clipper(m) {
    const g = new THREE.Group();
    const body = mesh(new THREE.CapsuleGeometry(0.34, 1.3, 12, 40), m.chrome);
    body.scale.set(1, 1, 0.74);
    g.add(body);
    const grip = mesh(new THREE.CylinderGeometry(0.348, 0.33, 0.62, 48, 1, true), m.satinBlack, [0, -0.32, 0]);
    grip.scale.set(1, 1, 0.74);
    g.add(grip);
    const ring = mesh(new THREE.TorusGeometry(0.343, 0.022, 10, 48), m.gold, [0, 0.02, 0], [Math.PI / 2, 0, 0]);
    ring.scale.set(1, 0.74, 1);
    g.add(ring);
    g.add(mesh(new RoundedBoxGeometry(0.68, 0.16, 0.36, 3, 0.04), m.satinBlack, [0, 1.06, 0]));
    const teeth = [];
    for (let i = 0; i < 17; i++) teeth.push(new THREE.BoxGeometry(0.022, 0.14, 0.05).translate(-0.3 + i * 0.0375, 1.19, 0.08));
    g.add(new THREE.Mesh(mergeGeometries(teeth), m.steel));
    g.add(mesh(new RoundedBoxGeometry(0.08, 0.32, 0.06, 2, 0.02), m.chrome, [0.37, 0.7, 0]));
    g.add(mesh(new RoundedBoxGeometry(0.15, 0.22, 0.06, 2, 0.025), m.satinBlack, [0, 0.42, 0.25]));
    // Cord stub.
    g.add(mesh(new THREE.CylinderGeometry(0.07, 0.05, 0.3, 16), m.rubber, [0, -1.08, 0]));
    return g;
}

function trimmer(m) {
    const g = new THREE.Group();
    const body = lathe([[0, -1], [0.2, -1], [0.24, -0.9], [0.26, 0.5], [0.22, 0.8], [0, 0.82]], m.satinBlack);
    body.scale.z = 0.8;
    g.add(body);
    g.add(mesh(new THREE.CylinderGeometry(0.262, 0.262, 0.08, 40), m.chrome, [0, -0.2, 0]));
    g.add(mesh(new RoundedBoxGeometry(0.46, 0.12, 0.2, 3, 0.03), m.chrome, [0, 0.86, 0]));
    const teeth = [];
    for (let i = 0; i < 13; i++) teeth.push(new THREE.BoxGeometry(0.018, 0.1, 0.04).translate(-0.2 + i * 0.033, 0.96, 0.05));
    g.add(new THREE.Mesh(mergeGeometries(teeth), m.steel));
    g.add(mesh(new RoundedBoxGeometry(0.1, 0.18, 0.05, 2, 0.02), m.chrome, [0, 0.3, 0.2]));
    return g;
}

function scissors(m) {
    const g = new THREE.Group();
    const halves = [];
    for (const s of [-1, 1]) {
        const half = new THREE.Group();
        const shape = new THREE.Shape();
        shape.moveTo(0, -0.07);
        shape.lineTo(1.6, -0.01);
        shape.lineTo(1.6, 0.02);
        shape.quadraticCurveTo(0.8, 0.12, 0, 0.09);
        half.add(new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.03, bevelEnabled: true, bevelSize: 0.01, bevelThickness: 0.008, bevelSegments: 1 }), m.chrome));
        half.add(mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.55, 12), m.chrome, [-0.27, -s * 0.07, 0.015], [0, 0, Math.PI / 2 + s * 0.25]));
        half.add(mesh(new THREE.TorusGeometry(0.2, 0.045, 12, 36), m.chrome, [-0.68, -s * 0.2, 0.015]));
        half.position.z = s * 0.025;
        halves.push([half, s]);
        g.add(half);
    }
    g.add(mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.12, 20), m.gold, [0, 0, 0], [Math.PI / 2, 0, 0]));
    // Snip: blades open and close.
    g.userData.animate = (t) => {
        const open = 0.06 + Math.max(0, Math.sin(t * 4.2)) * 0.22;
        halves.forEach(([h, s]) => { h.rotation.z = s * open; });
    };
    return g;
}

function razor(m) {
    const g = new THREE.Group();
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.lineTo(1.5, 0.02);
    shape.quadraticCurveTo(1.72, 0.04, 1.7, 0.24);
    shape.lineTo(1.66, 0.36);
    shape.lineTo(0.1, 0.3);
    shape.quadraticCurveTo(-0.05, 0.28, 0, 0);
    const blade = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.03, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.01, bevelSegments: 2 }), m.steel);
    blade.position.set(0.05, -0.18, -0.015);
    g.add(blade);
    const handle = mesh(new RoundedBoxGeometry(1.9, 0.3, 0.12, 4, 0.06), m.satinBlack, [-0.9, 0, 0], [0, 0, -0.18]);
    g.add(handle);
    g.add(mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.16, 20), m.chrome, [0, 0, 0], [Math.PI / 2, 0, 0]));
    return g;
}

function brush(m) {
    const g = new THREE.Group();
    g.add(lathe([[0, -1], [0.26, -1], [0.3, -0.94], [0.22, -0.6], [0.2, -0.2], [0.26, 0.02], [0.3, 0.06], [0, 0.06]], m.satinBlack));
    g.add(mesh(new THREE.TorusGeometry(0.27, 0.025, 10, 40), m.chrome, [0, 0.04, 0], [Math.PI / 2, 0, 0]));
    // Bristle knot: a soft dome made of a displaced sphere.
    const knot = new THREE.SphereGeometry(0.42, 48, 32, 0, Math.PI * 2, 0, Math.PI * 0.62);
    const pos = knot.attributes.position;
    for (let i = 0; i < pos.count; i++) {
        const y = pos.getY(i);
        const n = 1 + (Math.sin(pos.getX(i) * 60) * Math.cos(pos.getZ(i) * 55)) * 0.025;
        pos.setXYZ(i, pos.getX(i) * n * (0.75 + y * 0.6), y * 1.25, pos.getZ(i) * n * (0.75 + y * 0.6));
    }
    knot.computeVertexNormals();
    g.add(mesh(knot, m.bristle, [0, 0.12, 0]));
    return g;
}

function towel(m) {
    const g = new THREE.Group();
    // Rolled hot towel: a spiral of cloth seen from the side.
    const spiral = new THREE.Shape();
    const turns = 3.2;
    for (let i = 0; i <= 120; i++) {
        const a = (i / 120) * Math.PI * 2 * turns;
        const r = 0.12 + (i / 120) * 0.42;
        const x = Math.cos(a) * r, y = Math.sin(a) * r;
        i ? spiral.lineTo(x, y) : spiral.moveTo(x, y);
    }
    for (let i = 120; i >= 0; i--) {
        const a = (i / 120) * Math.PI * 2 * turns;
        const r = 0.1 + (i / 120) * 0.42;
        spiral.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    const roll = new THREE.Mesh(new THREE.ExtrudeGeometry(spiral, { depth: 1.6, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 2, curveSegments: 4 }), m.towel);
    roll.position.z = -0.8;
    g.add(roll);
    g.add(mesh(new THREE.CylinderGeometry(0.47, 0.47, 1.62, 48, 1, true), m.towel, [0, 0, 0], [Math.PI / 2, 0, 0]));
    // Steam wisps.
    const steam = new THREE.Group();
    for (let i = 0; i < 3; i++) {
        const pts = [];
        for (let k = 0; k < 8; k++) pts.push(new THREE.Vector3(Math.sin(k * 0.9 + i) * 0.08, 0.55 + k * 0.12, (i - 1) * 0.45));
        steam.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.012, 6), m.steam));
    }
    g.add(steam);
    g.userData.animate = (t) => { steam.position.y = (t * 0.25) % 0.25; m.steam.opacity = 0.25 + Math.sin(t * 2) * 0.08; };
    return g;
}

function alarmClock(m) {
    const g = new THREE.Group();
    g.add(mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.36, 64), m.chrome, [0, 0, 0], [Math.PI / 2, 0, 0]));
    g.add(mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.37, 64), m.clockFace, [0, 0, 0.005], [Math.PI / 2, 0, 0]));
    const ticks = [];
    for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        ticks.push(new THREE.BoxGeometry(0.03, i % 3 ? 0.08 : 0.14, 0.01).rotateZ(-a).translate(Math.sin(a) * 0.58, Math.cos(a) * 0.58, 0.19));
    }
    g.add(new THREE.Mesh(mergeGeometries(ticks), m.satinBlack));
    const hourHand = mesh(new THREE.BoxGeometry(0.04, 0.34, 0.01).translate(0, 0.15, 0), m.satinBlack, [0, 0, 0.2]);
    const minHand = mesh(new THREE.BoxGeometry(0.03, 0.5, 0.01).translate(0, 0.22, 0), m.satinBlack, [0, 0, 0.205]);
    g.add(hourHand, minHand);
    for (const s of [-1, 1]) {
        g.add(mesh(new THREE.SphereGeometry(0.3, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), m.chrome, [s * 0.5, 0.78, 0], [0, 0, -s * 0.55]));
        g.add(mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.4, 12), m.chrome, [s * 0.5, -0.82, 0], [0, 0, s * 0.5]));
    }
    g.add(mesh(new THREE.TorusGeometry(0.2, 0.03, 8, 24, Math.PI), m.chrome, [0, 0.86, 0]));
    // Hands move: 2:40 → it's the time on the chair.
    g.userData.animate = (t) => {
        minHand.rotation.z = -((40 + t * 4) / 60) * Math.PI * 2;
        hourHand.rotation.z = -((2 + (40 + t * 4) / 60) / 12) * Math.PI * 2;
    };
    return g;
}

function pomade(m) {
    const g = new THREE.Group();
    g.add(mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.5, 64), m.satinBlack, [0, -0.2, 0]));
    g.add(mesh(new THREE.CylinderGeometry(0.94, 0.94, 0.32, 64), m.chrome, [0, 0.22, 0]));
    g.add(mesh(new THREE.TorusGeometry(0.93, 0.02, 8, 64), m.chrome, [0, 0.06, 0], [Math.PI / 2, 0, 0]));
    g.add(mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.01, 48), m.label, [0, 0.385, 0]));
    return g;
}

function spray(m) {
    const g = new THREE.Group();
    g.add(lathe([[0, -1.0], [0.42, -1.0], [0.46, -0.96], [0.46, 0.35], [0.4, 0.5], [0.22, 0.62], [0.16, 0.66], [0.16, 0.78], [0, 0.78]], m.satinBlack));
    g.add(mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.16, 32), m.chrome, [0, 0.84, 0]));
    g.add(mesh(new RoundedBoxGeometry(0.34, 0.28, 0.6, 3, 0.08), m.satinBlack, [0, 1.04, 0.12]));
    g.add(mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.14, 16), m.chrome, [0, 1.06, 0.48], [Math.PI / 2, 0, 0]));
    g.add(mesh(new RoundedBoxGeometry(0.12, 0.42, 0.1, 2, 0.04), m.satinBlack, [0, 0.78, 0.36], [0.35, 0, 0]));
    g.add(mesh(new THREE.CylinderGeometry(0.465, 0.465, 0.5, 48, 1, true, -0.9, 1.8), m.chrome, [0, -0.3, 0]));
    return g;
}

function oil(m) {
    const g = new THREE.Group();
    g.add(lathe([[0, -1], [0.42, -1], [0.45, -0.96], [0.45, 0.2], [0.36, 0.34], [0.16, 0.42], [0.15, 0.52], [0, 0.52]], m.amberGlass));
    g.add(lathe([[0, -0.92], [0.4, -0.92], [0.4, 0.14], [0, 0.18]], m.oil));
    g.add(mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.24, 32), m.satinBlack, [0, 0.62, 0]));
    g.add(lathe([[0, 0.74], [0.13, 0.74], [0.15, 0.9], [0.12, 1.08], [0, 1.12]], m.rubber));
    g.add(mesh(new THREE.CylinderGeometry(0.455, 0.455, 0.6, 48, 1, true), m.label, [0, -0.4, 0]));
    return g;
}

function tonic(m) {
    const g = new THREE.Group();
    g.add(lathe([[0, -1], [0.36, -1], [0.38, -0.96], [0.38, 0.45], [0.3, 0.6], [0.12, 0.68], [0.11, 0.8], [0, 0.8]], m.clearGlass));
    g.add(lathe([[0, -0.95], [0.34, -0.95], [0.34, 0.3], [0, 0.32]], m.tonicLiquid));
    g.add(mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.26, 32), m.chrome, [0, 0.92, 0]));
    g.add(mesh(new THREE.CylinderGeometry(0.385, 0.385, 0.7, 48, 1, true, -1, 2), m.label, [0, -0.3, 0]));
    return g;
}

function comb(m) {
    const parts = [new RoundedBoxGeometry(2.2, 0.26, 0.07, 3, 0.03).translate(0, 0.2, 0)];
    for (let i = 0; i < 36; i++) {
        const fine = i > 15;
        const len = fine ? 0.42 : 0.5;
        parts.push(new RoundedBoxGeometry(fine ? 0.028 : 0.04, len, 0.06, 1, 0.01).translate(-1.02 + i * 0.058, 0.07 - len / 2, 0));
    }
    const g = new THREE.Group();
    g.add(new THREE.Mesh(mergeGeometries(parts), m.tortoise));
    g.add(mesh(new RoundedBoxGeometry(2.24, 0.08, 0.09, 2, 0.03), m.chrome, [0, 0.33, 0]));
    return g;
}

const BUILDERS = { clipper, trimmer, scissors, razor, brush, towel, clock: alarmClock, pomade, spray, oil, tonic, comb };

export function buildModel(name, materials) {
    const build = BUILDERS[name];
    if (!build) throw new Error(`Unknown model "${name}"`);
    const inner = build(materials);
    const box = new THREE.Box3().setFromObject(inner);
    const size = box.getSize(new THREE.Vector3());
    const centre = box.getCenter(new THREE.Vector3());
    inner.position.sub(centre);
    const wrapper = new THREE.Group();
    wrapper.add(inner);
    wrapper.scale.setScalar(2 / Math.max(size.x, size.y, size.z));
    wrapper.userData.animate = inner.userData.animate;
    wrapper.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } });
    return wrapper;
}

/** Extra materials the tools need on top of materials.js. */
export function extendMaterials(m) {
    m.bristle ??= new THREE.MeshStandardMaterial({ color: '#d9d3c7', roughness: 0.95 });
    m.towel ??= new THREE.MeshStandardMaterial({ color: '#f1efe9', roughness: 1 });
    m.steam ??= new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.3, depthWrite: false });
    m.clockFace ??= new THREE.MeshStandardMaterial({ color: '#f4f2ec', roughness: 0.5 });
    m.label ??= new THREE.MeshStandardMaterial({ color: '#e9e5dc', roughness: 0.7 });
    m.amberGlass ??= new THREE.MeshPhysicalMaterial({ color: '#7a3d0c', roughness: 0.08, metalness: 0, clearcoat: 1, transparent: true, opacity: 0.55 });
    m.oil ??= new THREE.MeshStandardMaterial({ color: '#4a2205', roughness: 0.2 });
    m.clearGlass ??= new THREE.MeshPhysicalMaterial({ color: '#cfd6d4', roughness: 0.05, clearcoat: 1, transparent: true, opacity: 0.35 });
    m.tonicLiquid ??= new THREE.MeshStandardMaterial({ color: '#9fb39a', roughness: 0.25, transparent: true, opacity: 0.8 });
    return m;
}
