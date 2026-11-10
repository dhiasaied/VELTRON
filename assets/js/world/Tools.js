import * as THREE from 'three';
import { buildModel } from './toolModels.js';

/**
 * Manifesto (reel 10s–12s): an alarm clock, a pomade tin and a spray bottle orbit the
 * headline like a slow carousel — the one passing in front crosses the words.
 * Scroll turns the carousel; the pointer tilts it.
 */
export class Tools {
    constructor(experience, materials, sectionEl) {
        this.exp = experience;
        this.anchor = new THREE.Group();
        this.anchorRef = experience.addAnchor(sectionEl, this.anchor, { margin: 0.1 });

        this.carousel = new THREE.Group();
        this.anchor.add(this.carousel);
        this.items = ['clock', 'pomade', 'spray'].map((name, i) => {
            const pivot = new THREE.Group();
            const model = buildModel(name, materials);
            pivot.add(model);
            this.carousel.add(pivot);
            return { name, pivot, model, phase: (i / 3) * Math.PI * 2, seed: i * 1.7 };
        });

        this.key = new THREE.DirectionalLight('#ffffff', 0);
        this.key.position.set(3, 5, 6);
        this.anchor.add(this.key, this.key.target);

        experience.onLayout(() => this.layout());
        experience.onUpdate((dt, t) => this.update(dt, t));
    }

    layout() {
        const narrow = this.exp.size.w / this.exp.size.h < 0.9;
        this.radiusX = this.exp.worldWidth * (narrow ? 0.36 : 0.34);
        this.radiusZ = narrow ? 1.2 : 1.8;
        this.size = Math.min(this.exp.worldHeight * 0.085, this.exp.worldWidth * (narrow ? 0.12 : 0.06));
    }

    update(dt, t) {
        const a = this.anchorRef;
        if (!a.visible) return;
        const p = this.exp.pointer;
        this.key.intensity = 2.4 * a.coverage;

        const turn = a.progress * Math.PI * 1.6 + t * 0.08;
        this.carousel.rotation.x = -p.ny * 0.08;
        for (const item of this.items) {
            const ang = item.phase + turn;
            const z = Math.cos(ang) * this.radiusZ;
            const depth = (z / this.radiusZ + 1) / 2; // 0 back … 1 front
            item.pivot.position.set(Math.sin(ang) * this.radiusX, Math.sin(t * 0.9 + item.seed) * 0.12 - 0.15, z);
            item.pivot.scale.setScalar(this.size * (0.7 + depth * 0.45));
            item.model.rotation.set(0.25 + Math.sin(t * 0.5 + item.seed) * 0.1, -ang * 0.6 + p.nx * 0.4, Math.sin(t * 0.4 + item.seed) * 0.12);
            item.model.userData.animate?.(t);
        }
    }
}
