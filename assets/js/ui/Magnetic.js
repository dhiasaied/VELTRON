import { gsap } from 'gsap';

/** Elements with [data-magnetic] lean toward the pointer while hovered. */
export function initMagnetic(scope = document) {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    scope.querySelectorAll('[data-magnetic]').forEach((el) => {
        const x = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'elastic.out(1, 0.4)' });
        const y = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'elastic.out(1, 0.4)' });
        el.addEventListener('pointermove', (e) => {
            const r = el.getBoundingClientRect();
            x((e.clientX - (r.left + r.width / 2)) * 0.28);
            y((e.clientY - (r.top + r.height / 2)) * 0.36);
        });
        el.addEventListener('pointerleave', () => { x(0); y(0); });
    });
}
