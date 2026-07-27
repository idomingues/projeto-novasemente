import Modal from '@/Components/Modal';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import { ArrowPathIcon, ClipboardDocumentIcon } from '@heroicons/react/24/outline';
import { useState } from 'react';

export function buildLeaderSignupWhatsAppText(link: string, churchName: string): string {
    return `Olá! Use este link para criar a sua conta de líder de ministério no sistema da ${churchName}.

No formulário, escolha o(s) departamento(s) que irá gerir. O link é partilhado — quem o receber pode registar-se:

${link}`;
}

interface Props {
    show: boolean;
    link: string;
    churchName: string;
    onClose: () => void;
    onRotate?: () => void;
    rotating?: boolean;
}

export default function LeaderPublicSignupShareModal({ show, link, churchName, onClose, onRotate, rotating }: Props) {
    const [copied, setCopied] = useState<'link' | 'message' | null>(null);

    const whatsappText = buildLeaderSignupWhatsAppText(link, churchName);

    const copyLink = async () => {
        try {
            await navigator.clipboard.writeText(link);
            setCopied('link');
            setTimeout(() => setCopied(null), 2000);
        } catch {
            setCopied(null);
        }
    };

    const copyFullMessage = async () => {
        try {
            await navigator.clipboard.writeText(whatsappText);
            setCopied('message');
            setTimeout(() => setCopied(null), 2000);
        } catch {
            setCopied(null);
        }
    };

    const openWhatsApp = () => {
        window.open(`https://wa.me/?text=${encodeURIComponent(whatsappText)}`, '_blank', 'noopener,noreferrer');
    };

    return (
        <Modal show={show} onClose={onClose} maxWidth="md">
            <div className="flex max-h-[min(90vh,640px)] flex-col">
                <div className="shrink-0 px-5 pt-6 pb-2 sm:px-7 sm:pt-7">
                    <h2 className="text-lg font-bold leading-tight tracking-tight text-zinc-900 dark:text-white">
                        Link para líderes (auto cadastro)
                    </h2>
                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{churchName}</p>
                    <p className="mt-4 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
                        Qualquer pessoa com este link pode registar-se como líder de ministério e escolher os departamentos.
                        Partilhe só com quem deve ter acesso. Pode regenerar o link para invalidar o anterior.
                    </p>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto px-5 py-3 sm:px-7">
                    <label className="block text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                        Link público
                    </label>
                    <input
                        type="text"
                        readOnly
                        value={link}
                        className="mt-1.5 w-full min-w-0 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-xs text-zinc-800 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-100"
                        onFocus={(e) => e.target.select()}
                    />
                </div>

                <div className="shrink-0 space-y-3 border-t border-zinc-100 bg-zinc-50/90 px-5 py-4 dark:border-zinc-800 dark:bg-zinc-900/95 sm:space-y-4 sm:px-7 sm:py-5">
                    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end sm:gap-2">
                        <SecondaryButton
                            type="button"
                            onClick={copyLink}
                            className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full border-zinc-300 sm:min-h-0 sm:w-auto"
                        >
                            <ClipboardDocumentIcon className="h-5 w-5 shrink-0" />
                            {copied === 'link' ? 'Link copiado!' : 'Copiar link'}
                        </SecondaryButton>
                        <SecondaryButton
                            type="button"
                            onClick={copyFullMessage}
                            className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full border-zinc-300 sm:min-h-0 sm:w-auto"
                        >
                            <ClipboardDocumentIcon className="h-5 w-5 shrink-0" />
                            {copied === 'message' ? 'Mensagem copiada!' : 'Copiar texto (WhatsApp)'}
                        </SecondaryButton>
                        <button
                            type="button"
                            onClick={openWhatsApp}
                            className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full bg-[#25D366] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#20bd5a] active:scale-[0.99] sm:min-h-0 sm:w-auto sm:py-3"
                        >
                            Abrir WhatsApp
                        </button>
                    </div>
                    {onRotate ? (
                        <div className="flex flex-col gap-2 border-t border-zinc-200 pt-3 dark:border-zinc-800 sm:flex-row sm:items-center sm:justify-between">
                            <button
                                type="button"
                                onClick={onRotate}
                                disabled={rotating}
                                className="inline-flex items-center justify-center gap-2 rounded-full border border-amber-600/60 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-900 dark:border-amber-500/50 dark:bg-amber-950/20 dark:text-amber-200"
                            >
                                <ArrowPathIcon className={`h-4 w-4 ${rotating ? 'animate-spin' : ''}`} />
                                Gerar novo link (invalida o anterior)
                            </button>
                        </div>
                    ) : null}
                </div>
            </div>
        </Modal>
    );
}
