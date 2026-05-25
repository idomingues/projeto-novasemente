/**
 * Remove overlays órfãos (modal/lightbox/carregamento) que ficaram no <body>
 * após deploys antigos ou navegação Inertia com JS em cache.
 */
export function clearStuckUiOverlays(): void {
    if (typeof document === 'undefined') {
        return;
    }

    document.body.style.overflow = '';
    document.body.style.pointerEvents = '';

    document.getElementById('ns-splash')?.remove();
    document.getElementById('ns-splash-fadeout')?.remove();

    const root = document.getElementById('app');
    const children = Array.from(document.body.children);

    for (const el of children) {
        if (el === root || !(el instanceof HTMLElement)) {
            continue;
        }

        const style = window.getComputedStyle(el);
        if (style.position !== 'fixed') {
            continue;
        }

        const coversViewport =
            (el.classList.contains('inset-0') || (style.top === '0px' && style.bottom === '0px')) &&
            (style.width === '100%' || el.classList.contains('w-screen'));

        if (!coversViewport) {
            continue;
        }

        const z = Number.parseInt(style.zIndex, 10);
        if (!Number.isFinite(z) || z < 40) {
            continue;
        }

        const isDialog = el.getAttribute('role') === 'dialog';
        const isHeadless = el.id.startsWith('headlessui-');
        const looksLikeBackdrop =
            el.className.includes('bg-black/') ||
            el.className.includes('bg-black\\/') ||
            el.className.includes('bg-zinc-950/') ||
            el.className.includes('backdrop-blur');

        if (isDialog || isHeadless || looksLikeBackdrop) {
            el.remove();
        }
    }
}
