/**
 * Shared pointer state (mouse or touch). Normalised to -1..1 with +y up,
 * plus raw client coordinates and an "idle" clock used for auto-motion on touch.
 */
export class Pointer {
    constructor() {
        this.x = window.innerWidth / 2;
        this.y = window.innerHeight / 2;
        this.nx = 0;
        this.ny = 0;
        this.lastMove = -Infinity;
        this.hasMoved = false;

        const update = (cx, cy) => {
            this.x = cx;
            this.y = cy;
            this.nx = (cx / window.innerWidth) * 2 - 1;
            this.ny = -((cy / window.innerHeight) * 2 - 1);
            this.lastMove = performance.now();
            this.hasMoved = true;
        };

        window.addEventListener('pointermove', (e) => update(e.clientX, e.clientY), { passive: true });
        window.addEventListener('touchmove', (e) => {
            const t = e.touches[0];
            if (t) update(t.clientX, t.clientY);
        }, { passive: true });
        window.addEventListener('touchstart', (e) => {
            const t = e.touches[0];
            if (t) update(t.clientX, t.clientY);
        }, { passive: true });
    }

    /** Seconds since the last pointer movement. */
    idleFor() {
        return (performance.now() - this.lastMove) / 1000;
    }
}
