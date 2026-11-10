import { gsap } from 'gsap';

/**
 * Opening sequence (reel 0.0s–3.0s).
 *  1. A field of hair covers the screen with the wordmark on top (doubles as the loader).
 *  2. A clipper slides in from the right trailing a glowing cord and shaves a lane;
 *     the shaved lane is cut out of the canvas, so the live 3D hero shows through.
 *  3. The lane opens to the full screen while the cut hair falls, and the two words
 *     fly (FLIP) to their places in the hero.
 */
export class Intro {
    constructor(root, { quality }) {
        this.root = root;
        this.hairCanvas = root.querySelector('[data-intro-hair]');
        this.fxCanvas = root.querySelector('[data-intro-fx]');
        this.ctx = this.hairCanvas.getContext('2d');
        this.fx = this.fxCanvas.getContext('2d');
        this.countEl = root.querySelector('[data-intro-count]');
        this.words = { thin: root.querySelector('[data-intro-word="thin"]'), bold: root.querySelector('[data-intro-word="bold"]') };
        this.quality = quality;
        this.state = { clipX: 0, laneY: 0, laneH: 0, cord: 0, active: false, open: 0 };
        this.mouse = { x: -999, y: -999 };

        this.resize();
        window.addEventListener('resize', () => this.resize());
        root.addEventListener('pointermove', (e) => { this.mouse.x = e.clientX; this.mouse.y = e.clientY; });

        this.frame = this.frame.bind(this);
        this.running = true;
        requestAnimationFrame(this.frame);
    }

    resize() {
        const w = window.innerWidth, h = window.innerHeight;
        const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
        for (const c of [this.hairCanvas, this.fxCanvas]) {
            c.width = w * dpr;
            c.height = h * dpr;
            c.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0);
        }
        this.w = w;
        this.h = h;
        const count = Math.min(this.quality.hairMax * 1.3, Math.floor(w * h * this.quality.hairDensity * 1.4));
        this.strands = [];
        for (let i = 0; i < count; i++) {
            const x = Math.random() * (w + 40) - 20, y = Math.random() * (h + 40) - 20;
            const base = -0.75 + Math.sin(x * 0.0035 + y * 0.002) * 0.55 + Math.cos(y * 0.005) * 0.3 + (Math.random() - 0.5) * 0.35;
            this.strands.push({ x, y, base, angle: base, vel: 0, len: 16 + Math.random() * 26, shade: (Math.random() * 4) | 0, cut: false, vx: 0, vy: 0, life: 1 });
        }
        this.state.laneY = h * 0.5;
    }

    setProgress(p) {
        this.countEl.textContent = String(Math.round(p * 100)).padStart(2, '0');
    }

    /** Is (x, y) inside the shaved area? */
    shaved(x, y) {
        const s = this.state;
        return s.active && x > s.clipX - 10 && Math.abs(y - s.laneY) < s.laneH / 2;
    }

    frame() {
        if (!this.running) return;
        const { ctx, w, h, mouse, state } = this;
        ctx.globalCompositeOperation = 'source-over';
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = '#060606';
        ctx.fillRect(0, 0, w, h);

        // Cut the shaved lane out of the backdrop so the site beneath shows.
        if (state.active && state.laneH > 0) {
            ctx.globalCompositeOperation = 'destination-out';
            const x0 = Math.max(0, state.clipX - 10);
            const r = Math.min(state.laneH / 2, 30);
            ctx.beginPath();
            ctx.roundRect(x0, state.laneY - state.laneH / 2, w - x0 + 40, state.laneH, [r, 0, 0, r]);
            ctx.fill();
            ctx.globalCompositeOperation = 'source-over';
        }

        const shades = ['rgba(120,118,112,.55)', 'rgba(165,162,155,.5)', 'rgba(205,202,195,.42)', 'rgba(70,70,68,.7)'];
        const paths = shades.map(() => new Path2D());
        const fallPath = new Path2D();
        const R2 = 120 * 120;
        for (const s of this.strands) {
            if (s.life <= 0) continue;
            if (!s.cut && this.shaved(s.x, s.y)) {
                s.cut = true;
                s.vx = (Math.random() - 0.7) * 2.5;
                s.vy = -Math.random() * 2;
            }
            if (s.cut) {
                s.vy += 0.45;
                s.x += s.vx;
                s.y += s.vy;
                s.angle += s.vx * 0.05;
                s.life -= 0.022;
                fallPath.moveTo(s.x, s.y);
                fallPath.lineTo(s.x + Math.cos(s.angle) * s.len, s.y + Math.sin(s.angle) * s.len);
                continue;
            }
            const dx = s.x - mouse.x, dy = s.y - mouse.y;
            let target = s.base;
            if (dx * dx + dy * dy < R2) {
                const f = 1 - Math.sqrt(dx * dx + dy * dy) / 120;
                let diff = Math.atan2(dy, dx) - s.angle;
                diff = Math.atan2(Math.sin(diff), Math.cos(diff));
                target = s.angle + diff * f * 0.8;
            }
            s.vel = (s.vel + (target - s.angle) * 0.12) * 0.78;
            s.angle += s.vel;
            const p = paths[s.shade];
            p.moveTo(s.x, s.y);
            p.quadraticCurveTo(s.x + Math.cos(s.base) * s.len * 0.6, s.y + Math.sin(s.base) * s.len * 0.6, s.x + Math.cos(s.angle) * s.len, s.y + Math.sin(s.angle) * s.len);
        }
        ctx.lineWidth = 1;
        ctx.lineCap = 'round';
        paths.forEach((p, i) => { ctx.strokeStyle = shades[i]; ctx.stroke(p); });
        ctx.strokeStyle = 'rgba(190,186,178,.45)';
        ctx.stroke(fallPath);

        this.drawClipper();
        requestAnimationFrame(this.frame);
    }

    drawClipper() {
        const { fx, w, state } = this;
        fx.clearRect(0, 0, w, this.h);
        if (!state.active || state.cord <= 0) return;
        const x = state.clipX, y = state.laneY;

        // Glowing cord from the clipper's tail up to the top-right corner.
        fx.save();
        fx.globalAlpha = state.cord;
        fx.strokeStyle = '#ffffff';
        fx.lineWidth = 2.4;
        fx.shadowColor = 'rgba(255,255,255,.95)';
        fx.shadowBlur = 14;
        fx.beginPath();
        fx.moveTo(x + 178, y);
        fx.bezierCurveTo(w * 0.9, y + 6, w * 0.93, y * 0.45, w * 0.955, -10);
        fx.stroke();
        fx.restore();

        fx.save();
        fx.translate(x, y);
        // Blade head (left) with teeth.
        fx.fillStyle = '#1b1b1b';
        fx.beginPath(); fx.roundRect(-30, -19, 30, 38, 5); fx.fill();
        fx.strokeStyle = '#d8d8d8';
        fx.lineWidth = 1.2;
        for (let i = -15; i <= 15; i += 3.4) { fx.beginPath(); fx.moveTo(-36, i); fx.lineTo(-28, i); fx.stroke(); }
        // Chrome body.
        const g = fx.createLinearGradient(0, -17, 0, 17);
        g.addColorStop(0, '#fbfbfb'); g.addColorStop(0.35, '#a7a7a7'); g.addColorStop(0.55, '#f2f2f2'); g.addColorStop(1, '#5c5c5c');
        fx.fillStyle = g;
        fx.beginPath(); fx.roundRect(-2, -17, 180, 34, 17); fx.fill();
        fx.fillStyle = '#121212';
        fx.beginPath(); fx.roundRect(96, -17.5, 58, 35, 6); fx.fill();
        fx.fillStyle = '#d5b27a';
        fx.fillRect(92, -17, 3, 34);
        fx.fillStyle = 'rgba(255,255,255,.75)';
        fx.fillRect(10, -12, 70, 2.5);
        fx.restore();
    }

    /**
     * Runs the clipper, opens the lane and lands the words on the hero.
     * @param {{onReveal?: Function, targets: {thin: Element, bold: Element}}} opts
     */
    play({ onReveal, targets, reducedMotion }) {
        const s = this.state;
        const tl = gsap.timeline();
        if (reducedMotion) {
            tl.to(this.root, { opacity: 0, duration: 0.4, onStart: () => onReveal?.() });
            return tl.then(() => this.destroy(targets));
        }
        s.active = true;
        // From here the canvas paints its own backdrop, so the shaved lane reveals the site.
        this.root.style.background = 'transparent';
        s.clipX = this.w + 60;
        s.laneH = 54;
        s.laneY = this.h * 0.5;

        tl.to(s, { cord: 1, duration: 0.2 }, 0)
            .to(s, { clipX: -260, duration: 1.25, ease: 'power2.inOut' }, 0)
            .add(() => onReveal?.(), 1.05)
            .to(s, { laneH: this.h * 2.4, duration: 0.85, ease: 'expo.in' }, 1.05)
            .to(s, { cord: 0, duration: 0.3 }, 1.3);

        // FLIP the intro words onto the hero words.
        tl.add(() => this.flyWords(targets), 1.25);
        return tl.then(() => new Promise((r) => setTimeout(r, 1300))).then(() => this.destroy(targets));
    }

    flyWords(targets) {
        for (const key of ['thin', 'bold']) {
            const from = this.words[key];
            const to = targets[key];
            if (!from || !to) continue;
            const a = from.getBoundingClientRect();
            const b = to.getBoundingClientRect();
            const scale = parseFloat(getComputedStyle(to).fontSize) / parseFloat(getComputedStyle(from).fontSize);
            gsap.to(from, {
                x: b.left - a.left + (parseFloat(getComputedStyle(to).paddingLeft) - parseFloat(getComputedStyle(from).paddingLeft) * scale),
                y: b.top - a.top,
                scale,
                duration: 1.25,
                ease: 'expo.inOut',
            });
            gsap.to(from, { opacity: 0, duration: 0.45, delay: 0.95 });
            gsap.fromTo(to, { opacity: 0 }, { opacity: 1, duration: 0.5, delay: 0.85 });
        }
    }

    destroy(targets) {
        this.running = false;
        if (targets) Object.values(targets).forEach((t) => t && gsap.set(t, { opacity: 1 }));
        this.root.remove();
    }
}
