import { gsap } from 'gsap';

/** Dot + lagging ring cursor that grows into a label over [data-cursor] elements. */
export class Cursor {
    constructor(root) {
        this.root = root;
        if (!root || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
        document.body.classList.add('has-cursor');

        const dot = root.querySelector('.cursor__dot');
        const ring = root.querySelector('.cursor__ring');
        const label = root.querySelector('[data-cursor-label]');
        const dotX = gsap.quickSetter(dot, 'x', 'px');
        const dotY = gsap.quickSetter(dot, 'y', 'px');
        const ringX = gsap.quickTo(ring, 'x', { duration: 0.45, ease: 'power3' });
        const ringY = gsap.quickTo(ring, 'y', { duration: 0.45, ease: 'power3' });

        window.addEventListener('pointermove', (e) => {
            dotX(e.clientX); dotY(e.clientY);
            ringX(e.clientX); ringY(e.clientY);
            root.classList.remove('is-hidden');
        }, { passive: true });
        document.addEventListener('pointerleave', () => root.classList.add('is-hidden'));

        document.addEventListener('pointerover', (e) => {
            const target = e.target.closest('[data-cursor]');
            if (target) {
                label.textContent = target.dataset.cursor;
                root.classList.add('has-label');
            }
        });
        document.addEventListener('pointerout', (e) => {
            const target = e.target.closest('[data-cursor]');
            if (target && !target.contains(e.relatedTarget)) root.classList.remove('has-label');
        });
    }
}
