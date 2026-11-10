let timer;

export function toast(message, ms = 3200) {
    const el = document.querySelector('[data-toast]');
    if (!el) return;
    el.textContent = message;
    el.classList.add('is-visible');
    clearTimeout(timer);
    timer = setTimeout(() => el.classList.remove('is-visible'), ms);
}
