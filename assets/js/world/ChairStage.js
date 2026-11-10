import * as THREE from 'three';
import { gsap } from 'gsap';
import { BarberChair } from './BarberChair.js';
import { LightBeam } from './LightBeam.js';
import { LEATHER_COLORS } from './materials.js';
import { createRadialTexture } from './textures.js';

const SPOT_ANGLE = 0.36;
const SPOT_POWER = 340;
const CHAIR_SCALE = 2.45;
const BASE_YAW = -0.55;

/**
 * Hero + anatomy scene: the chair, a spotlight that tracks the pointer, its visible beam,
 * floor shadows, drag-to-spin, and the scroll-driven 360° walk-around with callouts.
 */
export class ChairStage {
    constructor(experience, materials, { pinEl, dragEl, calloutEls }) {
        this.exp = experience;
        this.materials = materials;
        this.quality = experience.quality;
        this.pointer = experience.pointer;
        this.calloutEls = calloutEls;

        this.state = {
            power: 0,          // master light level (intro flicker)
            anatomy: 0,        // 0 = hero (pointer-driven), 1 = walk-around
            anatomyProgress: 0,
            rise: 0,           // intro lift
            dragYaw: 0,
            dragVelocity: 0,
            zoom: 1,
        };
        this.lightScreen = { x: window.innerWidth / 2, y: window.innerHeight / 2 };

        this.anchor = new THREE.Group();
        this.rig = new THREE.Group();
        this.anchor.add(this.rig);
        this.anchorRef = experience.addAnchor(pinEl, this.anchor);

        this.turntable = new THREE.Group();
        this.rig.add(this.turntable);
        this.chair = new BarberChair(materials);
        this.chair.root.scale.setScalar(CHAIR_SCALE);
        this.turntable.add(this.chair.root);

        this.buildFloor();
        this.buildLights();
        this.bindDrag(dragEl);

        this.tmpA = new THREE.Vector3();
        this.tmpB = new THREE.Vector3();
        this.aimTarget = new THREE.Vector3(0, 1.4, 0.3);

        experience.onLayout(() => this.layout());
        experience.onUpdate((dt, t) => this.update(dt, t));
    }

    buildFloor() {
        const shadowFloor = new THREE.Mesh(new THREE.PlaneGeometry(16, 16), new THREE.ShadowMaterial({ opacity: 0.62 }));
        shadowFloor.rotation.x = -Math.PI / 2;
        shadowFloor.receiveShadow = true;
        this.rig.add(shadowFloor);

        this.pool = new THREE.Mesh(
            new THREE.PlaneGeometry(1, 1),
            new THREE.MeshBasicMaterial({ map: createRadialTexture('rgba(255,226,186,0.55)', 'rgba(255,226,186,0)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }),
        );
        this.pool.rotation.x = -Math.PI / 2;
        this.pool.position.y = 0.003;
        this.pool.scale.setScalar(3.4);
        this.rig.add(this.pool);

        const contact = new THREE.Mesh(
            new THREE.PlaneGeometry(1, 1),
            new THREE.MeshBasicMaterial({ map: createRadialTexture('rgba(0,0,0,0.85)', 'rgba(0,0,0,0)'), transparent: true, depthWrite: false }),
        );
        contact.rotation.x = -Math.PI / 2;
        contact.position.y = 0.002;
        contact.scale.setScalar(2.3);
        this.rig.add(contact);
    }

    buildLights() {
        const spot = new THREE.SpotLight('#fff0da', 0, 0, SPOT_ANGLE, 0.6, 2);
        spot.position.set(0, 6.4, 2.4);
        spot.castShadow = true;
        spot.shadow.mapSize.set(this.quality.shadow, this.quality.shadow);
        spot.shadow.bias = -0.0004;
        spot.shadow.normalBias = 0.02;
        spot.shadow.camera.near = 1;
        spot.shadow.camera.far = 16;
        this.rig.add(spot, spot.target);
        this.spot = spot;

        this.rim = new THREE.DirectionalLight('#9db4ff', 0);
        this.rim.position.set(-4, 4.5, -5);
        this.rig.add(this.rim, this.rim.target);

        this.warmKick = new THREE.PointLight('#ffb470', 0, 9, 2);
        this.warmKick.position.set(3.2, 2.2, -1.5);
        this.rig.add(this.warmKick);

        this.beam = new LightBeam({ angle: SPOT_ANGLE * 1.08, length: 8.5, dustCount: this.quality.dust });
        this.rig.add(this.beam.group);
    }

    bindDrag(el) {
        if (!el) return;
        let dragging = false;
        let lastX = 0;
        el.addEventListener('pointerdown', (e) => {
            if (e.target.closest('button, a, input')) return;
            dragging = true;
            lastX = e.clientX;
            this.state.dragVelocity = 0;
        });
        window.addEventListener('pointermove', (e) => {
            if (!dragging) return;
            const dx = e.clientX - lastX;
            lastX = e.clientX;
            this.state.dragVelocity = dx * 0.006;
            this.state.dragYaw += dx * 0.006;
        }, { passive: true });
        const stop = () => { dragging = false; };
        window.addEventListener('pointerup', stop);
        window.addEventListener('pointercancel', stop);
        this.isDragging = () => dragging;
    }

    layout() {
        const { w, h } = this.exp.size;
        const aspect = w / h;
        const worldH = this.exp.worldHeight;
        let scale = 1;
        let y = -worldH * 0.36;
        if (aspect < 0.8) {
            scale = 0.72;
            y = -worldH * 0.12;
        } else if (aspect < 1.25) {
            scale = 0.86;
            y = -worldH * 0.28;
        }
        this.baseScale = scale;
        this.baseY = y;
        this.rig.scale.setScalar(scale);
        this.rig.position.y = y;
    }

    setLeather(name) {
        const target = LEATHER_COLORS[name];
        if (!target) return;
        gsap.to(this.materials.leatherColor, { r: target.r, g: target.g, b: target.b, duration: 1.1, ease: 'power2.inOut' });
        // A quick light "breath" so the change reads.
        gsap.fromTo(this.state, { power: this.state.power * 0.82 }, { power: 1, duration: 0.9, ease: 'power2.out' });
    }

    /** Pose shown under the hair before the reveal: profile view, light low. */
    preIntro() {
        Object.assign(this.state, { power: 0.3, rise: 0, dragYaw: 1.75, dragVelocity: 0 });
        this.turntable.rotation.y = BASE_YAW + 1.75;
    }

    /** Reel 2.0s–3.0s: the chair turns from profile to three-quarter as the light comes up. */
    intro() {
        const s = this.state;
        return gsap.timeline()
            .to(s, { power: 0.15, duration: 0.08 })
            .to(s, { power: 0.6, duration: 0.1 })
            .to(s, { power: 1, duration: 1.0, ease: 'power2.out' })
            .to(s, { dragYaw: 0, duration: 1.9, ease: 'expo.out' }, 0);
    }

    update(dt, t) {
        const s = this.state;
        const p = this.pointer;

        // Pointer, or a slow figure-eight when the user isn't touching anything.
        let nx = p.nx;
        let ny = p.ny;
        const idle = !p.hasMoved || (this.quality.coarse && p.idleFor() > 2.5);
        if (idle) {
            nx = Math.sin(t * 0.45) * 0.55;
            ny = Math.sin(t * 0.32) * 0.35 + 0.1;
        }

        // Where the light aims (rig space). Hero: follows pointer. Anatomy: sweeps the chair.
        let heroX = nx * 2.6;
        let heroY = 1.25 + ny * 1.7;
        // Cast the pointer onto the plane just in front of the chair so the beam lands under it.
        this.ndc ??= new THREE.Vector2();
        this.ray ??= new THREE.Raycaster();
        this.plane ??= new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
        this.ndc.set(nx, ny);
        this.ray.setFromCamera(this.ndc, this.exp.camera);
        this.rig.updateMatrixWorld();
        this.plane.constant = -this.rig.localToWorld(this.tmpB.set(0, 0, 0.35)).z;
        if (this.ray.ray.intersectPlane(this.plane, this.tmpB)) {
            this.rig.worldToLocal(this.tmpB);
            heroX = THREE.MathUtils.clamp(this.tmpB.x, -4.5, 4.5);
            heroY = THREE.MathUtils.clamp(this.tmpB.y, 0.15, 5);
        }
        const orbit = s.anatomyProgress * Math.PI * 2;
        const anaX = Math.sin(orbit * 1.5) * 0.7;
        const anaY = 1.6 + Math.cos(orbit) * 0.35;
        const a = s.anatomy;
        this.tmpA.set(heroX + (anaX - heroX) * a, heroY + (anaY - heroY) * a, 0.35);
        this.aimTarget.lerp(this.tmpA, 1 - Math.pow(0.0009, dt));
        this.spot.target.position.copy(this.aimTarget);
        this.spot.position.x = this.aimTarget.x * 0.35;

        // Light levels.
        const power = s.power;
        this.spot.intensity = SPOT_POWER * power * (1 + a * 0.25);
        this.rim.intensity = 2.2 * power;
        this.warmKick.intensity = (6 + a * 10) * power;

        // Floor light pool tracks where the cone meets the floor.
        const poolX = this.spot.position.x + (this.aimTarget.x - this.spot.position.x) * (this.spot.position.y / Math.max(0.01, this.spot.position.y - this.aimTarget.y)) ;
        this.pool.position.x = THREE.MathUtils.clamp(poolX * 0.55, -3, 3);
        this.pool.position.z = 0.6;
        this.pool.material.opacity = power;

        // Chair yaw: pointer lean + drag (with inertia) + scroll spin.
        if (!this.isDragging?.()) {
            s.dragYaw += s.dragVelocity;
            s.dragVelocity *= Math.pow(0.04, dt);
        }
        const lean = nx * 0.22 * (1 - a);
        const targetYaw = BASE_YAW + lean + s.dragYaw + orbit;
        this.turntable.rotation.y += (targetYaw - this.turntable.rotation.y) * (1 - Math.pow(0.002, dt));
        this.turntable.position.y = -s.rise * 1.2;
        this.chair.root.rotation.x = s.rise * 0.12;
        this.rig.scale.setScalar(this.baseScale * s.zoom);
        // During the walk-around, make room for the headline (right on desktop, down on phones).
        const narrow = this.exp.size.w / this.exp.size.h < 0.8;
        this.rig.position.x = narrow ? 0 : a * this.exp.worldWidth * 0.12;
        this.rig.position.y = this.baseY - (narrow ? a * this.exp.worldHeight * 0.1 : 0);

        // Beam + dust.
        this.rig.updateMatrixWorld();
        this.spot.getWorldPosition(this.tmpA);
        this.spot.target.getWorldPosition(this.tmpB);
        // Beam and dust fade as the stage scrolls away so no motes drift over the next section.
        const onStage = THREE.MathUtils.smoothstep(this.anchorRef.coverage, 0.35, 0.9);
        this.beam.update(this.tmpA, this.tmpB, power * (1 - a * 0.35) * onStage, t, Math.cos(SPOT_ANGLE * 1.08));

        // Screen position of the light (drives DOM text lighting).
        const proj = this.exp.project(this.tmpB);
        this.lightScreen.x = proj.x;
        this.lightScreen.y = proj.y;

        this.updateCallouts();
    }

    updateCallouts() {
        const els = this.calloutEls;
        if (!els.length) return;
        const progress = this.state.anatomyProgress;
        const active = this.state.anatomy;
        this.turntable.getWorldPosition(this.tmpA);
        const centre = this.exp.project(this.tmpA).x;

        els.forEach((el, i) => {
            const point = this.chair.points[el.dataset.point];
            if (!point) return;
            const start = 0.06 + i * 0.17;
            const fadeIn = THREE.MathUtils.smoothstep(progress, start, start + 0.06);
            const fadeOut = 1 - THREE.MathUtils.smoothstep(progress, start + 0.2, start + 0.26);
            const opacity = fadeIn * fadeOut * active;

            if (opacity <= 0.001) {
                if (el.style.opacity !== '0') el.style.opacity = '0';
                return;
            }
            point.getWorldPosition(this.tmpB);
            const sp = this.exp.project(this.tmpB);
            el.style.opacity = opacity.toFixed(3);
            el.style.transform = `translate3d(${sp.x.toFixed(1)}px, ${sp.y.toFixed(1)}px, 0)`;
            // Put the label on the outer side, unless that side lacks room on screen.
            const needed = this.exp.size.w < 860 ? 200 : 330;
            const preferLeft = sp.x < centre;
            const fits = preferLeft ? sp.x > needed : this.exp.size.w - sp.x > needed;
            el.classList.toggle('is-left', fits ? preferLeft : !preferLeft);
            const line = el.querySelector('.callout__line');
            if (line) line.style.transform = `scaleX(${fadeIn.toFixed(3)})`;
        });
    }
}
