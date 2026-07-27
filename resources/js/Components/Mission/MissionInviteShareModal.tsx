import Modal from '@/Components/Modal';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import { ClipboardDocumentIcon } from '@heroicons/react/24/outline';
import { useMemo, useState } from 'react';

export function buildMissionInviteWhatsAppText(link: string, inviteeName: string): string {
    const greeting = inviteeName.trim() ? `Olá, ${inviteeName.trim()}!` : 'Olá!';
    return `${greeting} Nossa equipe missionária gostaria de dar continuidade ao seu cadastro no programa Missão.

Acesse o formulário pelo link:

${link}`;
}

function whatsAppUrl(phone: string | null | undefined, text: string): string {
    const digits = (phone ?? '').replace(/\D/g, '');
    if (digits.length >= 10) {
        const normalized = digits.startsWith('55') ? digits : `55${digits}`;

        return `https://wa.me/${normalized}?text=${encodeURIComponent(text)}`;
    }

    return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

interface Props {
    show: boolean;
    link: string;
    inviteeName?: string;
    phone?: string | null;
    onClose: () => void;
}

export default function MissionInviteShareModal({ show, link, inviteeName = '', phone = null, onClose }: Props) {
    const [copied, setCopied] = useState<'link' | 'message' | null>(null);

    const whatsappText = useMemo(() => buildMissionInviteWhatsAppText(link, inviteeName), [link, inviteeName]);

    const copyLink = async () => {
        try {
            await navigator.clipboard.writeText(link);
            setCopied('link');
            window.setTimeout(() => setCopied(null), 2000);
        } catch {
            setCopied(null);
        }
    };

    const copyFullMessage = async () => {
        try {
            await navigator.clipboard.writeText(whatsappText);
            setCopied('message');
            window.setTimeout(() => setCopied(null), 2000);
        } catch {
            setCopied(null);
        }
    };

    const openWhatsApp = () => {
        window.open(whatsAppUrl(phone, whatsappText), '_blank', 'noopener,noreferrer');
    };

    return (
        <Modal show={show} onClose={onClose} maxWidth="md">
            <div className="flex max-h-[min(90vh,640px)] flex-col">
                <div className="shrink-0 px-5 pt-6 pb-2 sm:px-7 sm:pt-7">
                    <h2 className="text-lg font-bold leading-tight tracking-tight text-zinc-900 dark:text-white">
                        Convite Missão
                    </h2>
                    {inviteeName ? <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{inviteeName}</p> : null}
                    <p className="mt-4 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
                        Compartilhe o link do formulário Missão com esta pessoa. Se houver telefone cadastrado, o WhatsApp abre
                        com a mensagem pronta.
                    </p>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto px-5 py-3 sm:px-7">
                    <label className="block text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                        Link do formulário
                    </label>
                    <input
                        type="text"
                        readOnly
                        value={link}
                        className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-xs text-zinc-800 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-100"
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
                </div>
            </div>
        </Modal>
    );
}
