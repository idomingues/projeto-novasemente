import Checkbox from '@/Components/Checkbox';
import Modal from '@/Components/Modal';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import { router } from '@inertiajs/react';
import { CheckCircleIcon, ExclamationCircleIcon, TrashIcon } from '@heroicons/react/24/outline';
import { useState } from 'react';

type LinkedUser = { id?: number; email?: string | null } | null | undefined;

type ResultModal = {
    kind: 'success' | 'error';
    message: string;
};

type Props = {
    destroyUrl: string;
    volunteerName: string;
    volunteerEmail?: string | null;
    linkedUser?: LinkedUser;
    onSuccess?: () => void;
    className?: string;
};

function flashFromPage(page: { props?: Record<string, unknown> }): { success?: string | null; error?: string | null } {
    const flash = page.props?.flash;
    if (!flash || typeof flash !== 'object') return {};
    const bag = flash as { success?: string | null; error?: string | null };
    return {
        success: typeof bag.success === 'string' && bag.success.trim() !== '' ? bag.success : null,
        error: typeof bag.error === 'string' && bag.error.trim() !== '' ? bag.error : null,
    };
}

export default function VolunteerDeleteConfirmBlock({
    destroyUrl,
    volunteerName,
    volunteerEmail,
    linkedUser,
    onSuccess,
    className = '',
}: Props) {
    const [armed, setArmed] = useState(false);
    const [deleteLinkedUser, setDeleteLinkedUser] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [resultModal, setResultModal] = useState<ResultModal | null>(null);

    const hasLinkedAccount = linkedUser != null && linkedUser.id != null;

    const resetConfirm = () => {
        setArmed(false);
        setDeleteLinkedUser(false);
    };

    const closeResultModal = () => {
        const wasSuccess = resultModal?.kind === 'success';
        setResultModal(null);
        if (wasSuccess) {
            resetConfirm();
            onSuccess?.();
        }
    };

    const executeDelete = () => {
        setProcessing(true);

        router.post(
            destroyUrl,
            {
                _method: 'delete',
                delete_linked_user: deleteLinkedUser,
            },
            {
                preserveScroll: true,
                onSuccess: (page) => {
                    const flash = flashFromPage(page);
                    if (flash.error) {
                        setResultModal({ kind: 'error', message: flash.error });
                        return;
                    }

                    setResultModal({
                        kind: 'success',
                        message: flash.success ?? 'Voluntário excluído com sucesso.',
                    });
                },
                onError: (errors) => {
                    const first = Object.values(errors)[0];
                    setResultModal({
                        kind: 'error',
                        message: typeof first === 'string' ? first : 'Não foi possível excluir este voluntário.',
                    });
                },
                onFinish: () => setProcessing(false),
            },
        );
    };

    return (
        <>
            <div
                className={[
                    'rounded-xl border border-red-200 bg-red-50/50 p-4 dark:border-red-900/50 dark:bg-red-950/20',
                    className,
                ].join(' ')}
            >
                <p className="text-sm font-semibold text-red-900 dark:text-red-200">Remover cadastro</p>
                {!armed ? (
                    <>
                        <p className="mt-1 text-xs text-red-800/90 dark:text-red-300/90">
                            Exclui <strong className="font-semibold">{volunteerName}</strong> da lista de voluntários. Você
                            precisará confirmar antes de apagar.
                        </p>
                        <button
                            type="button"
                            className="mt-3 inline-flex items-center gap-2 rounded-xl border border-red-300 bg-white px-4 py-2.5 text-sm font-semibold text-red-700 shadow-sm transition hover:bg-red-50 dark:border-red-800 dark:bg-zinc-900 dark:text-red-300 dark:hover:bg-red-950/40"
                            onClick={() => setArmed(true)}
                        >
                            <TrashIcon className="h-5 w-5 shrink-0" aria-hidden />
                            Excluir voluntário…
                        </button>
                    </>
                ) : (
                    <div className="mt-3 space-y-3">
                        <p className="text-sm text-red-900 dark:text-red-100">
                            Tem certeza que deseja excluir <strong>{volunteerName}</strong>
                            {volunteerEmail ? (
                                <>
                                    {' '}
                                    (<span className="break-all">{volunteerEmail}</span>)
                                </>
                            ) : null}
                            ? Esta ação não pode ser desfeita.
                        </p>
                        {hasLinkedAccount ? (
                            <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-red-200/80 bg-white/80 px-3 py-2.5 dark:border-red-900/60 dark:bg-zinc-900/80">
                                <Checkbox
                                    checked={deleteLinkedUser}
                                    onChange={(e) => setDeleteLinkedUser(e.target.checked)}
                                    className="mt-0.5"
                                />
                                <span className="text-xs leading-relaxed text-red-900 dark:text-red-100">
                                    Apagar também a conta de acesso ao app
                                    {linkedUser?.email ? (
                                        <>
                                            {' '}
                                            (<span className="break-all font-medium">{linkedUser.email}</span>)
                                        </>
                                    ) : null}
                                    . Se não marcar, só o cadastro de voluntário será removido.
                                </span>
                            </label>
                        ) : null}
                        <div className="flex flex-wrap gap-2">
                            <SecondaryButton type="button" onClick={resetConfirm} disabled={processing}>
                                Cancelar
                            </SecondaryButton>
                            <PrimaryButton
                                type="button"
                                className="!bg-red-600 hover:!bg-red-700 dark:!bg-red-600 dark:hover:!bg-red-700"
                                disabled={processing}
                                onClick={executeDelete}
                            >
                                {processing ? 'Excluindo…' : 'Confirmar exclusão'}
                            </PrimaryButton>
                        </div>
                    </div>
                )}
            </div>

            <Modal show={resultModal != null} onClose={closeResultModal} maxWidth="sm" closeable>
                <div className="px-6 py-8 text-center sm:px-8">
                    {resultModal?.kind === 'success' ? (
                        <CheckCircleIcon className="mx-auto h-14 w-14 text-emerald-600 dark:text-emerald-400" aria-hidden />
                    ) : (
                        <ExclamationCircleIcon className="mx-auto h-14 w-14 text-red-600 dark:text-red-400" aria-hidden />
                    )}
                    <h3 className="mt-4 text-lg font-semibold text-zinc-900 dark:text-white">
                        {resultModal?.kind === 'success' ? 'Exclusão concluída' : 'Não foi possível excluir'}
                    </h3>
                    <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">{resultModal?.message}</p>
                    <PrimaryButton type="button" className="mt-6 w-full justify-center sm:w-auto" onClick={closeResultModal}>
                        {resultModal?.kind === 'success' ? 'OK' : 'Fechar'}
                    </PrimaryButton>
                </div>
            </Modal>
        </>
    );
}
