import { Dialog, DialogBackdrop, DialogPanel } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { PropsWithChildren, ReactNode, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

export default function Modal({
    children,
    footer,
    show = false,
    maxWidth = '2xl',
    closeable = true,
    showCloseButton = true,
    disableBodyScroll = false,
    onClose = () => {},
}: PropsWithChildren<{
    show: boolean;
    maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '7xl';
    closeable?: boolean;
    /** Botão X no canto superior direito (só quando `closeable` é true) */
    showCloseButton?: boolean;
    /**
     * Rodapé fixo fora da zona de scroll (ex.: Cancelar / Salvar). Evita botões cortados em telas baixos.
     * O conteúdo principal fica em `children` e desliza por cima.
     */
    footer?: ReactNode;
    /**
     * Quando true, não envolve `children` em scroll interno — use em modais que já definem o layout completo
     * (ex.: Membros, Pastores, Inventário com form flex + scroll próprio).
     */
    disableBodyScroll?: boolean;
    onClose: CallableFunction;
}>) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!show) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = prev;
        };
    }, [show]);

    const close = () => {
        if (closeable) {
            onClose();
        }
    };

    const maxWidthClass = {
        sm: 'sm:max-w-sm',
        md: 'sm:max-w-md',
        lg: 'sm:max-w-lg',
        xl: 'sm:max-w-xl',
        '2xl': 'sm:max-w-2xl',
        '7xl': 'sm:max-w-7xl',
    }[maxWidth];

    if (!show) {
        return null;
    }

    const dialog = (
        <Dialog open={show} onClose={close} className="relative z-[250]">
            <DialogBackdrop
                transition
                className="fixed inset-0 z-[250] bg-black/60 backdrop-blur-sm transition-opacity duration-300 ease-out data-closed:pointer-events-none data-closed:opacity-0 dark:bg-black/85"
            />
            {/*
              Portal em document.body: cobre sidebar (z-50) e barra inferior.
              Mobile: sem overflow no contentor externo — evita o “salto” do sheet ao focar inputs.
            */}
            <div className="fixed inset-0 z-[251] w-screen max-w-[100vw] max-sm:flex max-sm:h-[100dvh] max-sm:max-h-[100dvh] max-sm:flex-col max-sm:overflow-hidden max-sm:overscroll-none sm:overflow-y-auto">
                <div className="flex items-end justify-center p-0 pb-[max(0.5rem,env(safe-area-inset-bottom,0px))] text-center max-sm:h-full max-sm:min-h-0 max-sm:flex-1 sm:min-h-full sm:items-center sm:p-4 sm:pb-4">
                    <DialogPanel
                        transition
                        className={`relative flex w-full min-h-0 max-h-[calc(100dvh-env(safe-area-inset-bottom,0px))] flex-col transform overflow-hidden rounded-t-[1.75rem] border border-b-0 border-zinc-200 bg-white text-left shadow-2xl transition-all duration-300 ease-out dark:border-zinc-800 dark:bg-zinc-900 sm:my-8 sm:max-h-[min(90dvh,calc(100dvh-2rem))] sm:w-full sm:rounded-3xl sm:border-b data-closed:translate-y-4 data-closed:opacity-0 sm:data-closed:translate-y-0 sm:data-closed:scale-95 ${maxWidthClass}`}
                    >
                        {closeable && showCloseButton && (
                            <button
                                type="button"
                                onClick={close}
                                className="absolute right-2 top-2 z-20 cursor-pointer rounded-full p-2 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white dark:focus-visible:ring-zinc-500 sm:right-3 sm:top-3"
                                aria-label="Fechar"
                            >
                                <XMarkIcon className="h-6 w-6" aria-hidden />
                            </button>
                        )}
                        {disableBodyScroll ? (
                            children
                        ) : footer != null ? (
                            <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden">
                                <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain">{children}</div>
                                <div className="shrink-0 border-t border-zinc-100 bg-white px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] dark:border-zinc-800 dark:bg-zinc-900 sm:px-6">
                                    {footer}
                                </div>
                            </div>
                        ) : (
                            <div className="min-h-0 w-full flex-1 overflow-y-auto overscroll-y-contain">{children}</div>
                        )}
                    </DialogPanel>
                </div>
            </div>
        </Dialog>
    );

    if (!mounted) {
        return null;
    }

    return createPortal(dialog, document.body);
}
