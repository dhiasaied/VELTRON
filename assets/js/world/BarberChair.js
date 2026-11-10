import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

/**
 * A hydraulic barber chair modelled from primitives (metres, origin on the floor).
 * Exposes named anchor points used by the anatomy callouts.
 */
export class BarberChair {
    constructor(materials) {
        this.m = materials;
        this.root = new THREE.Group();
        this.root.name = 'barber-chair';
        this.points = {};

        this.buildBase();
        this.buildHydraulics();
        this.buildSeat();
        this.buildBack();
        this.buildArms();
        this.buildFootrest();

        this.root.traverse((o) => {
            if (o.isMesh) {
                o.castShadow = true;
                o.receiveShadow = true;
            }
        });
    }

    mesh(geometry, material, position = [0, 0, 0], rotation = [0, 0, 0]) {
        const m = new THREE.Mesh(geometry, material);
        m.position.set(...position);
        m.rotation.set(...rotation);
        return m;
    }

    point(name, parent, position) {
        const o = new THREE.Object3D();
        o.position.set(...position);
        parent.add(o);
        this.points[name] = o;
    }

    tube(points, radius, material, segments = 48) {
        const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)), false, 'catmullrom', 0.5);
        return new THREE.Mesh(new THREE.TubeGeometry(curve, segments, radius, 14, false), material);
    }

    buildBase() {
        const profile = [
            [0, 0], [0.33, 0], [0.345, 0.008], [0.345, 0.022], [0.33, 0.034],
            [0.24, 0.058], [0.15, 0.08], [0.1, 0.095], [0.08, 0.11], [0, 0.11],
        ].map(([r, y]) => new THREE.Vector2(r, y));
        const base = this.mesh(new THREE.LatheGeometry(profile, 72), this.m.chrome);
        this.root.add(base);
        // Rubber ring where the base meets the floor.
        this.root.add(this.mesh(new THREE.TorusGeometry(0.336, 0.008, 10, 72), this.m.rubber, [0, 0.006, 0], [Math.PI / 2, 0, 0]));
        this.point('base', this.root, [0.25, 0.05, 0.12]);
    }

    buildHydraulics() {
        // Rubber bellows.
        const pts = [];
        const ripples = 7;
        for (let i = 0; i <= 70; i++) {
            const t = i / 70;
            const r = 0.072 + Math.abs(Math.sin(t * Math.PI * ripples)) * 0.012;
            pts.push(new THREE.Vector2(r, 0.11 + t * 0.22));
        }
        this.root.add(this.mesh(new THREE.LatheGeometry(pts, 48), this.m.rubber));

        // Chrome piston and pump housing.
        this.root.add(this.mesh(new THREE.CylinderGeometry(0.048, 0.048, 0.1, 40), this.m.chrome, [0, 0.38, 0]));
        this.root.add(this.mesh(new THREE.CylinderGeometry(0.11, 0.095, 0.07, 48), this.m.enamel, [0, 0.455, 0]));
        this.root.add(this.mesh(new THREE.TorusGeometry(0.104, 0.007, 8, 48), this.m.chrome, [0, 0.475, 0], [Math.PI / 2, 0, 0]));

        // Pump pedal on the right side.
        const lever = this.tube([[0.09, 0.44, 0.02], [0.2, 0.38, 0.06], [0.28, 0.24, 0.1], [0.31, 0.16, 0.12]], 0.011, this.m.chrome);
        this.root.add(lever);
        this.root.add(this.mesh(new RoundedBoxGeometry(0.1, 0.022, 0.07, 3, 0.008), this.m.rubber, [0.33, 0.15, 0.13], [0, -0.35, 0.1]));
        this.point('pump', this.root, [0.3, 0.2, 0.12]);
    }

    buildSeat() {
        const seat = new THREE.Group();
        seat.position.y = 0.5;
        this.root.add(seat);
        this.seat = seat;

        seat.add(this.mesh(new RoundedBoxGeometry(0.54, 0.05, 0.52, 4, 0.02), this.m.enamel, [0, 0, 0]));
        seat.add(this.mesh(new RoundedBoxGeometry(0.56, 0.022, 0.54, 4, 0.01), this.m.chrome, [0, -0.032, 0]));
        const cushion = this.mesh(new RoundedBoxGeometry(0.5, 0.13, 0.5, 6, 0.05), this.m.leatherChannel, [0, 0.085, 0.01]);
        seat.add(cushion);
        // Front piping.
        seat.add(this.mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.46, 12), this.m.chrome, [0, 0.03, 0.262], [0, 0, Math.PI / 2]));
    }

    buildBack() {
        const pivot = new THREE.Group();
        pivot.position.set(0, 0.6, -0.21);
        pivot.rotation.x = -0.2;
        this.root.add(pivot);
        this.backPivot = pivot;

        // Shell, cushion and chrome frame.
        pivot.add(this.mesh(new RoundedBoxGeometry(0.52, 0.66, 0.05, 5, 0.022), this.m.enamel, [0, 0.33, -0.06]));
        pivot.add(this.mesh(new RoundedBoxGeometry(0.48, 0.62, 0.11, 6, 0.05), this.m.leatherDiamond, [0, 0.33, 0]));
        const frame = this.tube([
            [-0.265, 0.0, -0.06], [-0.27, 0.35, -0.06], [-0.25, 0.64, -0.065], [0, 0.69, -0.07], [0.25, 0.64, -0.065], [0.27, 0.35, -0.06], [0.265, 0.0, -0.06],
        ], 0.013, this.m.chrome, 96);
        pivot.add(frame);
        this.point('back', pivot, [-0.2, 0.36, 0.06]);

        // Headrest on a chrome post.
        pivot.add(this.mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.16, 16), this.m.chrome, [0, 0.72, -0.05]));
        pivot.add(this.mesh(new RoundedBoxGeometry(0.11, 0.03, 0.03, 2, 0.01), this.m.chrome, [0, 0.79, -0.05]));
        const head = this.mesh(new RoundedBoxGeometry(0.3, 0.12, 0.1, 6, 0.045), this.m.leatherDiamond, [0, 0.85, -0.015]);
        pivot.add(head);
        this.point('headrest', pivot, [0.13, 0.86, 0.03]);
    }

    buildArms() {
        for (const s of [-1, 1]) {
            const arm = this.tube([
                [s * 0.27, 0.5, 0.21], [s * 0.31, 0.6, 0.24], [s * 0.32, 0.71, 0.17], [s * 0.315, 0.735, 0.0], [s * 0.3, 0.72, -0.17], [s * 0.28, 0.62, -0.2],
            ], 0.016, this.m.chrome, 80);
            this.root.add(arm);
            // Front scroll.
            this.root.add(this.mesh(new THREE.TorusGeometry(0.035, 0.012, 10, 28, Math.PI * 1.4), this.m.chrome, [s * 0.315, 0.66, 0.235], [0, Math.PI / 2, 0]));
            this.root.add(this.mesh(new RoundedBoxGeometry(0.08, 0.045, 0.4, 4, 0.02), this.m.leatherChannel, [s * 0.315, 0.765, 0.0]));
        }
        this.point('arm', this.root, [0.315, 0.73, 0.16]);
    }

    buildFootrest() {
        for (const s of [-1, 1]) {
            this.root.add(this.tube([[s * 0.16, 0.47, 0.22], [s * 0.165, 0.34, 0.36], [s * 0.17, 0.2, 0.44]], 0.012, this.m.chrome));
        }
        const plate = this.mesh(new RoundedBoxGeometry(0.44, 0.018, 0.15, 3, 0.006), this.m.chromeRibbed, [0, 0.19, 0.48], [0.18, 0, 0]);
        this.root.add(plate);
        this.root.add(this.mesh(new RoundedBoxGeometry(0.44, 0.05, 0.012, 3, 0.005), this.m.chrome, [0, 0.21, 0.555], [0.18, 0, 0]));
    }
}
