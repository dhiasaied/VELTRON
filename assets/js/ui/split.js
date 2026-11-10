/** Tiny text splitters (keeps nested markup such as <strong>). */

export function splitChars(el) {
    const text = el.textContent;
    el.setAttribute('aria-label', text);
    el.textContent = '';
    return [...text].map((ch) => {
        const span = document.createElement('span');
        span.className = 'char';
        span.setAttribute('aria-hidden', 'true');
        span.textContent = ch === ' ' ? ' ' : ch;
        el.appendChild(span);
        return span;
    });
}

export function splitWords(root) {
    const words = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);

    for (const node of nodes) {
        const parts = node.textContent.split(/(\s+)/);
        const frag = document.createDocumentFragment();
        for (const part of parts) {
            if (!part) continue;
            if (/^\s+$/.test(part)) {
                frag.appendChild(document.createTextNode(' '));
            } else {
                const span = document.createElement('span');
                span.className = 'w';
                span.textContent = part;
                frag.appendChild(span);
                words.push(span);
            }
        }
        node.replaceWith(frag);
    }
    return words;
}
