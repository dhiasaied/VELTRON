import * as THREE from 'three';
import { gsap } from 'gsap';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { createBrushedRoughness, createRadialTexture } from './textures.js';

const CARD_RATIO = 1.586; // ISO card

function drawFace(amount) {
    const W = 1024, H = Math.round(1024 / CARD_RATIO);
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(16,16,18,0.92)';
    ctx.textBaseline = 'alphabetic';

    // Logo mark.
    ctx.strokeStyle = 'rgba(16,16,18,0.92)';
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(70, 118);
    ctx.bezierCurveTo(120, 118, 170, 104, 170, 84);
    ctx.bezierCurveTo(170, 60, 84, 66, 84, 44);
    ctx.stroke();
    ctx.font = '700 40px Sora, sans-serif';
    ctx.fillText('VELTRON', 196, 104);

    ctx.font = '500 22px "JetBrains Mono", monospace';
    ctx.fillText('GIFT CARD', W - 220, 104);

    ctx.font = '300 250px Sora, sans-serif';
    ctx.fillText(`$${amount}`, 62, 440);

    ctx.font = '500 24px "JetBrains Mono", monospace';
    ctx.fillStyle = 'rgba(16,16,18,0.6)';
    ctx.fillText('ANY CUT · ANY CHAIR · NEVER EXPIRES', 70, H - 66);

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    return tex;
}

function drawBack() {
    const W = 1024, H = Math.round(1024 / CARD_RATIO);
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const ctx = c.getContext('2d');
    ctx.fillStyle = 'rgba(16,16,18,0.9)';
    ctx.fillRect(0, 90, W, 110);
    ctx.font = '500 24px "JetBrains Mono", monospace';
    ctx.fillStyle = 'rgba(16,16,18,0.75)';
    ctx.fillText('214 ORCHARD ST · NEW YORK', 70, H - 120);
    ctx.fillText('BOOK WITH YOUR CODE AT VELTRON', 70, H - 76);
    ctx.font = '800 120px Sora, sans-serif';
    ctx.fillStyle = 'rgba(16,16,18,0.12)';
    ctx.fillText('tron', W - 330, H - 150);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
}

/** Brushed-silver gift card that tilts toward the pointer and flips when the amount changes. */
export class GiftCard {
    constructor(experience, stageEl) {
        this.exp = experience;
        this.stageEl = stageEl;
        this.anchor = new THREE.Group();
        this.anchorRef = experience.addAnchor(stageEl, this.anchor, { followX: true, margin: 0.1 });
        this.state = { flip: 0, hover: 0 };
        this.amount = 100;

        this.card = new THREE.Group();
        this.anchor.add(this.card);

        const w = 3.2, h = w / CARD_RATIO, d = 0.035;
        const rough = createBrushedRoughness();
        this.metal = new THREE.MeshPhysicalMaterial({
            color: '#e6e5e1', metalness: 1, roughness: 0.6, roughnessMap: rough,
            clearcoat: 0.6, clearcoatRoughness: 0.15,
        });
        const body = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 6, 0.16), this.metal);
        this.card.add(body);

        this.faceMaterial = new THREE.MeshStandardMaterial({ map: drawFace(this.amount), transparent: true, roughness: 0.6, metalness: 0.2 });
        const face = new THREE.Mesh(new THREE.PlaneGeometry(w, h), this.faceMaterial);
        face.position.z = d / 2 + 0.002;
        this.card.add(face);

        const back = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: drawBack(), transparent: true, roughness: 0.6, metalness: 0.2 }));
        back.position.z = -d / 2 - 0.002;
        back.rotation.y = Math.PI;
        this.card.add(back);

        const shadow = new THREE.Mesh(
            new THREE.PlaneGeometry(1, 1),
            new THREE.MeshBasicMaterial({ map: createRadialTexture('rgba(0,0,0,0.7)', 'rgba(0,0,0,0)'), transparent: true, depthWrite: false }),
        );
        shadow.rotation.x = -Math.PI / 2;
        shadow.scale.set(w * 1.1, w * 0.45, 1);
        this.shadow = shadow;
        this.anchor.add(shadow);

        this.light = new THREE.PointLight('#fff1dc', 0, 12, 2);
        this.anchor.add(this.light);

        // Re-draw once web fonts are ready so the canvas uses Sora.
        document.fonts?.ready.then(() => this.setAmount(this.amount, false));

        experience.onLayout(() => this.layout());
        experience.onUpdate((dt, t) => this.update(dt, t));
    }

    layout() {
        const r = this.stageEl.getBoundingClientRect();
        const worldW = r.width * this.exp.unitsPerPixel;
        const worldH = r.height * this.exp.unitsPerPixel;
        const s = Math.min((worldW * 0.72) / 3.2, (worldH * 0.62) / (3.2 / CARD_RATIO));
        this.card.scale.setScalar(s);
        this.shadow.position.y = -worldH * 0.38;
        this.baseScale = s;
    }

    setAmount(amount, animate = true) {
        this.amount = amount;
        const swap = () => {
            this.faceMaterial.map?.dispose();
            this.faceMaterial.map = drawFace(amount);
            this.faceMaterial.needsUpdate = true;
        };
        if (!animate) return swap();
        gsap.timeline()
            .to(this.state, { flip: this.state.flip + Math.PI, duration: 0.45, ease: 'power2.in', onComplete: swap })
            .to(this.state, { flip: this.state.flip + Math.PI * 2, duration: 0.7, ease: 'back.out(1.6)' });
    }

    update(dt, t) {
        const a = this.anchorRef;
        if (!a.visible) return;
        const p = this.exp.pointer;
        const ease = 1 - Math.pow(0.003, dt);
        const tx = -p.ny * 0.35 + Math.sin(t * 0.6) * 0.04;
        const ty = p.nx * 0.55 + Math.sin(t * 0.4) * 0.08 - 0.35;
        this.card.rotation.x += (tx - this.card.rotation.x) * ease;
        const yawTarget = ty + this.state.flip;
        this.card.rotation.y += (yawTarget - this.card.rotation.y) * Math.min(1, ease * 2.5);
        this.card.rotation.z = Math.sin(t * 0.5) * 0.03;
        this.card.position.y = Math.sin(t * 0.9) * 0.08 + (1 - a.progress) * 0.6 - 0.3;
        this.light.position.set(p.nx * 3, p.ny * 2 + 1, 3.5);
        this.light.intensity = 18 * a.coverage;
        this.shadow.material.opacity = 0.6 - this.card.position.y * 0.3;
    }
}
