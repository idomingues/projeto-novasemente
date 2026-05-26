import { useEffect, useState } from 'react';
import { usePage } from '@inertiajs/react';
import type { PageProps } from '@/types';

type FlashProps = {
    success?: string | null;
    error?: string | null;
    info?: string | null;
};

export default function FlashMessages() {
    const { flash } = usePage<PageProps & { flash?: FlashProps }>().props;
    const [visible, setVisible] = useState(true);

    const success = typeof flash?.success === 'string' && flash.success.length > 0 ? flash.success : null;
    const error = typeof flash?.error === 'string' && flash.error.length > 0 ? flash.error : null;
    const info = typeof flash?.info === 'string' && flash.info.length > 0 ? flash.info : null;

    useEffect(() => {
        if (success || error || info) {
            setVisible(true);
            const active = error ?? info ?? success ?? '';
            const ms = active.length > 80 ? 12000 : 5000;
            const timeout = setTimeout(() => setVisible(false), ms);
            return () => clearTimeout(timeout);
        }
    }, [success, error, info]);

    if (!visible || (!success && !error && !info)) {
        return null;
    }

    const message = success ?? info ?? error ?? '';
    const isSuccess = Boolean(success);
    const isInfo = Boolean(info) && !isSuccess;
 
    
    return (
        <div className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom,0px))] right-4 z-[500] max-md:left-4 max-md:right-4 md:bottom-8 md:right-6 pointer-events-none">
            <div
                className={`rounded-2xl px-4 py-3 shadow-lg border text-sm flex items-center gap-3 max-w-md ${
                    isSuccess
                        ? 'bg-emerald-950/80 border-emerald-800 text-emerald-100'
                        : isInfo
                          ? 'bg-amber-950/80 border-amber-800 text-amber-100'
                          : 'bg-red-950/80 border-red-800 text-red-100'
                }`}
            >
                <span className="font-medium">
                    {isSuccess ? 'Sucesso' : isInfo ? 'Aviso' : 'Erro'}
                </span>
                <span
                    className={
                        isSuccess ? 'text-emerald-50/90' : isInfo ? 'text-amber-50/90' : 'text-red-50/90'
                    }
                >
                    {message}
                </span>
                <button
                    type="button"
                    onClick={() => setVisible(false)}
                    className={`ml-auto text-xs pointer-events-auto ${
                        isSuccess
                            ? 'text-emerald-200/80 hover:text-emerald-50'
                            : isInfo
                              ? 'text-amber-200/80 hover:text-amber-50'
                              : 'text-red-200/80 hover:text-red-50'
                    }`}
                >
                    Fechar
                </button>
            </div>
        </div>
    );
}