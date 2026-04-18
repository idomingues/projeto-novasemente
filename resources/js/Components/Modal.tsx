import { Dialog, DialogBackdrop, DialogPanel } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { PropsWithChildren } from 'react';

export default function Modal({
    children,
    show = false,
    maxWidth = '2xl',
    closeable = true,
    showCloseButton = true,
    onClose = () => {},
}: PropsWithChildren<{
    show: boolean;
    maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
    closeable?: boolean;
    /** Botão X no canto superior direito (só quando `closeable` é true) */
    showCloseButton?: boolean;
    onClose: CallableFunction;
}>) {
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
    }[maxWidth];

    return (
        <Dialog open={show} onClose={close} className="relative z-[200]">
            <DialogBackdrop
                transition
                className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm transition-opacity duration-300 ease-out data-closed:opacity-0 dark:bg-black/80"
            />
            <div className="fixed inset-0 z-[201] w-screen overflow-y-auto">
                <div className="flex min-h-full items-end justify-center p-0 pb-[max(0.5rem,env(safe-area-inset-bottom,0px))] text-center sm:items-center sm:p-4 sm:pb-4">
                    <DialogPanel
                        transition
                        className={`relative w-full transform overflow-hidden rounded-t-[1.75rem] border border-b-0 border-zinc-200 bg-white text-left shadow-2xl transition-all duration-300 ease-out dark:border-zinc-800 dark:bg-zinc-900 sm:my-8 sm:w-full sm:rounded-3xl sm:border-b data-closed:translate-y-4 data-closed:opacity-0 sm:data-closed:translate-y-0 sm:data-closed:scale-95 ${maxWidthClass}`}
                    >
                        {closeable && showCloseButton && (
                            <button
                                type="button"
                                onClick={close}
                                className="absolute right-2 top-2 z-20 rounded-full p-2 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white dark:focus-visible:ring-zinc-500 sm:right-3 sm:top-3"
                                aria-label="Fechar"
                            >
                                <XMarkIcon className="h-6 w-6" aria-hidden />
                            </button>
                        )}
                        {children}
                    </DialogPanel>
                </div>
            </div>
        </Dialog>
    );
}
