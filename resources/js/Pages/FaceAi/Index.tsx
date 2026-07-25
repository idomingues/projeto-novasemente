import AdminLayout from '@/Layouts/AdminLayout';
import FaceEnrollmentCamera from '@/Components/FaceAi/FaceEnrollmentCamera';
import PageHeader from '@/Components/PageHeader';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import { Head, router, usePage } from '@inertiajs/react';
import { CameraIcon, CheckCircleIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { useCallback, useState } from 'react';
import { confirmAction } from '@/utils/confirmDialog';

type IdentityPayload = {
    id: number;
    reference_photo_url: string;
    embedding_dim: number;
    model_version: string;
    liveness_passed_at: string | null;
    updated_at: string | null;
};

type Props = {
    identity: IdentityPayload | null;
};

type PageProps = {
    csrf_token?: string;
    flash?: { success?: string; error?: string };
};

function formatWhen(iso: string | null): string {
    if (!iso) return '';
    return new Date(iso).toLocaleString('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export default function FaceAiIndex({ identity }: Props) {
    const page = usePage().props as PageProps;
    const [sessionOpen, setSessionOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const start = () => {
        setError(null);
        setSessionOpen(true);
    };

    const cancel = () => {
        if (saving) return;
        setSessionOpen(false);
        setError(null);
    };

    const onComplete = useCallback(
        async (payload: { blob: Blob; embedding: number[]; modelVersion: string }) => {
            setSaving(true);
            setError(null);
            try {
                const form = new FormData();
                form.append('photo', payload.blob, 'face.jpg');
                form.append('model_version', payload.modelVersion);
                form.append('liveness_passed', '1');
                form.append('embedding_json', JSON.stringify(payload.embedding));

                const csrf =
                    page.csrf_token ??
                    document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ??
                    '';

                const res = await fetch(route('face-ai.store'), {
                    method: 'POST',
                    headers: {
                        'X-CSRF-TOKEN': csrf,
                        Accept: 'application/json',
                        'X-Requested-With': 'XMLHttpRequest',
                    },
                    body: form,
                    credentials: 'same-origin',
                });

                const data = await res.json().catch(() => null);
                if (!res.ok) {
                    const msg =
                        data?.message ||
                        data?.errors?.photo?.[0] ||
                        data?.errors?.embedding_json?.[0] ||
                        'Não foi possível salvar o cadastro facial.';
                    throw new Error(msg);
                }

                setSessionOpen(false);
                router.visit(route('face-ai.index'), { preserveScroll: true });
            } catch (e) {
                setError(e instanceof Error ? e.message : 'Falha ao salvar.');
                setSessionOpen(false);
            } finally {
                setSaving(false);
            }
        },
        [page.csrf_token],
    );

    const remove = async () => {
        const ok = await confirmAction({
            title: 'Remover cadastro facial?',
            text: 'A foto de referência e a matriz serão apagadas. Você poderá cadastrar de novo.',
            confirmButtonText: 'Remover',
        });
        if (!ok) return;
        router.delete(route('face-ai.destroy'));
    };

    return (
        <AdminLayout>
            <Head title="IA Foto" />

            <div className="mx-auto w-full max-w-3xl">
                <PageHeader
                    title="IA Foto"
                    subtitle="Página de teste (admin): cadastre um rosto com câmera e prova de movimento. Depois acoplamos no app."
                />

                {page.flash?.success ? (
                    <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-100">
                        {page.flash.success}
                    </div>
                ) : null}

                {error ? (
                    <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-100">
                        {error}
                    </div>
                ) : null}

                {!sessionOpen ? (
                    <div className="space-y-5 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
                        {identity ? (
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                                <img
                                    src={identity.reference_photo_url}
                                    alt="Foto de referência do rosto"
                                    className="h-40 w-40 shrink-0 rounded-2xl object-cover ring-1 ring-zinc-200 dark:ring-zinc-700"
                                />
                                <div className="min-w-0 flex-1 space-y-2">
                                    <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
                                        <CheckCircleIcon className="h-5 w-5 shrink-0" />
                                        <p className="font-medium">Rosto cadastrado</p>
                                    </div>
                                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                                        Matriz {identity.embedding_dim}d · modelo{' '}
                                        <span className="font-mono text-xs">{identity.model_version}</span>
                                    </p>
                                    <p className="text-sm text-zinc-500 dark:text-zinc-500">
                                        Vivacidade:{' '}
                                        {formatWhen(identity.liveness_passed_at) || '—'}
                                        {identity.updated_at
                                            ? ` · Atualizado ${formatWhen(identity.updated_at)}`
                                            : ''}
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="flex gap-3">
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-200">
                                    <SparklesIcon className="h-6 w-6" />
                                </div>
                                <div>
                                    <p className="font-medium text-zinc-900 dark:text-zinc-100">
                                        Nenhum rosto cadastrado ainda
                                    </p>
                                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                                        Ao iniciar, a câmera pedirá movimentos simples (esquerda, direita e
                                        frente) e depois gera a matriz do rosto. Isso não altera a foto de
                                        perfil.
                                    </p>
                                </div>
                            </div>
                        )}

                        <div className="flex flex-wrap gap-2 border-t border-zinc-100 pt-4 dark:border-zinc-800">
                            <PrimaryButton type="button" onClick={start} className="cursor-pointer">
                                <CameraIcon className="mr-2 h-5 w-5" />
                                {identity ? 'Atualizar identificação' : 'Iniciar identificação'}
                            </PrimaryButton>
                            {identity ? (
                                <SecondaryButton
                                    type="button"
                                    onClick={remove}
                                    className="cursor-pointer"
                                >
                                    Remover cadastro
                                </SecondaryButton>
                            ) : null}
                        </div>
                    </div>
                ) : (
                    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
                        <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
                            Siga as instruções na tela. Mantenha o rosto no oval com boa iluminação.
                            {saving ? ' Salvando…' : ''}
                        </p>
                        <FaceEnrollmentCamera onComplete={onComplete} onCancel={cancel} busy={saving} />
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}
