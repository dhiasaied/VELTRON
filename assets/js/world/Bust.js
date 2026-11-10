import * as THREE from 'three';

/**
 * Lookbook portraits (reel 14s–16s "See the back before you sit").
 * The reel uses photographs; we have none, so each cut is rendered from a sculpted
 * barber-mannequin bust with procedural hair: a tinted scalp shell for coverage plus
 * tens of thousands of line strands whose length, direction and curl follow the cut.
 * Front and back views are rendered once into image blobs.
 */

const smooth = THREE.MathUtils.smoothstep;
const gauss = (dx, dy, sx, sy) => Math.exp(-((dx * dx) / (sx * sx) + (dy * dy) / (sy * sy)));

/** Unit-sphere point → mannequin head surface. */
function deform(v) {
    let { x, y, z } = v;
    // Proportions: taller than wide, deeper front-to-back.
    x *= 0.9; y *= 1.16; z *= 1.04;
    // Jaw and chin: narrow towards the bottom, chin forward.
    const low = smooth(-y, 0.15, 1.1);
    x *= 1 - low * 0.3;
    if (z > 0) z *= 1 + low * 0.12;
    // Back of skull.
    if (z < 0 && y > -0.2) z *= 1.08;
    if (z > 0) {
        const fx = x, fy = y;
        z += 0.06 * gauss(fx, fy + 0.08, 0.16, 0.26); // soft nose
        z += 0.035 * gauss(fx, fy - 0.18, 0.55, 0.1);   // brow
        z += 0.025 * (gauss(fx - 0.42, fy + 0.12, 0.16, 0.18) + gauss(fx + 0.42, fy + 0.12, 0.16, 0.18)); // cheekbones
    }
    return new THREE.Vector3(x, y, z);
}

function createHeadGeometry() {
    const geo = new THREE.SphereGeometry(1, 128, 96);
    const pos = geo.attributes.position;
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos, i);
        const d = deform(v);
        pos.setXYZ(i, d.x, d.y, d.z);
    }
    geo.computeVertexNormals();
    return geo;
}

/** Hairline: is this unit-sphere direction on the scalp? */
function scalp(v) {
    const { x, y, z } = v;
    if (z > 0.55) return y > 0.48 - Math.abs(x) * 0.25;           // forehead
    if (z > 0) return y > 0.18 - z * 0.1 && !(Math.abs(x) > 0.75 && y < 0.3);  // temples, around the ears
    return y > -0.62 + Math.abs(x) * 0.15;                         // back, down to the nape
}

/**
 * Cut definitions: per scalp direction return {len, density, comb: [x,y,z], curl}.
 * `side` is how far down the side/back we are (0 at the crown, 1 at the hairline).
 */
const STYLES = {
    fadePart(v, side) {
        const top = v.y > 0.42 && !(v.x > 0.28 && v.x < 0.36 && v.z > -0.2);
        if (top) return { len: 0.2, density: 1, comb: [-0.9, 0.15, 0.25], curl: 0.02 };
        const fade = smooth(1 - side, 0.15, 0.85);
        return { len: 0.012 + fade * 0.04, density: fade, comb: [0, -1, 0], curl: 0 };
    },
    curlTaper(v, side) {
        if (v.y > 0.25) return { len: 0.24, density: 1, comb: [0, 0.6, 0.3], curl: 0.09 };
        const taper = smooth(1 - side, 0.05, 0.6);
        return { len: 0.03 + taper * 0.09, density: 0.4 + taper * 0.6, comb: [0, -0.6, 0], curl: 0.05 };
    },
    frenchCrop(v, side) {
        if (v.y > 0.38) return { len: v.z > 0.5 ? 0.16 : 0.13, density: 1, comb: [0, -0.2, 1], curl: 0.03, blunt: v.z > 0.55 };
        const fade = smooth(1 - side, 0.2, 0.8);
        return { len: 0.015 + fade * 0.05, density: fade * 0.9 + 0.1, comb: [0, -1, 0], curl: 0 };
    },
    buzz() {
        return { len: 0.022, density: 1, comb: [0, -0.3, 0.2], curl: 0 };
    },
    quiff(v, side) {
        if (v.y > 0.38) return { len: v.z > 0.3 ? 0.32 : 0.2, density: 1, comb: v.z > 0.3 ? [0, 1, -0.4] : [0, 0.3, -1], curl: 0.04 };
        const fade = smooth(1 - side, 0.1, 0.7);
        return { len: 0.015 + fade * 0.05, density: 0.3 + fade * 0.7, comb: [0, -1, 0], curl: 0 };
    },
    slick(v, side) {
        if (v.y > 0.3) return { len: 0.24, density: 1, comb: [0, 0.15, -1], curl: 0.01 };
        const taper = smooth(1 - side, 0.1, 0.7);
        return { len: 0.02 + taper * 0.07, density: 0.4 + taper * 0.6, comb: [0, -0.5, -0.6], curl: 0 };
    },
};

function randomOnSphere(out) {
    const u = Math.random() * 2 - 1;
    const a = Math.random() * Math.PI * 2;
    const s = Math.sqrt(1 - u * u);
    return out.set(s * Math.cos(a), u, s * Math.sin(a));
}

/** Builds the hair for one style: a scalp shell (vertex alpha) + line strands. */
function createHair(styleName, headGeo, strandCount) {
    const style = STYLES[styleName] ?? STYLES.buzz;
    const group = new THREE.Group();
    const hairColor = new THREE.Color('#070605');

    // Shell: head surface pushed out slightly, alpha = density of the cut there.
    const shell = headGeo.clone();
    const pos = shell.attributes.position;
    const colors = new Float32Array(pos.count * 4);
    const unit = new THREE.Vector3();
    const tmp = new THREE.Vector3();
    const base = new THREE.SphereGeometry(1, 128, 96).attributes.position;
    for (let i = 0; i < pos.count; i++) {
        unit.fromBufferAttribute(base, i);
        const side = smooth(0.45 - unit.y, 0, 1.1);
        const h = scalp(unit) ? style(unit, side) : null;
        const lift = h ? 1 + Math.min(h.len, 0.2) * 0.18 : 1.001;
        tmp.fromBufferAttribute(pos, i).multiplyScalar(lift);
        pos.setXYZ(i, tmp.x, tmp.y, tmp.z);
        colors.set([hairColor.r, hairColor.g, hairColor.b, h ? Math.min(1, h.density * 0.95) : 0], i * 4);
    }
    shell.setAttribute('color', new THREE.BufferAttribute(colors, 4));
    shell.computeVertexNormals();
    group.add(new THREE.Mesh(shell, new THREE.MeshStandardMaterial({ vertexColors: true, transparent: true, roughness: 0.92, metalness: 0, depthWrite: false })));

    // Strands.
    const SEG = 3;
    const verts = [];
    const cols = [];
    const n = new THREE.Vector3();
    const comb = new THREE.Vector3();
    const p = new THREE.Vector3();
    const prev = new THREE.Vector3();
    for (let i = 0; i < strandCount; i++) {
        randomOnSphere(unit);
        if (!scalp(unit)) continue;
        const side = smooth(0.45 - unit.y, 0, 1.1);
        const h = style(unit, side);
        if (Math.random() > h.density) continue;
        const root = deform(unit);
        n.copy(root).normalize();
        comb.set(...h.comb).normalize();
        const len = h.len * (0.75 + Math.random() * 0.5);
        p.copy(root).addScaledVector(n, 0.004);
        const shade = Math.random() < 0.06 ? 0.14 + Math.random() * 0.08 : 0.015 + Math.random() * 0.045;
        const phase = Math.random() * Math.PI * 2;
        for (let s = 1; s <= SEG; s++) {
            prev.copy(p);
            const f = s / SEG;
            // Start along the normal, bend towards the comb direction, curl around it.
            const dir = new THREE.Vector3().copy(n).multiplyScalar(1 - f * 0.85).addScaledVector(comb, f * 1.1);
            if (h.curl) dir.add(new THREE.Vector3(Math.cos(phase + f * 7), Math.sin(phase + f * 7), Math.cos(phase - f * 5)).multiplyScalar(h.curl * 6));
            dir.normalize().multiplyScalar(len / SEG);
            p.add(dir);
            // Keep strands outside the skull.
            const rootR = deform(tmp.copy(p).normalize()).length();
            if (p.length() < rootR + 0.004) p.setLength(rootR + 0.004);
            if (h.blunt && s === SEG) p.y = Math.max(p.y, root.y - 0.02);
            verts.push(prev.x, prev.y, prev.z, p.x, p.y, p.z);
            const c = shade + f * 0.05;
            cols.push(c, c * 0.95, c * 0.9, c, c * 0.95, c * 0.9);
        }
    }
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    lineGeo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    group.add(new THREE.LineSegments(lineGeo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.9 })));
    return group;
}

/** Head, ears, neck and a black tee — the mannequin. */
function createBody(skin, tee, headGeo) {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(headGeo, skin));
    for (const s of [-1, 1]) {
        const ear = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 24), skin);
        ear.scale.set(0.07, 0.24, 0.16);
        ear.position.set(s * 0.84, 0.0, -0.05);
        ear.rotation.y = s * 0.3;
        g.add(ear);
    }
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.56, 1.0, 48), skin);
    neck.position.set(0, -1.25, -0.12);
    g.add(neck);
    const torso = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 48, 0, Math.PI * 2, 0, Math.PI * 0.55), tee);
    torso.scale.set(2.4, 1.55, 1.1);
    torso.position.set(0, -3.05, -0.15);
    g.add(torso);
    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.05, 12, 48), tee);
    collar.rotation.x = Math.PI / 2 - 0.2;
    collar.position.set(0, -1.6, -0.05);
    g.add(collar);
    return g;
}

/**
 * Renders busts to image URLs with its own small renderer (disposed afterwards), so the
 * main scene is unaffected. Calls are queued and spread over frames.
 */
export class BustRenderer {
    constructor({ width = 600, height = 750, strands = 70000 } = {}) {
        this.width = width;
        this.height = height;
        this.strands = strands;
        this.canvas = document.createElement('canvas');
        this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: false, preserveDrawingBuffer: true });
        this.renderer.setPixelRatio(1);
        this.renderer.setSize(width, height, false);
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.1;

        this.scene = new THREE.Scene();
        this.scene.background = this.makeBackdrop();
        this.camera = new THREE.PerspectiveCamera(24, width / height, 0.1, 50);

        this.headGeo = createHeadGeometry();
        this.skin = new THREE.MeshPhysicalMaterial({ color: '#b8b3aa', roughness: 0.5, sheen: 0.3, sheenColor: new THREE.Color('#ffffff'), sheenRoughness: 0.5 });
        this.tee = new THREE.MeshStandardMaterial({ color: '#0c0c0d', roughness: 0.9 });
        this.body = createBody(this.skin, this.tee, this.headGeo);
        this.scene.add(this.body);

        // Studio: hard key from above-front, two rims, faint fill.
        const key = new THREE.SpotLight('#ffffff', 220, 0, 0.5, 0.6, 2);
        key.position.set(0.6, 6, 4.5);
        key.target.position.set(0, 0, 0);
        this.scene.add(key, key.target);
        this.key = key;
        const rimL = new THREE.DirectionalLight('#ffffff', 2.4);
        rimL.position.set(-5, 2, -4);
        const rimR = new THREE.DirectionalLight('#ffffff', 1.6);
        rimR.position.set(5, 1, -4);
        const fill = new THREE.DirectionalLight('#ffffff', 0.9);
        fill.position.set(0, 0.5, 6);
        this.fill = fill;
        this.scene.add(rimL, rimR, fill, new THREE.HemisphereLight('#ffffff', '#202020', 0.7));
        this.rims = [rimL, rimR];
    }

    makeBackdrop() {
        const c = document.createElement('canvas');
        c.width = 64; c.height = 80;
        const ctx = c.getContext('2d');
        const g = ctx.createRadialGradient(32, 18, 2, 32, 30, 70);
        g.addColorStop(0, '#2c2c2f');
        g.addColorStop(0.55, '#111113');
        g.addColorStop(1, '#070708');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 64, 80);
        const t = new THREE.CanvasTexture(c);
        t.colorSpace = THREE.SRGBColorSpace;
        return t;
    }

    /** @param view 'front' | 'back' | 'three-quarter' */
    async render(style, view) {
        if (this.hair) {
            this.scene.remove(this.hair);
            this.hair.traverse((o) => { o.geometry?.dispose(); o.material?.dispose(); });
        }
        if (this.hairStyle !== style) {
            this.hairStyle = style;
        }
        this.hair = createHair(style, this.headGeo, this.strands);
        this.scene.add(this.hair);

        const angle = view === 'back' ? Math.PI : view === 'three-quarter' ? 0.55 : 0.12;
        const d = view === 'three-quarter' ? 12.5 : 9.8;
        this.camera.position.set(Math.sin(angle) * d, 0.35, Math.cos(angle) * d);
        this.camera.lookAt(0, -0.35, 0);
        // Keep the key light on the camera's side.
        this.key.position.set(Math.sin(angle) * 3 + 0.6, 6, Math.cos(angle) * 4.5);
        this.fill.position.set(Math.sin(angle) * 6, 0.5, Math.cos(angle) * 6);
        this.rims.forEach((r, i) => r.position.set((i ? 5 : -5) * Math.cos(angle), 2, -4 * Math.cos(angle) + (i ? 1 : -1) * Math.sin(angle) * 4));

        this.renderer.render(this.scene, this.camera);
        const blob = await new Promise((r) => this.canvas.toBlob(r, 'image/webp', 0.86));
        return blob ? URL.createObjectURL(blob) : this.canvas.toDataURL('image/jpeg', 0.86);
    }

    dispose() {
        this.scene.traverse((o) => { o.geometry?.dispose(); if (o.material && !Array.isArray(o.material)) o.material.dispose(); });
        this.renderer.dispose();
        this.renderer.forceContextLoss();
    }
}
