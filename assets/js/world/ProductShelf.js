import * as THREE from 'three';
import { buildModel } from './toolModels.js';

/**
 * Shop (reel 17.5s–19s): every product card holds a live 3D product on a black plinth,
 * lit from straight above like a display case. Products turn slowly, spin faster while
 * hovered, and can be dragged round.
 */
export class ProductShelf {
    constructor(experience, materials, stageEls) {
        this.exp = experience;
        this.slots = stageEls.map((el) => {
            const anchor = new THREE.Group();
            const ref = experience.addAnchor(el, anchor, { followX: true, margin: 0.05 });
            const plinth = new THREE.Group();
            plinth.add(new THREE.Mesh(new THREE.CylinderGeometry(1, 1.04, 0.6, 64), materials.satinBlack));
            const rim = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.012, 8, 64), materials.chrome);
            rim.rotation.x = Math.PI / 2;
            rim.position.y = 0.3;
            plinth.add(rim);
            anchor.add(plinth);

            const turn = new THREE.Group();
            const model = buildModel(el.dataset.productStage, materials);
            turn.add(model);
            anchor.add(turn);

            const spot = new THREE.SpotLight('#fff3e2', 0, 0, 0.45, 0.7, 1.4);
            anchor.add(spot, spot.target);

            const state = { hover: 0, hoverTarget: 0, drag: 0, vel: 0, dragging: false, lastX: 0 };
            el.addEventListener('pointerenter', () => { state.hoverTarget = 1; });
            el.addEventListener('pointerleave', () => { state.hoverTarget = 0; state.dragging = false; });
            el.addEventListener('pointerdown', (e) => { state.dragging = true; state.lastX = e.clientX; el.setPointerCapture?.(e.pointerId); });
            el.addEventListener('pointermove', (e) => {
                if (!state.dragging) return;
                state.vel = (e.clientX - state.lastX) * 0.012;
                state.drag += state.vel;
                state.lastX = e.clientX;
            });
            el.addEventListener('pointerup', () => { state.dragging = false; });
            el.style.touchAction = 'pan-y';

            return { el, ref, anchor, plinth, turn, model, spot, state, seed: Math.random() * 10 };
        });

        experience.onLayout(() => this.layout());
        experience.onUpdate((dt, t) => this.update(dt, t));
    }

    layout() {
        const upp = this.exp.unitsPerPixel;
        for (const s of this.slots) {
            const r = s.el.getBoundingClientRect();
            const w = r.width * upp;
            const h = r.height * upp;
            const size = Math.min(w * 0.3, h * 0.24);
            s.model.scale.setScalar(size);
            s.turn.position.y = -h * 0.08;
            s.plinth.scale.set(w * 0.3, h * 0.12, w * 0.3);
            // Stand the product on the plinth: plinth top = product's lowest point.
            s.anchor.updateWorldMatrix(true, true);
            const box = new THREE.Box3().setFromObject(s.model);
            const bottom = box.min.y - s.anchor.getWorldPosition(new THREE.Vector3()).y;
            s.plinth.position.y = bottom - 0.3 * h * 0.12;
            s.spot.position.set(0, h * 0.6, 1.2);
            s.spot.target.position.set(0, -h * 0.1, 0);
        }
    }

    update(dt, t) {
        for (const s of this.slots) {
            if (!s.ref.visible) continue;
            const st = s.state;
            st.hover += (st.hoverTarget - st.hover) * (1 - Math.pow(0.01, dt));
            if (!st.dragging) { st.drag += st.vel; st.vel *= Math.pow(0.05, dt); }
            s.turn.rotation.y = t * (0.35 + st.hover * 1.4) + st.drag + s.seed;
            s.turn.rotation.x = 0.12 + Math.sin(t * 0.6 + s.seed) * 0.04;
            s.turn.position.x = 0;
            s.model.userData.animate?.(t);
            s.spot.intensity = (55 + st.hover * 40) * s.ref.coverage;
        }
    }
}
