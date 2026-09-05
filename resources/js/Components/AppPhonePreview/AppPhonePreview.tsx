import Modal from '@/Components/Modal';
import { DevicePhoneMobileIcon, XMarkIcon } from '@heroicons/react/24/outline';
import type { ReactNode } from 'react';

type Props = {
    show: boolean;
    onClose: () => void;
    /** Título acima da moldura. */
    heading?: string;
    /** Subtítulo acima da moldura. */
    subheading?: string;
    /** Conteúdo dentro da tela do celular (rola independentemente). */
    children: ReactNode;
    /** Classe extra no miolo scrollável. */
    bodyClassName?: string;
};

/**
 * Modal com moldura de celular para pré-visualizar como o membro vê no app.
 * Use em qualquer tela de gestão/publicação.
 */
export default function AppPhonePreview({
    show,
    onClose,
    heading = 'Pré-visualização no app',
    subheading = 'Como o membro vê no celular',
    children,
    bodyClassName = '',
}: Props) {
    return (
        <Modal show={show} onClose={onClose} maxWidth="sm" showCloseButton={false} disableBodyScroll>
            <div className="flex flex-col items-center gap-4 px-4 py-5 sm:px-6">
                <div className="flex w-full items-center justify-between gap-3">
                    <div className="min-w-0">
                        <p className="text-sm font-semibold text-zinc-900 dark:text-white">{heading}</p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">{subheading}</p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                        aria-label="Fechar pré-visualização"
                    >
                        <XMarkIcon className="h-5 w-5" aria-hidden />
                    </button>
                </div>

                <div className="relative w-full max-w-[340px]">
                    <div className="rounded-[2.25rem] bg-zinc-900 p-2.5 shadow-xl ring-1 ring-zinc-800 dark:bg-zinc-950 dark:ring-zinc-700">
                        <div className="relative overflow-hidden rounded-[1.85rem] bg-zinc-50 dark:bg-zinc-900">
                            <div
                                className="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-center pt-2"
                                aria-hidden
                            >
                                <div className="h-5 w-28 rounded-full bg-zinc-900 dark:bg-black" />
                            </div>

                            <div className="flex h-[min(72vh,640px)] flex-col">
                                <div className="flex shrink-0 items-center justify-between px-5 pb-1 pt-3 text-[10px] font-semibold text-zinc-700 dark:text-zinc-300">
                                    <span>9:41</span>
                                    <span className="inline-flex items-center gap-1">
                                        <DevicePhoneMobileIcon className="h-3 w-3" aria-hidden />
                                        App
                                    </span>
                                </div>

                                <div
                                    className={`min-h-0 flex-1 overflow-y-auto overscroll-contain px-3.5 pb-5 pt-1 ${bodyClassName}`.trim()}
                                >
                                    {children}
                                </div>

                                <div className="flex shrink-0 justify-center pb-2 pt-1" aria-hidden>
                                    <div className="h-1 w-28 rounded-full bg-zinc-300 dark:bg-zinc-600" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Modal>
    );
}
