import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger.js';
import { toast } from './Toast.js';

const fine = () => window.matchMedia('(hover: hover) and (pointer: fine)').matches;

/** Price list: the hovered row (or the centred row on touch) is active and drives the 3D tool. */
export function initServiceRows(cursorTool) {
    const list = document.querySelector('[data-rows]');
    if (!list) return;
    const rows = [...list.querySelectorAll('[data-service-row]')];
    const cursor = document.querySelector('[data-cursor]');
    const activate = (row) => {
        rows.forEach((r) => r.classList.toggle('is-active', r === row));
        cursorTool?.setActive(row ? row.dataset.tool : null, row);
        cursor?.classList.toggle('is-tool', !!row && fine());
    };

    if (fine()) {
        rows.forEach((row) => row.addEventListener('pointerenter', () => activate(row)));
        list.addEventListener('pointerleave', () => activate(null));
        rows.forEach((row) => row.addEventListener('click', (e) => {
            if (!e.target.closest('button')) row.querySelector('[data-book]')?.click();
        }));
    } else {
        rows.forEach((row) => ScrollTrigger.create({
            trigger: row, start: 'top 55%', end: 'bottom 55%',
            onToggle: (self) => self.isActive && activate(row),
        }));
        ScrollTrigger.create({ trigger: list, start: 'top 55%', end: 'bottom 45%', onLeave: () => activate(null), onLeaveBack: () => activate(null) });
    }
}

/** Manifesto pill: cycles through its numbers while on screen. */
export function initPillStat() {
    const pill = document.querySelector('[data-pill-stat]');
    if (!pill) return;
    const items = [...pill.children];
    let i = 0;
    let timer = null;
    const step = () => {
        items[i].classList.remove('is-active');
        i = (i + 1) % items.length;
        items[i].classList.add('is-active');
    };
    ScrollTrigger.create({
        trigger: pill, start: 'top bottom', end: 'bottom top',
        onToggle: (self) => {
            clearInterval(timer);
            if (self.isActive) timer = setInterval(step, 2400);
        },
    });
}

/** Lookbook: barber filter, front/back toggle (hover flips to the back on desktop). */
export function initLookbook() {
    const looks = [...document.querySelectorAll('[data-look]')];
    document.querySelectorAll('[data-look-filter]').forEach((chip) => {
        chip.addEventListener('click', () => {
            const f = chip.dataset.lookFilter;
            document.querySelectorAll('[data-look-filter]').forEach((c) => {
                c.classList.toggle('is-active', c === chip);
                c.setAttribute('aria-selected', c === chip ? 'true' : 'false');
            });
            const show = looks.filter((l) => f === 'all' || l.dataset.lookBarber === f);
            looks.forEach((l) => l.classList.toggle('is-hidden', !show.includes(l)));
            const count = document.querySelector('[data-look-count]');
            if (count) count.textContent = show.length;
            gsap.fromTo(show, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.7, stagger: 0.06, ease: 'expo.out', overwrite: true });
            ScrollTrigger.refresh();
        });
    });

    const setView = (look, view) => {
        look.classList.toggle('is-back', view === 'back');
        look.querySelectorAll('[data-look-view]').forEach((b) => {
            const on = b.dataset.lookView === view;
            b.classList.toggle('is-active', on);
            b.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
    };
    looks.forEach((look) => {
        look.querySelectorAll('[data-look-view]').forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); setView(look, b.dataset.lookView); }));
        const media = look.querySelector('.look__media');
        // Back photos load once the card is near the viewport, so the turn is instant.
        const back = look.querySelector('[data-look-img="back"][data-src]');
        if (back) {
            ScrollTrigger.create({
                trigger: media, start: 'top 140%', once: true,
                onEnter: () => { back.src = back.dataset.src; back.removeAttribute('data-src'); },
            });
        }
        // Gentle parallax of the photo inside its frame while scrolling.
        gsap.fromTo(look.querySelector('[data-look-frame]'), { '--py': '-18px' }, {
            '--py': '18px', ease: 'none',
            scrollTrigger: { trigger: media, start: 'top bottom', end: 'bottom top', scrub: true },
        });
        if (fine()) {
            media.addEventListener('pointerenter', () => setView(look, 'back'));
            media.addEventListener('pointerleave', () => {
                setView(look, 'front');
                gsap.to(media, { '--rx': '0deg', '--ry': '0deg', '--lx': '50%', '--ly': '20%', duration: 0.8, ease: 'power3.out' });
            });
            // Tilt towards the pointer; the key light follows it across the portrait.
            media.addEventListener('pointermove', (e) => {
                const r = media.getBoundingClientRect();
                const x = (e.clientX - r.left) / r.width;
                const y = (e.clientY - r.top) / r.height;
                gsap.to(media, { '--ry': `${(x - 0.5) * 7}deg`, '--rx': `${(0.5 - y) * 6}deg`, '--lx': `${x * 100}%`, '--ly': `${y * 100}%`, duration: 0.5, ease: 'power2.out', overwrite: 'auto' });
            });
        } else {
            media.addEventListener('click', () => setView(look, look.classList.contains('is-back') ? 'front' : 'back'));
        }
    });
}

/** Pick-up bag: products added here are attached to the next booking. */
export class Bag {
    constructor() {
        this.key = 'veltron.bag';
        try { this.items = JSON.parse(localStorage.getItem(this.key) || '[]'); } catch { this.items = []; }
        this.button = document.querySelector('[data-bag-button]');
        this.count = document.querySelector('[data-bag-count]');
        document.querySelectorAll('[data-add-product]').forEach((btn) => {
            btn.addEventListener('click', () => this.toggle(btn.dataset.addProduct, btn.dataset.productName));
        });
        this.button?.addEventListener('click', () => document.querySelector('[data-book]')?.click());
        this.render();
    }

    toggle(id, name) {
        const has = this.items.some((i) => i.id === id);
        this.items = has ? this.items.filter((i) => i.id !== id) : [...this.items, { id, name }];
        try { localStorage.setItem(this.key, JSON.stringify(this.items)); } catch { /* private mode */ }
        this.render();
        toast(has ? `${name} removed.` : `${name} added — it’ll be waiting at the chair.`);
    }

    clear() {
        this.items = [];
        try { localStorage.removeItem(this.key); } catch { /* ignore */ }
        this.render();
    }

    names() { return this.items.map((i) => i.name); }

    render() {
        document.querySelectorAll('[data-add-product]').forEach((btn) => {
            const on = this.items.some((i) => i.id === btn.dataset.addProduct);
            btn.classList.toggle('is-added', on);
            btn.textContent = on ? 'Added ✓' : 'Add';
        });
        if (this.button) {
            this.button.hidden = !this.items.length;
            this.count.textContent = this.items.length;
        }
    }
}

/** Reviews: the stack deals its top card away; auto-advances while visible. */
export function initDeck() {
    const deck = document.querySelector('[data-deck]');
    if (!deck) return;
    const cards = [...deck.querySelectorAll('[data-deck-card]')];
    const indexEl = deck.querySelector('[data-deck-index]');
    let order = cards.map((_, i) => i);
    let busy = false;
    let timer = null;

    const layout = (animate) => {
        order.forEach((ci, depth) => {
            const vars = { y: depth * 14, scale: 1 - depth * 0.05, opacity: depth > 2 ? 0 : 1 - depth * 0.15, zIndex: cards.length - depth, rotate: 0, x: 0 };
            animate ? gsap.to(cards[ci], { ...vars, duration: 0.7, ease: 'expo.out' }) : gsap.set(cards[ci], vars);
        });
        indexEl.textContent = order[0] + 1;
    };
    const next = () => {
        if (busy) return;
        busy = true;
        const top = cards[order[0]];
        gsap.to(top, {
            x: -window.innerWidth * 0.35, rotate: -10, opacity: 0, duration: 0.55, ease: 'power3.in',
            onComplete: () => {
                order = [...order.slice(1), order[0]];
                gsap.set(top, { x: 0, rotate: 0 });
                layout(true);
                busy = false;
            },
        });
    };
    layout(false);
    deck.querySelector('[data-deck-next]')?.addEventListener('click', () => { next(); restart(); });
    const restart = () => { clearInterval(timer); timer = setInterval(next, 5200); };
    ScrollTrigger.create({ trigger: deck, start: 'top bottom', end: 'bottom top', onToggle: (s) => (s.isActive ? restart() : clearInterval(timer)) });
}

/** Map: the walking route draws itself, then keeps marching. */
export function initMap() {
    const route = document.querySelector('[data-map-route]');
    if (!route) return;
    const len = route.getTotalLength();
    gsap.set(route, { strokeDasharray: len, strokeDashoffset: len });
    ScrollTrigger.create({
        trigger: route.closest('[data-map]'),
        start: 'top 75%',
        once: true,
        onEnter: () => gsap.to(route, {
            strokeDashoffset: 0, duration: 1.6, ease: 'power2.inOut',
            onComplete: () => {
                gsap.set(route, { strokeDasharray: '6 8', strokeDashoffset: 0 });
                gsap.to(route, { strokeDashoffset: -28, duration: 1.2, ease: 'none', repeat: -1 });
            },
        }),
    });
}

/** FAQ: animate the answer height when a question opens. */
export function initFaq() {
    document.querySelectorAll('.faq__item').forEach((item) => {
        const summary = item.querySelector('summary');
        const body = item.querySelector('.faq__a');
        summary.addEventListener('click', (e) => {
            e.preventDefault();
            if (item.open) {
                gsap.to(body, { height: 0, opacity: 0, duration: 0.45, ease: 'power2.inOut', onComplete: () => { item.open = false; gsap.set(body, { clearProps: 'all' }); } });
            } else {
                item.open = true;
                gsap.fromTo(body, { height: 0, opacity: 0 }, { height: 'auto', opacity: 1, duration: 0.55, ease: 'expo.out', onComplete: () => gsap.set(body, { clearProps: 'all' }) });
            }
        });
    });
}
