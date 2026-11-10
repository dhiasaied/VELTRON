import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger.js';
import { splitWords } from '../ui/split.js';

/** Every scroll-linked DOM animation on the page (3D objects read scroll from their anchors). */
export function initChoreography() {
    const mm = gsap.matchMedia();

    // Hero: the wordmark drifts apart and the copy lifts away as the menu slides up.
    gsap.timeline({ scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } })
        .to('.hero__word--thin', { xPercent: -10, yPercent: -20, ease: 'none' }, 0)
        .to('.hero__word--bold', { xPercent: 10, yPercent: 20, ease: 'none' }, 0)
        .to('.hero__title, .hero__copy, .hero__next, .hero__hint', { y: -70, opacity: 0, ease: 'none' }, 0);

    // Manifesto: words light up as you read.
    const title = document.querySelector('[data-words]');
    if (title) {
        const words = splitWords(title);
        gsap.to(words, { opacity: 1, stagger: 0.08, ease: 'none', scrollTrigger: { trigger: title, start: 'top 80%', end: 'bottom 45%', scrub: true } });
    }

    // Generic reveals.
    const targets = gsap.utils.toArray([
        '.section-head > *', '.section-head > div > *', '.row', '.mirror', '.look', '.plan', '.product',
        '.gift__copy > *', '.reviews__score', '.deck', '.visit__info > *', '.map', '.faq__item', '.hiring', '.footer__cta', '.pill-stat',
    ].join(','));
    gsap.set(targets, { y: 50, opacity: 0 });
    ScrollTrigger.batch(targets, {
        start: 'top 90%',
        once: true,
        onEnter: (batch) => gsap.to(batch, { y: 0, opacity: 1, duration: 1.1, stagger: 0.07, ease: 'expo.out', overwrite: true }),
    });

    // Club: the featured plan settles higher than the others.
    mm.add('(min-width: 861px)', () => {
        gsap.to('.plan--featured', { y: -28, ease: 'none', scrollTrigger: { trigger: '.plans', start: 'top 85%', end: 'top 35%', scrub: true } });
    });

    // Counters (rating, per-visit prices).
    document.querySelectorAll('[data-count]').forEach((el) => {
        const end = parseFloat(el.dataset.count);
        const from = parseFloat(el.dataset.from || '0');
        const decimals = parseInt(el.dataset.decimals || '0', 10);
        const prefix = el.dataset.prefix || '';
        const counter = { v: from };
        el.textContent = `${prefix}${from.toFixed(decimals)}`;
        ScrollTrigger.create({
            trigger: el, start: 'top 88%', once: true,
            onEnter: () => gsap.to(counter, { v: end, duration: 2, ease: 'expo.out', onUpdate: () => { el.textContent = `${prefix}${counter.v.toFixed(decimals)}`; } }),
        });
    });

    // Footer wordmark rises into place.
    gsap.from('.footer__type', { yPercent: 35, opacity: 0.3, ease: 'none', scrollTrigger: { trigger: '.footer__type', start: 'top bottom', end: 'bottom bottom', scrub: true } });

    // Nav: hide on the way down, show on the way up; highlight the current section.
    const nav = document.querySelector('[data-nav]');
    ScrollTrigger.create({ start: 0, end: 'max', onUpdate: (self) => nav.classList.toggle('is-hidden', self.direction === 1 && self.scroll() > 240) });
    document.querySelectorAll('.nav__links a').forEach((link) => {
        const section = document.querySelector(link.getAttribute('href'));
        if (!section) return;
        ScrollTrigger.create({ trigger: section, start: 'top 50%', end: 'bottom 50%', onToggle: (self) => link.classList.toggle('is-active', self.isActive) });
    });

    // Mobile: open the centred mirror while swiping.
    mm.add('(max-width: 860px)', () => {
        const strip = document.querySelector('[data-mirrors]');
        if (!strip) return undefined;
        const onScroll = () => {
            const mid = strip.scrollLeft + strip.clientWidth / 2;
            strip.querySelectorAll('.mirror').forEach((m) => m.classList.toggle('is-open', Math.abs(m.offsetLeft + m.offsetWidth / 2 - mid) < m.offsetWidth / 2));
        };
        strip.addEventListener('scroll', onScroll, { passive: true });
        return () => strip.removeEventListener('scroll', onScroll);
    });

    document.fonts?.ready.then(() => ScrollTrigger.refresh());
    window.addEventListener('load', () => ScrollTrigger.refresh());
}
