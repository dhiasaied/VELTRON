import { gsap } from 'gsap';
import { api } from '../api.js';
import { toast } from './Toast.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const STEPS = [
    { key: 'service', title: 'Pick a service' },
    { key: 'barber', title: 'Pick your barber' },
    { key: 'time', title: 'Pick a time' },
    { key: 'details', title: 'Hold the chair' },
    { key: 'done', title: 'Your chair is held' },
];

/** Line icons for the service list (match the 3D tool on each price-list row). */
const ICONS = {
    clipper: '<rect x="8" y="3" width="8" height="18" rx="4"/><path d="M7 5h10M10 1v2M14 1v2M8 14h8"/>',
    trimmer: '<rect x="9" y="4" width="6" height="17" rx="3"/><path d="M8 4h8M10 2v2M14 2v2"/>',
    scissors: '<circle cx="6" cy="18" r="3"/><circle cx="18" cy="18" r="3"/><path d="M8 16 19 3M16 16 5 3"/>',
    razor: '<path d="M3 15 15 9l6 1-1 4-17 3z"/><path d="M15 9 8 4"/>',
    brush: '<path d="M7 11c0-5 2-8 5-8s5 3 5 8z"/><path d="M8 11h8M10 11v4h4v-4M9 15h6l-1 6h-4z"/>',
    towel: '<circle cx="12" cy="13" r="7"/><path d="M12 13a3 3 0 1 1 3-3M9 3c0 1 1 1 1 2M13 2c0 1 1 1 1 2"/>',
};
const icon = (name) => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] ?? ICONS.clipper}</svg>`;
const ANY = 'any';

/**
 * Four-step booking flow in a side drawer:
 * cut → barber → day & time (live availability) → contact details → confirmation.
 */
export class BookingDrawer {
    constructor(root, config, { onOpen, onClose, extras } = {}) {
        this.extras = extras;
        this.root = root;
        this.config = config;
        this.onOpen = onOpen;
        this.onClose = onClose;
        this.panel = root.querySelector('.drawer__panel');
        this.scrim = root.querySelector('.drawer__scrim');
        this.body = root.querySelector('[data-drawer-body]');
        this.titleEl = root.querySelector('[data-drawer-title]');
        this.stepEl = root.querySelector('[data-drawer-step]');
        this.progressEl = root.querySelector('[data-drawer-progress]');
        this.summaryEl = root.querySelector('[data-drawer-summary]');
        this.nextBtn = root.querySelector('[data-drawer-next]');
        this.backBtn = root.querySelector('[data-drawer-back]');

        this.isOpen = false;
        this.calendar = null;
        this.nextFreeByBarber = {};
        this.reset();

        root.querySelectorAll('[data-drawer-close]').forEach((b) => b.addEventListener('click', () => this.close()));
        this.backBtn.addEventListener('click', () => this.go(this.step - 1));
        this.nextBtn.addEventListener('click', () => this.next());
        this.body.addEventListener('click', (e) => this.handleBodyClick(e));
        this.body.addEventListener('input', (e) => this.handleInput(e));
        document.addEventListener('keydown', (e) => this.handleKey(e));

        document.addEventListener('click', (e) => {
            const trigger = e.target.closest('[data-book]');
            if (!trigger) return;
            e.preventDefault();
            this.open({
                service: trigger.dataset.bookService,
                barber: trigger.dataset.bookBarber,
                date: trigger.dataset.bookDate,
                note: trigger.dataset.bookNote,
            });
        });
    }

    reset() {
        this.step = 0;
        this.sel = { service: null, barber: null, date: null, time: null, timeLabel: null, name: '', phone: '', email: '', notes: '' };
        this.slots = null;
        this.booking = null;
        this.errors = {};
    }

    service() { return this.config.services.find((s) => s.id === this.sel.service); }
    barber() {
        if (this.sel.barber === ANY) return { slug: ANY, name: 'First free chair', chair: 0 };
        return this.config.barbers.find((b) => b.slug === this.sel.barber);
    }

    async open(preset = {}) {
        if (this.booking) this.reset();
        if (preset.service) this.sel.service = preset.service;
        if (preset.barber) this.sel.barber = preset.barber;
        if (preset.date) this.sel.date = preset.date;
        if (preset.note) this.sel.notes = preset.note;

        this.step = !this.sel.service ? 0 : !this.sel.barber ? 1 : 2;
        this.lastFocus = document.activeElement;
        this.isOpen = true;
        this.root.classList.add('is-open');
        this.root.setAttribute('aria-hidden', 'false');
        this.onOpen?.();
        this.render(false);

        gsap.killTweensOf([this.panel, this.scrim]);
        gsap.to(this.scrim, { opacity: 1, duration: 0.5, ease: 'power2.out' });
        gsap.fromTo(this.panel, { xPercent: 102 }, { xPercent: 0, x: 0, duration: 0.8, ease: 'expo.out', onComplete: () => this.panel.focus() });

        this.loadSideData();
    }

    close() {
        if (!this.isOpen) return;
        this.isOpen = false;
        gsap.to(this.scrim, { opacity: 0, duration: 0.4 });
        gsap.to(this.panel, {
            xPercent: 102, duration: 0.6, ease: 'expo.in',
            onComplete: () => {
                this.root.classList.remove('is-open');
                this.root.setAttribute('aria-hidden', 'true');
                if (this.booking) this.reset();
            },
        });
        this.onClose?.();
        this.lastFocus?.focus?.({ preventScroll: true });
    }

    async loadSideData() {
        try {
            if (!this.calendar) this.calendar = (await api.calendar()).days;
            if (!Object.keys(this.nextFreeByBarber).length) this.nextFreeByBarber = (await api.nextFreeAll()).barbers;
            if (this.step === 1 || this.step === 2) this.render(false);
        } catch {
            /* the drawer still works without the hints */
        }
    }

    go(step) {
        if (step < 0 || step > 3) return;
        this.step = step;
        this.render(true);
    }

    async next() {
        if (this.step < 3) return this.go(this.step + 1);
        if (this.step === 3) return this.submit();
        if (this.step === 4) { this.reset(); this.render(true); }
    }

    canAdvance() {
        const s = this.sel;
        switch (this.step) {
            case 0: return !!s.service;
            case 1: return !!s.barber;
            case 2: return !!(s.date && s.time);
            case 3: return s.name.trim().length > 1 && s.phone.trim().length > 6 && !this.submitting;
            default: return true;
        }
    }

    render(animate) {
        const step = STEPS[this.step];
        this.titleEl.textContent = step.title;
        this.stepEl.textContent = this.step < 4 ? `Step ${this.step + 1} / 4` : 'Booked';
        this.progressEl.style.width = `${Math.min(100, ((this.step + 1) / 4) * 100)}%`;
        this.backBtn.classList.toggle('is-visible', this.step > 0 && this.step < 4);

        const html = [this.renderService, this.renderBarber, this.renderTime, this.renderDetails, this.renderDone][this.step].call(this);
        const swap = () => {
            this.body.innerHTML = html;
            this.body.scrollTop = 0;
            if (this.step === 2) this.ensureDateAndSlots();
            // Confirmation: the signature stroke writes itself.
            const sign = this.body.querySelector('[data-sign]');
            if (sign) {
                const len = sign.getTotalLength();
                gsap.fromTo(sign, { strokeDasharray: len, strokeDashoffset: len }, { strokeDashoffset: 0, duration: 1.3, ease: 'power2.inOut', delay: 0.25 });
            }
            this.updateFooter();
        };
        if (animate) {
            gsap.timeline()
                .to(this.body, { opacity: 0, x: -14, duration: 0.18, ease: 'power2.in', onComplete: swap })
                .fromTo(this.body, { opacity: 0, x: 18 }, { opacity: 1, x: 0, duration: 0.45, ease: 'expo.out' });
        } else {
            swap();
        }
    }

    updateFooter() {
        const s = this.sel;
        const svc = this.service();
        const brb = this.barber();
        const bits = [];
        if (svc) bits.push(`${esc(svc.name)} · $${svc.price}`);
        if (brb) bits.push(`with ${esc(brb.name)}`);
        if (s.date && s.timeLabel) bits.push(`${esc(this.dateLabel(s.date))}, ${esc(s.timeLabel)}`);
        this.summaryEl.innerHTML = this.step === 4 ? `Ref <b>${esc(this.booking?.reference)}</b>` : (bits.join('<br>') || 'Nothing picked yet');

        const labels = ['Continue', 'Continue', 'Continue', `Pay $${this.config.deposit} deposit`, 'Book another'];
        this.nextBtn.innerHTML = `${labels[this.step]} <span class="btn__arrow">→</span>`;
        this.nextBtn.disabled = !this.canAdvance();
    }

    dateLabel(date) {
        const d = this.calendar?.find((c) => c.date === date);
        if (d) return d.weekday === 'Today' ? 'Today' : `${d.weekday} ${d.day} ${d.month}`;
        return date;
    }

    renderService() {
        return `<div class="choices">${this.config.services.map((s, i) => `
            <button type="button" class="choice${this.sel.service === s.id ? ' is-selected' : ''}" data-pick-service="${esc(s.id)}">
                <span class="choice__icon">${icon(s.tool)}</span>
                <span class="choice__title">#${i} ${esc(s.name)}</span>
                <span class="choice__aside">$${s.price}</span>
                <span class="choice__sub">${s.minutes} min</span>
            </button>`).join('')}</div>`;
    }

    renderBarber() {
        const portraits = this.portraits || {};
        const any = `
            <button type="button" class="choice${this.sel.barber === ANY ? ' is-selected' : ''}" data-pick-barber="${ANY}">
                <span class="choice__badge" style="--tone:#2a2a2e;color:var(--bone)">★</span>
                <span class="choice__title">First free chair</span>
                <span class="choice__aside mono">→</span>
                <span class="choice__sub">Whoever’s free at your time</span>
            </button>`;
        return `<div class="choices">${any}${this.config.barbers.map((b) => {
            const next = this.nextFreeByBarber[b.slug];
            const hint = next ? `Next ${esc(next.label)} ${esc(next.dayLabel)}` : esc(b.role);
            const face = portraits[b.slug] ? `<img src="${portraits[b.slug]}" alt="">` : esc(b.name[0]);
            return `
            <button type="button" class="choice${this.sel.barber === b.slug ? ' is-selected' : ''}" data-pick-barber="${esc(b.slug)}" style="--tone:${esc(b.tone)}">
                <span class="choice__badge">${face}</span>
                <span class="choice__title">${esc(b.name)}</span>
                <span class="choice__aside mono">#${b.chair}</span>
                <span class="choice__sub">${esc(b.signature)} · ${hint}</span>
            </button>`;
        }).join('')}</div>`;
    }

    renderTime() {
        const days = (this.calendar || []).map((d) => `
            <button type="button" class="day${this.sel.date === d.date ? ' is-selected' : ''}" data-pick-date="${esc(d.date)}" ${d.open ? '' : 'disabled'} aria-label="${esc(d.weekday)} ${esc(d.day)} ${esc(d.month)}${d.open ? '' : ' — closed'}">
                <span>${esc(d.weekday)}</span><b>${esc(d.day)}</b><span>${esc(d.month)}</span>
            </button>`).join('');
        return `<div class="days" data-days>${days || '<div class="skeleton" style="width:100%;height:80px"></div>'}</div>
                <div class="slots" data-slots>${this.renderSlots()}</div>`;
    }

    renderSlots() {
        if (!this.sel.date) return '<p class="slots__empty">Pick a day first.</p>';
        if (!this.slots) return Array.from({ length: 12 }, () => '<span class="skeleton"></span>').join('');
        if (!this.slots.length) return '<p class="slots__empty">Closed that day — try another.</p>';
        const free = this.slots.filter((s) => s.available).length;
        if (!free) return '<p class="slots__empty">Fully booked. Try another day or barber.</p>';
        return this.slots.map((s) => `
            <button type="button" class="slot${this.sel.time === s.time ? ' is-selected' : ''}" data-pick-time="${esc(s.time)}" data-label="${esc(s.label)}" ${s.available ? '' : 'disabled'}>${esc(s.label)}</button>`).join('');
    }

    async ensureDateAndSlots() {
        if (!this.calendar) {
            try { this.calendar = (await api.calendar()).days; } catch { return; }
            if (this.step === 2) this.render(false); // re-render with the day strip; calls back here
            return;
        }
        if (!this.sel.date) {
            this.sel.date = this.calendar.find((d) => d.open)?.date ?? null;
            this.body.querySelectorAll('[data-pick-date]').forEach((b) => b.classList.toggle('is-selected', b.dataset.pickDate === this.sel.date));
        }
        this.loadSlots();
    }

    async loadSlots() {
        const { barber, service, date } = this.sel;
        if (!barber || !service || !date) return;
        this.slotRequest?.abort?.();
        const ctrl = new AbortController();
        this.slotRequest = ctrl;
        this.slots = null;
        this.paintSlots();
        try {
            const data = await api.availability({ barber, service, date });
            if (ctrl.signal.aborted) return;
            this.slots = data.slots;
            if (this.sel.time && !this.slots.some((s) => s.time === this.sel.time && s.available)) {
                this.sel.time = null;
                this.sel.timeLabel = null;
            }
        } catch {
            if (ctrl.signal.aborted) return;
            this.slots = [];
            toast('Could not load times. Check your connection.');
        }
        this.paintSlots();
        this.updateFooter();
    }

    paintSlots() {
        const el = this.body.querySelector('[data-slots]');
        if (!el) return;
        el.innerHTML = this.renderSlots();
        gsap.from(el.children, { opacity: 0, y: 8, duration: 0.4, stagger: 0.012, ease: 'power2.out' });
    }

    renderDetails() {
        const svc = this.service();
        const brb = this.barber();
        const s = this.sel;
        const field = (name, label, attrs = '', tag = 'input') => `
            <label class="field${this.errors[name] ? ' has-error' : ''}">
                <span>${label}</span>
                ${tag === 'textarea'
                    ? `<textarea name="${name}" rows="2" maxlength="280" ${attrs}>${esc(s[name])}</textarea>`
                    : `<input name="${name}" value="${esc(s[name])}" ${attrs}>`}
                <em>${esc(this.errors[name] || '')}</em>
            </label>`;
        return `
            <div class="recap">
                <div><span>Cut</span><b>${esc(svc?.name)} · $${svc?.price}</b></div>
                <div><span>Barber</span><b>${esc(brb?.name)}${brb?.chair ? ` · #${brb.chair}` : ''}</b></div>
                <div><span>When</span><b>${esc(this.dateLabel(s.date))}, ${esc(s.timeLabel)} · ${svc?.minutes} min</b></div>
            </div>
            <form class="form" data-details novalidate>
                ${field('name', 'Name', 'autocomplete="name" required maxlength="80"')}
                ${field('phone', 'Mobile — for the reminder text', 'type="tel" autocomplete="tel" inputmode="tel" required maxlength="20"')}
                ${field('email', 'Email <i>(optional)</i>', 'type="email" autocomplete="email" maxlength="180"')}
                ${field('notes', 'Anything we should know? <i>(optional)</i>', '', 'textarea')}
                <p class="note"><strong>$${this.config.deposit} holds the chair.</strong> It comes off your bill. Free changes up to 12h before. You'll get a text the day before at 6 pm. <span class="muted">(Demo shop — no payment is taken.)</span></p>
                ${this.errors._general ? `<p class="note" role="alert">${esc(this.errors._general)}</p>` : ''}
            </form>`;
    }

    renderDone() {
        const b = this.booking;
        return `
            <div class="done">
                <svg class="done__sign" viewBox="0 0 120 34" aria-hidden="true"><path data-sign d="M4 26c10-14 18-20 22-14s-6 14 2 12 12-18 18-16-2 16 6 14 10-12 16-12 2 10 8 9 16-6 40-8"/></svg>
                <div class="recap">
                    <div><span>Service</span><b>${esc(b.service)}</b></div>
                    <div><span>Barber</span><b>${esc(b.barber)} · #${esc(b.chair)}</b></div>
                    <div><span>When</span><b>${esc(b.dateLabel)}, ${esc(b.timeLabel)}</b></div>
                    <div><span>Paid now</span><b>$${b.deposit} deposit · $${b.price - b.deposit} at the chair</b></div>
                </div>
                <p class="muted">Hold your ref <b>${esc(b.reference)}</b>. We’ll text ${esc(b.name.split(' ')[0])} ${esc(b.reminder)} with a link to move or cancel.</p>
                <div class="done__actions">
                    <a class="btn btn--light btn--sm" href="/api/bookings/${encodeURIComponent(b.reference)}.ics" download>Add to calendar</a>
                    <button class="btn btn--ghost btn--sm" type="button" data-drawer-close-inline>Done</button>
                </div>
            </div>`;
    }

    handleBodyClick(e) {
        const t = e.target.closest('button');
        if (!t) return;
        const s = this.sel;
        if (t.dataset.pickService) {
            s.service = t.dataset.pickService;
            s.time = null; s.timeLabel = null; this.slots = null;
            this.markSelected(t);
            setTimeout(() => this.go(s.barber ? 2 : 1), 220);
        } else if (t.dataset.pickBarber) {
            s.barber = t.dataset.pickBarber;
            s.time = null; s.timeLabel = null; this.slots = null;
            this.markSelected(t);
            setTimeout(() => this.go(2), 220);
        } else if (t.dataset.pickDate) {
            s.date = t.dataset.pickDate;
            s.time = null; s.timeLabel = null;
            this.markSelected(t);
            t.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
            this.loadSlots();
        } else if (t.dataset.pickTime) {
            s.time = t.dataset.pickTime;
            s.timeLabel = t.dataset.label;
            this.markSelected(t);
        } else if ('drawerCloseInline' in t.dataset) {
            this.close();
        }
        this.updateFooter();
    }

    markSelected(btn) {
        btn.parentElement.querySelectorAll('.is-selected').forEach((b) => b.classList.remove('is-selected'));
        btn.classList.add('is-selected');
    }

    handleInput(e) {
        const { name, value } = e.target;
        if (name && name in this.sel) {
            this.sel[name] = value;
            if (this.errors[name]) {
                delete this.errors[name];
                e.target.closest('.field')?.classList.remove('has-error');
                const em = e.target.closest('.field')?.querySelector('em');
                if (em) em.textContent = '';
            }
            this.updateFooter();
        }
    }

    async submit() {
        if (this.submitting) return;
        this.submitting = true;
        this.nextBtn.disabled = true;
        this.nextBtn.innerHTML = 'Holding…';
        const s = this.sel;
        try {
            const { booking } = await api.book({
                service: s.service, barber: s.barber, date: s.date, time: s.time,
                name: s.name, phone: s.phone, email: s.email,
                notes: [s.notes, ...(this.extras?.() ?? [])].filter(Boolean).join(' · ').slice(0, 280),
            });
            this.booking = booking;
            this.errors = {};
            this.step = 4;
            this.nextFreeByBarber = {};
            this.render(true);
            this.root.dispatchEvent(new CustomEvent('booking:confirmed', { bubbles: true, detail: booking }));
        } catch (err) {
            this.errors = { ...err.errors };
            if (err.status === 409 || this.errors.time || this.errors.date) {
                toast(this.errors.time || 'That time just went. Pick another.');
                this.sel.time = null;
                this.sel.timeLabel = null;
                this.errors = {};
                this.go(2);
            } else {
                if (!Object.keys(this.errors).length) this.errors._general = err.message;
                this.render(false);
            }
        } finally {
            this.submitting = false;
            this.updateFooter();
        }
    }

    handleKey(e) {
        if (!this.isOpen) return;
        if (e.key === 'Escape') return this.close();
        if (e.key !== 'Tab') return;
        const focusables = [...this.panel.querySelectorAll('button:not([disabled]), a[href], input, textarea, [tabindex]:not([tabindex="-1"])')]
            .filter((el) => el.offsetParent !== null);
        if (!focusables.length) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
}
