import * as THREE from 'three';

/**
 * Procedural textures generated on a canvas at start-up — no image downloads.
 * Height fields are converted to tangent-space normal maps with a Sobel filter.
 */

function hash(x, y) {
    const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
    return s - Math.floor(s);
}

function valueNoise(x, y) {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

function heightToNormalTexture(height, size, strength) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');
    const img = ctx.createImageData(size, size);
    const at = (x, y) => height[((y + size) % size) * size + ((x + size) % size)];

    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const dx = (at(x + 1, y - 1) + 2 * at(x + 1, y) + at(x + 1, y + 1)) - (at(x - 1, y - 1) + 2 * at(x - 1, y) + at(x - 1, y + 1));
            const dy = (at(x - 1, y + 1) + 2 * at(x, y + 1) + at(x + 1, y + 1)) - (at(x - 1, y - 1) + 2 * at(x, y - 1) + at(x + 1, y - 1));
            let nx = -dx * strength, ny = dy * strength, nz = 1;
            const len = Math.hypot(nx, ny, nz);
            nx /= len; ny /= len; nz /= len;
            const i = (y * size + x) * 4;
            img.data[i] = (nx * 0.5 + 0.5) * 255;
            img.data[i + 1] = (ny * 0.5 + 0.5) * 255;
            img.data[i + 2] = (nz * 0.5 + 0.5) * 255;
            img.data[i + 3] = 255;
        }
    }
    ctx.putImageData(img, 0, 0);
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.colorSpace = THREE.NoColorSpace;
    tex.anisotropy = 4;
    return tex;
}

function leatherGrain(x, y) {
    return valueNoise(x * 0.35, y * 0.35) * 0.6 + valueNoise(x * 0.9, y * 0.9) * 0.4;
}

/** Diamond-tufted leather (back & headrest). */
export function createDiamondLeatherNormal(size = 512, cells = 4) {
    const h = new Float32Array(size * size);
    const cell = size / cells;
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const u = (x + y) / cell;
            const v = (x - y) / cell;
            const pu = Math.abs(Math.sin(Math.PI * u));
            const pv = Math.abs(Math.sin(Math.PI * v));
            const pillow = Math.pow(pu * pv, 0.35);
            h[y * size + x] = pillow * 4.2 + leatherGrain(x, y) * 0.35;
        }
    }
    return heightToNormalTexture(h, size, 0.9);
}

/** Vertical channel stitching (seat & arm pads). */
export function createChannelLeatherNormal(size = 512, channels = 6) {
    const h = new Float32Array(size * size);
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const c = Math.abs(Math.sin((Math.PI * x * channels) / size));
            h[y * size + x] = Math.pow(c, 0.3) * 3.2 + leatherGrain(x, y) * 0.35;
        }
    }
    return heightToNormalTexture(h, size, 0.9);
}

/** Fine ribbing for the chrome footrest plate. */
export function createRibNormal(size = 256, ribs = 18) {
    const h = new Float32Array(size * size);
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            h[y * size + x] = Math.pow(Math.abs(Math.sin((Math.PI * y * ribs) / size)), 0.6) * 2;
        }
    }
    return heightToNormalTexture(h, size, 1.2);
}

/** Brushed-metal roughness streaks for the gift card. */
export function createBrushedRoughness(size = 512) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#6e6e6e';
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 2600; i++) {
        const y = Math.random() * size;
        const g = 80 + Math.random() * 90;
        ctx.strokeStyle = `rgba(${g},${g},${g},${0.15 + Math.random() * 0.25})`;
        ctx.lineWidth = Math.random() * 1.4;
        ctx.beginPath();
        const x = Math.random() * size;
        ctx.moveTo(x - size * 0.6, y);
        ctx.lineTo(x + size * 0.6, y + (Math.random() - 0.5) * 2);
        ctx.stroke();
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    return tex;
}

/** Soft radial blob used for light pools and contact shadows. */
export function createRadialTexture(inner = 'rgba(255,255,255,1)', outer = 'rgba(255,255,255,0)', size = 256) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, inner);
    g.addColorStop(1, outer);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
}
