import * as THREE from 'three';
import { buildModel } from './toolModels.js';

const TOOLS = ['clipper', 'trimmer', 'scissors', 'razor', 'brush', 'towel'];

/**
 * Price list (reel 7s–10s): the tool for the hovered row floats next to the cursor.
 * Switching rows spins the old tool out and pops the new one in. On touch screens the
 * tool sits beside whichever row is in the middle of the screen.
 */
export class CursorTool {
    constructor(experience, materials, sectionEl) {
        this.exp = experience;
        this.anchor = new THREE.Group();
        this.anchorRef = experience.addAnchor(sectionEl, this.anchor, { margin: 0.05 });
        this.active = null;
        this.rowEl = null;
        this.fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

        this.items = new Map();
        for (const name of TOOLS) {
            const pivot = new THREE.Group();
            const model = buildModel(name, materials);
            pivot.add(model);
            pivot.visible = false;
            pivot.scale.setScalar(0.0001);
            this.anchor.add(pivot);
            this.items.set(name, { pivot, model, s: 0, spin: 0 });
        }

        this.key = new THREE.DirectionalLight('#ffffff', 0);
        this.key.position.set(-2, 4, 6);
        this.anchor.add(this.key, this.key.target);

        this.pos = new THREE.Vector3();
        this.target = new THREE.Vector3();
        this.last = new THREE.Vector3();
        this.ray = new THREE.Raycaster();
        this.plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -1.2);
        this.ndc = new THREE.Vector2();
        this.size = 1;

        experience.onLayout(() => { this.size = Math.min(this.exp.worldHeight * 0.14, this.exp.worldWidth * 0.1) * (this.fine ? 1 : 1.3); });
        experience.onUpdate((dt, t) => this.update(dt, t));
    }

    setActive(name, rowEl = null) {
        if (name === this.active && rowEl === this.rowEl) return;
        if (name !== this.active) {
            const prev = this.items.get(this.active);
            if (prev) prev.spin = 1;
            const next = this.items.get(name);
            if (next) next.spin = -1;
        }
        this.active = name;
        this.rowEl = rowEl;
    }

    screenToLocal(x, y, out) {
        this.ndc.set((x / this.exp.size.w) * 2 - 1, -(y / this.exp.size.h) * 2 + 1);
        this.ray.setFromCamera(this.ndc, this.exp.camera);
        this.ray.ray.intersectPlane(this.plane, out);
        this.anchor.updateMatrixWorld();
        return this.anchor.worldToLocal(out);
    }

    update(dt, t) {
        const a = this.anchorRef;
        if (!a.visible) return;
        this.key.intensity = 2.2 * a.coverage;

        // Where the active tool should be.
        const p = this.exp.pointer;
        if (this.active) {
            if (this.fine) {
                this.screenToLocal(p.x + 70, p.y + 10, this.target);
            } else if (this.rowEl) {
                const r = this.rowEl.getBoundingClientRect();
                this.screenToLocal(r.left + r.width * 0.62, r.top + r.height * 0.5, this.target);
            }
        }
        // Nothing showing yet: appear at the cursor rather than sweeping in from the centre.
        if ([...this.items.values()].every((i) => i.s < 0.02)) this.pos.copy(this.target);
        const follow = 1 - Math.pow(0.0004, dt);
        this.last.copy(this.pos);
        this.pos.lerp(this.target, follow);
        const vx = (this.pos.x - this.last.x) / Math.max(dt, 1e-3);
        const vy = (this.pos.y - this.last.y) / Math.max(dt, 1e-3);

        for (const [name, item] of this.items) {
            const on = name === this.active;
            item.s += ((on ? 1 : 0) - item.s) * (1 - Math.pow(on ? 0.002 : 0.0005, dt));
            item.spin *= Math.pow(0.02, dt);
            item.pivot.visible = item.s > 0.01;
            if (!item.pivot.visible) continue;
            item.pivot.position.copy(this.pos);
            item.pivot.scale.setScalar(this.size * item.s * (on ? 1 : 0.6 + item.s * 0.4));
            // Lean into the motion, idle sway, and a spin while swapping.
            item.model.rotation.set(
                0.35 + THREE.MathUtils.clamp(-vy * 0.04, -0.5, 0.5) + Math.sin(t * 1.3) * 0.06,
                -0.5 + Math.sin(t * 0.8) * 0.25 + item.spin * 2.2,
                -0.35 + THREE.MathUtils.clamp(-vx * 0.035, -0.6, 0.6),
            );
            item.model.userData.animate?.(t);
        }
    }
}
