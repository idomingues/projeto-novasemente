import { useEffect, useState } from 'react';
import { usePage } from '@inertiajs/react';
import type { PageProps } from '@/types';

type FlashProps = {
    success?: string | null;
    error?: string | null;
};

export default function FlashMessages() {
    const { flash } = usePage<PageProps & { flash?: FlashProps }>().props;
    const [visible, setVisible] = useState(true);

    const success = flash?.success ?? null;
    const error = flash?.error ?? null;

    useEffect(() => {
        if (success || error) {
            setVisible(true);
            const timeout = setTimeout(() => setVisible(false), 4000);
            return () => clearTimeout(timeout);
        }
    }, [success, error]);

    if (!visible || (!success && !error)) {
        return null;
    }

    const message = success ?? error ?? '';
    const isSuccess = Boolean(success);

    return (
        <div className="fixed bottom-6 right-6 z-50">
            <div
                className={`rounded-2xl px-4 py-3 shadow-lg border text-sm flex items-center gap-3 max-w-sm ${
                    isSuccess
                        ? 'bg-emerald-950/80 border-emerald-800 text-emerald-100'
                        : 'bg-red-950/80 border-red-800 text-red-100'
                }`}
            >
                <span className="font-medium">
                    {isSuccess ? 'Sucesso' : 'Erro'}
                </span>
                <span className="text-emerald-50/90">{message}</span>
                <button
                    type="button"
                    onClick={() => setVisible(false)}
                    className="ml-auto text-xs text-emerald-200/80 hover:text-emerald-50"
                >
                    Fechar
                </button>
            </div>
        </div>
    );
}