import { gsap } from 'gsap';
import { api } from '../api.js';

/** Gift-card amount picker (drives the 3D card) and the "send it" modal form. */
export class GiftModal {
    constructor(root, { onAmount, onOpen, onClose } = {}) {
        this.root = root;
        this.panel = root.querySelector('.modal__panel');
        this.scrim = root.querySelector('.modal__scrim');
        this.form = root.querySelector('[data-gift-form]');
        this.formWrap = root.querySelector('[data-gift-form-wrap]');
        this.done = root.querySelector('[data-gift-done]');
        this.amountLabel = root.querySelector('[data-gift-modal-amount]');
        this.onOpen = onOpen;
        this.onClose = onClose;
        this.amount = 100;

        document.querySelectorAll('[data-gift-amount]').forEach((btn) => {
            btn.addEventListener('click', () => {
                const amount = Number(btn.dataset.giftAmount);
                if (amount === this.amount) return;
                this.amount = amount;
                document.querySelectorAll('[data-gift-amount]').forEach((b) => {
                    b.classList.toggle('is-active', b === btn);
                    b.setAttribute('aria-checked', b === btn ? 'true' : 'false');
                });
                onAmount?.(amount);
            });
        });

        document.querySelectorAll('[data-gift-open]').forEach((b) => b.addEventListener('click', () => this.open()));
        root.querySelectorAll('[data-gift-close]').forEach((b) => b.addEventListener('click', () => this.close()));
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && this.isOpen) this.close(); });
        this.form.addEventListener('submit', (e) => this.submit(e));
    }

    open() {
        this.isOpen = true;
        this.form.amount.value = this.amount;
        this.amountLabel.textContent = `$${this.amount}`;
        this.formWrap.hidden = false;
        this.done.hidden = true;
        this.root.classList.add('is-open');
        this.root.setAttribute('aria-hidden', 'false');
        this.onOpen?.();
        gsap.to(this.scrim, { opacity: 1, duration: 0.4 });
        gsap.to(this.panel, { opacity: 1, y: 0, scale: 1, duration: 0.6, ease: 'expo.out', onComplete: () => this.form.fromName.focus() });
    }

    close() {
        this.isOpen = false;
        gsap.to(this.scrim, { opacity: 0, duration: 0.3 });
        gsap.to(this.panel, {
            opacity: 0, y: 24, scale: 0.98, duration: 0.35, ease: 'power2.in',
            onComplete: () => {
                this.root.classList.remove('is-open');
                this.root.setAttribute('aria-hidden', 'true');
            },
        });
        this.onClose?.();
    }

    async submit(e) {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(this.form));
        const btn = this.form.querySelector('[type=submit]');
        this.form.querySelectorAll('.field').forEach((f) => f.classList.remove('has-error'));
        this.form.querySelectorAll('[data-error]').forEach((em) => { em.textContent = ''; });
        btn.disabled = true;
        try {
            const { giftCard } = await api.gift(data);
            this.root.querySelector('[data-gift-code]').textContent = giftCard.code;
            this.root.querySelector('[data-gift-done-text]').textContent = `$${giftCard.amount} for ${giftCard.toName}, sent to ${giftCard.toEmail}.`;
            this.form.reset();
            this.formWrap.hidden = true;
            this.done.hidden = false;
            gsap.from(this.done.children, { opacity: 0, y: 14, stagger: 0.06, duration: 0.5, ease: 'expo.out' });
        } catch (err) {
            Object.entries(err.errors || { fromName: err.message }).forEach(([field, msg]) => {
                const em = this.form.querySelector(`[data-error="${field}"]`);
                if (em) {
                    em.textContent = msg;
                    em.closest('.field')?.classList.add('has-error');
                }
            });
        } finally {
            btn.disabled = false;
        }
    }
}
