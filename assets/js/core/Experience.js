import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const CAMERA_Z = 9;
const FOV = 32;

/**
 * Owns the renderer, scene and camera, and keeps 3D groups glued to DOM elements.
 *
 * An "anchor" maps a DOM element's on-screen centre to a world position on the z=0 plane,
 * so a 3D object scrolls exactly like the section it belongs to (and holds still inside
 * a position:sticky element). Nothing renders while no anchor is on screen.
 */
export class Experience {
    constructor(canvas, quality, pointer) {
        this.canvas = canvas;
        this.quality = quality;
        this.pointer = pointer;
        this.anchors = [];
        this.updaters = new Set();
        this.elapsed = 0;
        this.size = { w: window.innerWidth, h: window.innerHeight };
        this.frameTimes = [];
        this.dpr = quality.dpr;

        this.renderer = new THREE.WebGLRenderer({
            canvas,
            antialias: quality.antialias,
            alpha: true,
            powerPreference: 'high-performance',
        });
        this.renderer.setClearColor(0x000000, 0);
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.05;
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFShadowMap;

        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(FOV, this.size.w / this.size.h, 0.1, 60);
        this.camera.position.set(0, 0, CAMERA_Z);
        this.cameraOffset = new THREE.Vector2();

        const pmrem = new THREE.PMREMGenerator(this.renderer);
        this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
        this.scene.environmentIntensity = 0.3;
        pmrem.dispose();

        this.resize = this.resize.bind(this);
        this.tick = this.tick.bind(this);
        window.addEventListener('resize', this.resize);
        this.resize(true);
    }

    get worldHeight() {
        return 2 * CAMERA_Z * Math.tan(THREE.MathUtils.degToRad(FOV / 2));
    }

    /** World units per CSS pixel on the z=0 plane. */
    get unitsPerPixel() {
        return this.worldHeight / this.size.h;
    }

    get worldWidth() {
        return this.worldHeight * (this.size.w / this.size.h);
    }

    addAnchor(element, group, { followX = false, margin = 0.25 } = {}) {
        const anchor = { element, group, followX, margin, visible: false, rect: null, progress: 0 };
        this.scene.add(group);
        this.anchors.push(anchor);
        return anchor;
    }

    onUpdate(fn) {
        this.updaters.add(fn);
        return () => this.updaters.delete(fn);
    }

    resize(force = false) {
        const w = window.innerWidth;
        const h = window.innerHeight;
        // Ignore the small height jumps caused by mobile browser toolbars.
        if (!force && w === this.size.w && Math.abs(h - this.size.h) < 120) return;
        this.size = { w, h };
        this.renderer.setPixelRatio(this.dpr);
        this.renderer.setSize(w, h, false);
        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
        this.layoutCallbacks?.forEach((fn) => fn(this));
    }

    onLayout(fn) {
        (this.layoutCallbacks ??= []).push(fn);
        fn(this);
    }

    updateAnchors() {
        const { w, h } = this.size;
        const upp = this.unitsPerPixel;
        let anyVisible = false;

        for (const a of this.anchors) {
            const r = a.element.getBoundingClientRect();
            a.rect = r;
            const pad = h * a.margin;
            a.visible = r.bottom > -pad && r.top < h + pad;
            a.group.visible = a.visible;
            // 0 when the element's top hits the viewport bottom, 1 when its bottom leaves the top.
            a.progress = THREE.MathUtils.clamp((h - r.top) / (h + r.height), 0, 1);
            // How much of the viewport the element currently covers (0..1).
            a.coverage = THREE.MathUtils.clamp((Math.min(r.bottom, h) - Math.max(r.top, 0)) / h, 0, 1);
            if (!a.visible) continue;
            anyVisible = true;
            a.group.position.y = -((r.top + r.height / 2) - h / 2) * upp;
            if (a.followX) a.group.position.x = ((r.left + r.width / 2) - w / 2) * upp;
        }
        return anyVisible;
    }

    /** Drops the pixel ratio if frames are consistently slow. */
    adapt(deltaMs) {
        this.frameTimes.push(deltaMs);
        if (this.frameTimes.length < 90) return;
        const avg = this.frameTimes.reduce((s, v) => s + v, 0) / this.frameTimes.length;
        this.frameTimes.length = 0;
        if (avg > 24 && this.dpr > 1) {
            this.dpr = Math.max(1, this.dpr - 0.25);
            this.renderer.setPixelRatio(this.dpr);
            this.renderer.setSize(this.size.w, this.size.h, false);
        }
    }

    /** Driven by gsap.ticker so it stays in sync with Lenis and ScrollTrigger. */
    tick(time, deltaMs) {
        const dt = Math.min(deltaMs / 1000, 1 / 20);
        this.elapsed += dt;

        // Subtle camera parallax from the pointer (translation only, keeps anchors exact).
        const p = this.pointer;
        this.cameraOffset.x += (p.nx * 0.18 - this.cameraOffset.x) * 0.05;
        this.cameraOffset.y += (p.ny * 0.1 - this.cameraOffset.y) * 0.05;
        this.camera.position.x = this.cameraOffset.x;
        this.camera.position.y = this.cameraOffset.y;

        const visible = this.updateAnchors();
        if (document.hidden) return;
        if (!visible) {
            // Clear once so no stale frame lingers over DOM-only sections.
            if (this.wasVisible) this.renderer.clear();
            this.wasVisible = false;
            return;
        }
        this.wasVisible = true;

        for (const fn of this.updaters) fn(dt, this.elapsed);
        this.renderer.render(this.scene, this.camera);
        this.adapt(deltaMs);
    }

    /** Projects a world-space point to CSS pixels. */
    project(vec3, out = { x: 0, y: 0, behind: false }) {
        const v = vec3.clone().project(this.camera);
        out.x = (v.x * 0.5 + 0.5) * this.size.w;
        out.y = (-v.y * 0.5 + 0.5) * this.size.h;
        out.behind = v.z > 1;
        return out;
    }
}
