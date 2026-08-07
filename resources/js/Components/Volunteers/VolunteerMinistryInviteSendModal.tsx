import Modal from '@/Components/Modal';
import PrimaryButton from '@/Components/PrimaryButton';
import RecordDetailHeader from '@/Components/RecordDetail/RecordDetailHeader';
import SecondaryButton from '@/Components/SecondaryButton';
import { inertiaListModalSave } from '@/utils/inertiaListModalSave';
import { missionVolunteerWhatsAppDigits } from '@/utils/missionVolunteerWhatsApp';
import {
    ChatBubbleLeftEllipsisIcon,
    ClipboardDocumentIcon,
    EnvelopeIcon,
    LinkIcon,
} from '@heroicons/react/24/outline';
import { useForm } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';

export type VolunteerMinistryInviteSendPayload = {
    ministryName?: string | null;
    invitePlainMessage?: string | null;
    inviteRegisterUrl?: string | null;
    inviteResendEmailUrl?: string | null;
    volunteerHasLinkedUser?: boolean;
    volunteer: {
        name?: string | null;
        email?: string | null;
        phone?: string | null;
        photoUrl?: string | null;
    };
};

function whatsAppSendPhoneDigits(raw: string | null | undefined): string | null {
    const digits = missionVolunteerWhatsAppDigits(raw);
    return digits.length >= 10 ? digits : null;
}

export default function VolunteerMinistryInviteSendModal({
    show,
    payload,
    onClose,
}: {
    show: boolean;
    payload: VolunteerMinistryInviteSendPayload | null;
    onClose: () => void;
}) {
    const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
    const resendInviteForm = useForm({});

    useEffect(() => {
        if (!show) {
            setCopyFeedback(null);
            resendInviteForm.clearErrors();
            resendInviteForm.reset();
        }
    }, [show]);

    const plainMessage = useMemo(() => (payload?.invitePlainMessage ?? '').trim(), [payload?.invitePlainMessage]);
    const phoneDigits = whatsAppSendPhoneDigits(payload?.volunteer.phone);

    const flashCopyNotice = (message: string) => {
        setCopyFeedback(message);
        window.setTimeout(() => setCopyFeedback(null), 2500);
    };

    const copyRegisterLink = async () => {
        const url = payload?.inviteRegisterUrl?.trim();
        if (!url) return;
        try {
            await navigator.clipboard.writeText(url);
            flashCopyNotice('Link de cadastro copiado.');
        } catch {
            window.prompt('Copie o link de cadastro:', url);
        }
    };

    const copyPlainMessage = async () => {
        if (!plainMessage) return;
        try {
            await navigator.clipboard.writeText(plainMessage);
            flashCopyNotice('Texto completo copiado (igual ao e-mail e ao WhatsApp).');
        } catch {
            window.prompt('Copie a mensagem (e-mail / WhatsApp):', plainMessage);
        }
    };

    const openWhatsApp = () => {
        if (!phoneDigits || !plainMessage) return;
        window.open(
            `https://wa.me/${phoneDigits}?text=${encodeURIComponent(plainMessage)}`,
            '_blank',
            'noopener,noreferrer',
        );
    };

    const submitResendEmail = () => {
        const url = payload?.inviteResendEmailUrl;
        if (!url) return;
        resendInviteForm.post(url, {
            ...inertiaListModalSave,
        });
    };

    return (
        <Modal
            show={show && !!payload}
            onClose={onClose}
            maxWidth="lg"
            footer={
                payload && (plainMessage || payload.inviteResendEmailUrl) ? (
                    <div className="flex w-full flex-col gap-3">
                        {plainMessage ? (
                            <>
                                <PrimaryButton
                                    type="button"
                                    onClick={() => void copyPlainMessage()}
                                    className="!h-11 w-full !rounded-xl !normal-case !tracking-normal"
                                >
                                    <ClipboardDocumentIcon className="mr-2 h-5 w-5 shrink-0" aria-hidden />
                                    Copiar mensagem
                                </PrimaryButton>
                                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                    {payload.inviteRegisterUrl ? (
                                        <SecondaryButton
                                            type="button"
                                            onClick={() => void copyRegisterLink()}
                                            className="!h-11 w-full !rounded-xl !normal-case !tracking-normal"
                                        >
                                            <LinkIcon className="mr-2 h-5 w-5 shrink-0" aria-hidden />
                                            Copiar link de cadastro
                                        </SecondaryButton>
                                    ) : null}
                                    {phoneDigits ? (
                                        <SecondaryButton
                                            type="button"
                                            onClick={openWhatsApp}
                                            className="!h-11 w-full !rounded-xl !normal-case !tracking-normal"
                                        >
                                            <ChatBubbleLeftEllipsisIcon className="mr-2 h-5 w-5 shrink-0" aria-hidden />
                                            WhatsApp
                                        </SecondaryButton>
                                    ) : null}
                                </div>
                                {copyFeedback ? (
                                    <p className="text-center text-sm font-medium text-emerald-700 dark:text-emerald-400">
                                        {copyFeedback}
                                    </p>
                                ) : null}
                            </>
                        ) : null}
                        {payload.inviteResendEmailUrl ? (
                            <div
                                className={`flex flex-col-reverse gap-2 sm:flex-row sm:justify-end ${
                                    plainMessage
                                        ? 'border-t border-zinc-200 pt-3 dark:border-zinc-700'
                                        : ''
                                }`}
                            >
                                <PrimaryButton
                                    type="button"
                                    onClick={submitResendEmail}
                                    disabled={resendInviteForm.processing || !(payload.volunteer.email ?? '').trim()}
                                    className="!h-11 w-full !rounded-xl !normal-case !tracking-normal sm:w-auto"
                                    title={
                                        (payload.volunteer.email ?? '').trim()
                                            ? 'Envia o e-mail com a identidade visual da Nova Semente'
                                            : 'Voluntário sem e-mail cadastrado'
                                    }
                                >
                                    <EnvelopeIcon className="mr-2 h-5 w-5 shrink-0" aria-hidden />
                                    {resendInviteForm.processing ? 'Enviando…' : 'Enviar por e-mail'}
                                </PrimaryButton>
                            </div>
                        ) : null}
                    </div>
                ) : undefined
            }
        >
            {payload ? (
                <div className="space-y-4 px-4 pb-2 pt-2 sm:px-6 sm:pb-4 sm:pt-4">
                    <RecordDetailHeader
                        title={(payload.volunteer.name ?? '').trim() || 'Voluntário'}
                        subtitle={payload.ministryName ?? 'Departamento'}
                        photoUrl={payload.volunteer.photoUrl}
                        badge="Convite ao voluntário"
                    />
                    {payload.volunteerHasLinkedUser ? (
                        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
                            Esta pessoa já tem conta no app. O convite pede aceitar ou recusar no aplicativo; após
                            aceitar, você entra em contato pelo app.
                        </p>
                    ) : null}
                    <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
                        Use o mesmo texto oficial da Nova Semente no e-mail e no WhatsApp — assim o convite chega com
                        mais peso e o voluntário reconhece a igreja.
                    </p>
                    {plainMessage ? (
                        <div className="rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/50">
                            <p className="border-b border-zinc-200 px-3 py-2 text-xs font-medium text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                                Mensagem (igual ao e-mail e ao WhatsApp)
                            </p>
                            <div className="max-h-[min(40vh,20rem)] overflow-y-auto overscroll-y-contain whitespace-pre-wrap px-3 py-3 text-sm leading-relaxed text-zinc-800 dark:text-zinc-100">
                                {plainMessage}
                            </div>
                        </div>
                    ) : (
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">Mensagem do convite indisponível.</p>
                    )}
                    {!phoneDigits && plainMessage ? (
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            Sem telefone válido para abrir o WhatsApp direto — use «Copiar mensagem» e envie pelo
                            aplicativo.
                        </p>
                    ) : null}
                </div>
            ) : null}
        </Modal>
    );
}
