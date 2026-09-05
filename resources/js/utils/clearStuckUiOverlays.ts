/** Evento para o ProgressIndicator (dentro do React) limpar overlay de carregamento preso. */
export const NS_RESET_PROGRESS_OVERLAY = 'ns:reset-progress-overlay';

/**
 * Remove splash órfão e destrava body após navegação Inertia.
 *
 * Não remove diálogos Headless UI / modais ativos: apagar nós que o React ainda
 * controla (portal do Modal) causa erro de DOM e tela branca — ex.: abrir
 * /suporte?modal=… a partir do sino.
 */
export function clearStuckUiOverlays(): void {
    if (typeof document === 'undefined') {
        return;
    }

    document.body.style.overflow = '';
    document.body.style.pointerEvents = '';

    for (const id of ['ns-splash', 'ns-splash-fadeout']) {
        document.getElementById(id)?.remove();
    }

    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(NS_RESET_PROGRESS_OVERLAY));
    }
}
