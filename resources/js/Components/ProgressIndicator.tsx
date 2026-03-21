import { useEffect, useState } from 'react';
import { router } from '@inertiajs/react';

/** Indicador de carregamento (spinner) visível durante navegação Inertia. */
export default function ProgressIndicator() {
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const handleStart = () => setLoading(true);
        const handleFinish = () => setLoading(false);

        const unstart = router.on('start', handleStart);
        const unfinish = router.on('finish', handleFinish);
        const uncancel = router.on('cancel', handleFinish);
        // Respostas não-Inertia (403 HTML, erro de servidor) ou exceções podem não disparar `finish`;
        // sem isto o overlay a “A carregar…” fica preso em cima de tudo (parece que não muda de ecrã).
        const uninvalid = router.on('invalid', handleFinish);
        const unexception = router.on('exception', handleFinish);

        return () => {
            unstart();
            unfinish();
            uncancel();
            uninvalid();
            unexception();
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
                <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">A carregar…</span>
            </div>
        </div>
    );
}
