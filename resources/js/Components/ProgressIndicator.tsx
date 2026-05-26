import { useEffect, useRef, useState } from 'react';
import { router } from '@inertiajs/react';
import { NS_RESET_PROGRESS_OVERLAY } from '@/utils/clearStuckUiOverlays';

type VisitLike = { showProgress?: boolean };

function visitFromStartEvent(event: Event): VisitLike | null {
    const e = event as CustomEvent<{ visit?: VisitLike }>;
    return e.detail?.visit ?? null;
}

function visitFromFinishEvent(event: Event): VisitLike | null {
    const e = event as CustomEvent<{ visit?: VisitLike }>;
    return e.detail?.visit ?? null;
}

const LOADING_SAFETY_MS = 12_000;

/** Indicador de carregamento (spinner) visível durante navegação Inertia. */
export default function ProgressIndicator() {
    const [loading, setLoading] = useState(false);
    /** Visitas com `showProgress: false` (ex.: reload parcial async) não incrementam — evita overlay a cada poll. */
    const blockingDepth = useRef(0);

    const resetOverlay = () => {
        blockingDepth.current = 0;
        setLoading(false);
    };

    useEffect(() => {
        resetOverlay();
    }, []);

    useEffect(() => {
        if (!loading) {
            return;
        }
        const safety = window.setTimeout(resetOverlay, LOADING_SAFETY_MS);
        return () => window.clearTimeout(safety);
    }, [loading]);

    useEffect(() => {
        const handleStart = (event: Event) => {
            const visit = visitFromStartEvent(event);
            if (visit?.showProgress === false) {
                return;
            }
            blockingDepth.current += 1;
            setLoading(true);
        };
        const handleFinish = (event: Event) => {
            const visit = visitFromFinishEvent(event);
            if (visit?.showProgress !== false) {
                blockingDepth.current = Math.max(0, blockingDepth.current - 1);
            }
            setLoading(blockingDepth.current > 0);
        };
        const unstart = router.on('start', handleStart);
        const unfinish = router.on('finish', handleFinish);
        const uncancel = router.on('cancel', resetOverlay);
        // Respostas não-Inertia (403 HTML, erro de servidor) ou exceções podem não disparar `finish`;
        // sem isto o overlay «Carregando…» fica preso em cima de tudo (parece que não muda de tela).
        const uninvalid = router.on('invalid', resetOverlay);
        const unexception = router.on('exception', resetOverlay);
        // Após redirect de login (e em dev com HMR), `finish` às vezes não chega — `navigate`/`success` garantem limpar.
        const unnavi = router.on('navigate', resetOverlay);
        const unsucc = router.on('success', resetOverlay);
        const onExternalReset = () => resetOverlay();
        window.addEventListener(NS_RESET_PROGRESS_OVERLAY, onExternalReset);

        let removeViteHot: (() => void) | undefined;
        if (import.meta.hot) {
            const onBeforeUpdate = () => resetOverlay();
            import.meta.hot.on('vite:beforeUpdate', onBeforeUpdate);
            removeViteHot = () => import.meta.hot?.off('vite:beforeUpdate', onBeforeUpdate);
        }

        return () => {
            unstart();
            unfinish();
            uncancel();
            uninvalid();
            unexception();
            unnavi();
            unsucc();
            window.removeEventListener(NS_RESET_PROGRESS_OVERLAY, onExternalReset);
            removeViteHot?.();
        };
    }, []);

    if (!loading) return null;

    return (
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-white/80 dark:bg-zinc-950/80 backdrop-blur-sm"
            aria-live="polite"
            aria-busy="true"
        >
            <div className="flex flex-col items-center gap-3">
                <svg
                    className="h-12 w-12 animate-spin text-zinc-900 dark:text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    aria-hidden
                >
                    <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                    />
                    <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                </svg>
                <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Carregando…</span>
            </div>
        </div>
    );
}
