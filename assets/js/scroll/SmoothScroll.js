import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger.js';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger);

/**
 * Lenis smooth scrolling driven by GSAP's ticker so Lenis, ScrollTrigger and the
 * WebGL frame all advance in the same tick. Falls back to native scroll for
 * reduced-motion users.
 */
export class SmoothScroll {
    constructor({ reducedMotion }) {
        if (!reducedMotion) {
            this.lenis = new Lenis({ duration: 1.15, smoothWheel: true, touchMultiplier: 1.1 });
            this.lenis.on('scroll', ScrollTrigger.update);
            gsap.ticker.add((time) => this.lenis.raf(time * 1000));
            gsap.ticker.lagSmoothing(0);
        }

        document.addEventListener('click', (e) => {
            const link = e.target.closest('a[href^="#"]');
            if (!link) return;
            const id = link.getAttribute('href');
            const target = id === '#top' ? 0 : document.querySelector(id);
            if (target === null) return;
            e.preventDefault();
            this.scrollTo(target);
        });
    }

    scrollTo(target) {
        if (this.lenis) this.lenis.scrollTo(target, { duration: 1.8, easing: (t) => 1 - Math.pow(1 - t, 4) });
        else if (target === 0) window.scrollTo({ top: 0 });
        else target.scrollIntoView();
    }

    stop() { this.lenis?.stop(); }
    start() { this.lenis?.start(); }
    get velocity() { return this.lenis?.velocity ?? 0; }
}
