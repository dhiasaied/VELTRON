import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger.js';
import { detectQuality } from './core/Quality.js';
import { Pointer } from './core/Pointer.js';
import { Experience } from './core/Experience.js';
import { createMaterials } from './world/materials.js';
import { extendMaterials } from './world/toolModels.js';
import { ChairStage } from './world/ChairStage.js';
import { Tools } from './world/Tools.js';
import { CursorTool } from './world/CursorTool.js';
import { ProductShelf } from './world/ProductShelf.js';
import { GiftCard } from './world/GiftCard.js';
import { SmoothScroll } from './scroll/SmoothScroll.js';
import { initChoreography } from './scroll/choreography.js';
import { Intro } from './ui/Intro.js';
import { Cursor } from './ui/Cursor.js';
import { initMagnetic } from './ui/Magnetic.js';
import { BookingDrawer } from './ui/BookingDrawer.js';
import { GiftModal } from './ui/GiftModal.js';
import { Bag, initDeck, initFaq, initLookbook, initMap, initPillStat, initServiceRows } from './ui/sections.js';
import { api } from './api.js';

const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));
const withTimeout = (p, ms) => Promise.race([p, new Promise((r) => setTimeout(r, ms))]);

/** Boots the page: intro (hair loader) → WebGL world → UI → shave reveal → lookbook renders. */
export class App {
    constructor() {
        this.quality = detectQuality();
        this.config = JSON.parse(document.querySelector('[data-shop-config]')?.dataset.shopConfig || '{}');
        this.boot().catch((err) => {
            console.error(err);
            this.intro?.destroy();
            document.body.classList.remove('is-loading');
            this.scroll?.start();
        });
    }

    async boot() {
        this.intro = new Intro(document.querySelector('[data-intro]'), { quality: this.quality });
        const progress = { v: 0 };
        const tick = gsap.to(progress, { v: 0.7, duration: 1.1, ease: 'power2.out', onUpdate: () => this.intro.setProgress(progress.v) });

        this.scroll = new SmoothScroll(this.quality);
        this.scroll.stop();
        window.scrollTo(0, 0);
        this.pointer = new Pointer();

        await nextFrame();
        this.webglOk = this.initWorld();
        await withTimeout(document.fonts?.ready ?? Promise.resolve(), 2500);
        if (this.webglOk) this.experience.renderer.compile(this.experience.scene, this.experience.camera);

        this.initUi();
        initChoreography();

        await tick.then();
        await gsap.to(progress, { v: 1, duration: 0.35, ease: 'power1.inOut', onUpdate: () => this.intro.setProgress(progress.v) }).then();
        await this.reveal();
        this.renderBusts();
    }

    initWorld() {
        const canvas = document.querySelector('[data-webgl]');
        try {
            this.experience = new Experience(canvas, this.quality, this.pointer);
        } catch (e) {
            console.warn('WebGL unavailable, continuing without 3D.', e);
            canvas.remove();
            document.documentElement.classList.add('no-webgl');
            return false;
        }
        const exp = this.experience;
        this.materials = extendMaterials(createMaterials());

        this.chairStage = new ChairStage(exp, this.materials, {
            pinEl: document.querySelector('[data-anchor="chair"]'),
            dragEl: document.querySelector('.hero'),
            calloutEls: [],
        });
        this.chairStage.preIntro();
        this.cursorTool = new CursorTool(exp, this.materials, document.querySelector('[data-anchor="services"]'));
        this.tools = new Tools(exp, this.materials, document.querySelector('[data-anchor="tools"]'));
        this.shelf = new ProductShelf(exp, this.materials, [...document.querySelectorAll('[data-product-stage]')]);
        this.giftCard = new GiftCard(exp, document.querySelector('[data-anchor="gift"]'));

        // Image-based light: moody on the chair, bright on the paper sections.
        const chairAnchor = exp.anchors[0];
        exp.onUpdate(() => {
            const chairEnv = chairAnchor.visible ? 0.07 : 0;
            const paper = Math.max(this.cursorTool.anchorRef.coverage, this.tools.anchorRef.coverage) * 1.15;
            const gift = this.giftCard.anchorRef.coverage * 1.5;
            const shelf = Math.max(0, ...this.shelf.slots.map((s) => (s.ref.visible ? 0.35 : 0)));
            exp.scene.environmentIntensity = Math.max(chairEnv, paper, gift, shelf, 0.05);
        });

        // "The light follows you": the hero words and floor glow are lit from the spotlight's aim.
        const words = [...document.querySelectorAll('[data-lit]')];
        const glow = document.querySelector('[data-light-glow]');
        exp.onUpdate(() => {
            if (!chairAnchor.visible) return;
            const { x, y } = this.chairStage.lightScreen;
            for (const w of words) {
                const r = w.getBoundingClientRect();
                w.style.setProperty('--lx', `${(x - r.left).toFixed(1)}px`);
                w.style.setProperty('--ly', `${(y - r.top).toFixed(1)}px`);
            }
            glow?.style.setProperty('--gx', `${x.toFixed(1)}px`);
            glow?.style.setProperty('--gy', `${(y + 120).toFixed(1)}px`);
        });

        gsap.ticker.add(exp.tick);
        return true;
    }

    initUi() {
        new Cursor(document.querySelector('[data-cursor]'));
        initMagnetic();
        this.bag = new Bag();

        this.drawer = new BookingDrawer(document.querySelector('[data-drawer]'), this.config, {
            onOpen: () => this.scroll.stop(),
            onClose: () => this.scroll.start(),
            extras: () => (this.bag.items.length ? [`Pick up: ${this.bag.names().join(', ')}`] : []),
        });
        this.gift = new GiftModal(document.querySelector('[data-gift-modal]'), {
            onAmount: (amount) => this.giftCard?.setAmount(amount),
            onOpen: () => this.scroll.stop(),
            onClose: () => this.scroll.start(),
        });

        // Barber photos double as avatars in the booking drawer.
        this.drawer.portraits = Object.fromEntries([...document.querySelectorAll('[data-mirror-photo]')].map((img) => [img.dataset.mirrorPhoto, img.getAttribute('src')]));

        initServiceRows(this.cursorTool);
        initPillStat();
        initLookbook();
        initDeck();
        initMap();
        initFaq();

        // Club: joining starts a booking with the plan noted.
        document.querySelectorAll('[data-join-plan]').forEach((btn) => {
            btn.addEventListener('click', () => this.drawer.open({ note: `Joining ${btn.dataset.planName}` }));
        });

        // Barber mirrors: hover / focus / tap opens a station.
        const mirrors = [...document.querySelectorAll('[data-mirror]')];
        const openMirror = (m) => mirrors.forEach((x) => x.classList.toggle('is-open', x === m));
        mirrors.forEach((m) => {
            m.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') openMirror(m); });
            m.addEventListener('focus', () => openMirror(m));
            m.addEventListener('click', () => openMirror(m));
            m.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target === m) m.querySelector('[data-book]')?.click(); });
        });

        this.refreshAvailability();
        document.addEventListener('booking:confirmed', () => {
            this.bag.clear();
            this.refreshAvailability();
        });
    }

    /** Shave reveal, then hand over to the page. */
    async reveal() {
        const targets = {
            thin: document.querySelector('[data-hero-word="thin"]'),
            bold: document.querySelector('[data-hero-word="bold"]'),
        };
        gsap.set(Object.values(targets), { opacity: 0 });
        gsap.set('.hero [data-reveal]', { opacity: 0, y: 24 });

        await this.intro.play({
            targets,
            reducedMotion: this.quality.reducedMotion,
            onReveal: () => {
                this.chairStage?.intro();
                document.body.classList.remove('is-loading');
                gsap.to('.hero [data-reveal]', { opacity: 1, y: 0, duration: 1.1, ease: 'expo.out', stagger: 0.07, delay: 0.7 });
            },
        });
        this.scroll.start();
        ScrollTrigger.refresh();
    }

    /** Lookbook + mirror portraits from the 3D bust, rendered after the intro, one per frame. */
    async renderBusts() {
        const looks = [...document.querySelectorAll('[data-look]:not([data-look-photo])')];
        const mirrors = [...document.querySelectorAll('[data-mirror-bust]')];
        if (!this.webglOk || (!looks.length && !mirrors.length)) return;
        const { BustRenderer } = await import('./world/Bust.js');
        const strands = this.quality.tier === 'low' ? 30000 : this.quality.tier === 'mid' ? 50000 : 70000;
        const bust = new BustRenderer({ strands });
        const idle = () => new Promise((r) => (window.requestIdleCallback ? requestIdleCallback(() => r(), { timeout: 400 }) : setTimeout(r, 60)));
        try {
            for (const look of looks) {
                for (const view of ['front', 'back']) {
                    await idle();
                    look.querySelector(`[data-look-img="${view}"]`).src = await bust.render(look.dataset.lookStyle, view);
                }
                look.classList.add('is-ready');
            }
            const styles = { dre: 'fadePart', malik: 'curlTaper', tomas: 'frenchCrop', yusuf: 'buzz' };
            const portraits = {};
            for (const img of mirrors) {
                await idle();
                const slug = img.dataset.mirrorBust;
                img.src = portraits[slug] = await bust.render(styles[slug] ?? 'buzz', 'three-quarter');
                img.hidden = false;
            }
            this.drawer.portraits = { ...portraits, ...this.drawer.portraits };
        } finally {
            bust.dispose();
        }
    }

    async refreshAvailability() {
        try {
            const { barbers } = await api.nextFreeAll();
            document.querySelectorAll('[data-barber-next]').forEach((el) => {
                const n = barbers[el.dataset.barberNext];
                el.textContent = n ? `${n.label} ${n.dayLabel}` : 'next week';
            });
            const { next } = await api.nextFree();
            if (next) {
                const label = next.dayLabel === 'today' ? next.label : `${next.label} ${next.dayLabel}`;
                document.querySelectorAll('[data-next-free]').forEach((el) => { el.textContent = label; });
                const footer = document.querySelector('[data-footer-next]');
                if (footer) footer.textContent = next.dayLabel === 'today' ? `at ${next.label}.` : `${next.dayLabel} at ${next.label}.`;
            }
        } catch {
            /* keep the server-rendered values */
        }
    }
}
