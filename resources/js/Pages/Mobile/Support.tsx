import MobileLayout from '@/Layouts/MobileLayout';
import Modal from '@/Components/Modal';
import AddButton from '@/Components/AddButton';
import PageHeader from '@/Components/PageHeader';
import { Head, Link, useForm } from '@inertiajs/react';
import { useMemo, useState, FormEventHandler, useEffect } from 'react';
import { ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';
import InputLabel from '@/Components/InputLabel';
import Textarea from '@/Components/Textarea';
import TextInput from '@/Components/TextInput';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import InputError from '@/Components/InputError';

type SupportTicketListItem = {
    publicToken: string;
    typeLabel: string;
    status: string;
    statusLabel?: string;
    message: string;
    createdAt: string;
};

interface Props {
    tickets: SupportTicketListItem[];
    isAuthenticated: boolean;
}

function formatWhen(iso: string): string {
    try {
        return new Date(iso).toLocaleString('pt-BR', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    } catch {
        return '—';
    }
}

function statusTone(status: string): string {
    switch (status) {
        case 'waiting_user':
            return 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200';
        case 'resolved':
        case 'closed':
            return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200';
        case 'in_progress':
            return 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200';
        default:
            return 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200';
    }
}

export default function MobileSupport({ tickets, isAuthenticated }: Props) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const { data, setData, post, processing, errors, reset, clearErrors } = useForm({
        type: 'problem' as 'problem' | 'suggestion' | 'praise',
        message: '',
        screenshot_file: null as File | null,
        screenshot_url: '',
        guest_name: '',
        guest_email: '',
        guest_phone: '',
    });

    const [selectedTypeLabel, setSelectedTypeLabel] = useState<string>('Relatar problema');

    const onChangeType = (v: 'problem' | 'suggestion' | 'praise') => {
        setData('type', v);
        setSelectedTypeLabel(v === 'problem' ? 'Relatar problema' : v === 'suggestion' ? 'Enviar sugestão' : 'Enviar elogio');
    };

    const openModal = () => {
        clearErrors();
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        reset();
        clearErrors();
    };

    const screenshotPreview = useMemo(() => {
        if (!data.screenshot_file) return null;
        return URL.createObjectURL(data.screenshot_file);
    }, [data.screenshot_file]);

    useEffect(() => {
        return () => {
            if (screenshotPreview) URL.revokeObjectURL(screenshotPreview);
        };
    }, [screenshotPreview]);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('mobile.support.store'), {
            forceFormData: true,
            onSuccess: () => {
                closeModal();
            },
        });
    };

    return (
        <MobileLayout>
            <Head title="Suporte do app" />
            <div className="space-y-5">
                <PageHeader
                    lead={
                        <Link href={route('mobile.more')} className="text-sm text-zinc-500 underline dark:text-zinc-400">
                            ← Mais
                        </Link>
                    }
                    title="Suporte do app"
                    subtitle={
                        <>
                            <span className="block text-zinc-600 dark:text-zinc-400">
                                Relate um problema, envie uma sugestão ou deixe seu elogio.
                            </span>
                            {!isAuthenticated ? (
                                <span className="mt-2 block text-xs text-amber-800 dark:text-amber-200/90">
                                    Pode enviar sem login; o chat completo fica disponível após entrar na conta.
                                </span>
                            ) : null}
                        </>
                    }
                    actions={<AddButton variant="icon" onClick={openModal} title="Novo chamado de suporte">Novo chamado</AddButton>}
                />

                <div>
                    <h2 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-white">
                        {isAuthenticated ? 'Os meus chamados' : 'Chamados'}
                    </h2>
                    {tickets.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-zinc-200 px-4 py-10 text-center dark:border-zinc-700">
                            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-100 dark:bg-zinc-800">
                                <ChatBubbleLeftRightIcon className="h-7 w-7 text-zinc-400 dark:text-zinc-500" />
                            </div>
                            <p className="text-sm text-zinc-600 dark:text-zinc-400">
                                Nenhum chamado em aberto aqui. Toque em <span className="font-semibold">+</span> para enviar o
                                primeiro.
                            </p>
                        </div>
                    ) : (
                        <ul className="space-y-3">
                            {tickets.map((t) => (
                                <li key={t.publicToken}>
                                    <Link
                                        href={route('mobile.support.ticket', { token: t.publicToken })}
                                        className="block overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition hover:border-zinc-300 hover:shadow-md active:scale-[0.99] dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-600"
                                    >
                                        <div className="flex items-start justify-between gap-3 px-4 py-3">
                                            <div className="min-w-0 flex-1">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className="rounded-full bg-primary-100 px-2.5 py-0.5 text-xs font-semibold text-primary-800 dark:bg-primary-900/40 dark:text-primary-200">
                                                        {t.typeLabel}
                                                    </span>
                                                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                                                        {formatWhen(t.createdAt)}
                                                    </span>
                                                </div>
                                                <p className="mt-2 line-clamp-2 text-sm text-zinc-700 dark:text-zinc-300">
                                                    {t.message}
                                                </p>
                                            </div>
                                            <span
                                                className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${statusTone(t.status)}`}
                                            >
                                                {t.statusLabel ?? 'Aberto'}
                                            </span>
                                        </div>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>

            <Modal show={isModalOpen} onClose={closeModal} maxWidth="2xl">
                <form onSubmit={submit} className="p-6">
                    <h2 className="mb-1 text-lg font-semibold text-zinc-900 dark:text-white">Novo chamado</h2>
                    <p className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">
                        Tipo: <span className="font-medium text-zinc-700 dark:text-zinc-300">{selectedTypeLabel}</span>
                    </p>

                    <div className="space-y-4">
                        <div className="rounded-2xl border border-zinc-200 bg-zinc-50/80 p-4 dark:border-zinc-700 dark:bg-zinc-800/40">
                            <InputLabel value="Tipo de contato" />
                            <div className="mt-2 space-y-2">
                                <label className="flex cursor-pointer items-start gap-2">
                                    <input
                                        type="radio"
                                        checked={data.type === 'problem'}
                                        onChange={() => onChangeType('problem')}
                                        className="mt-1"
                                    />
                                    <span className="text-sm text-zinc-900 dark:text-zinc-100">Relatar problema</span>
                                </label>
                                <label className="flex cursor-pointer items-start gap-2">
                                    <input
                                        type="radio"
                                        checked={data.type === 'suggestion'}
                                        onChange={() => onChangeType('suggestion')}
                                        className="mt-1"
                                    />
                                    <span className="text-sm text-zinc-900 dark:text-zinc-100">Enviar sugestão</span>
                                </label>
                                <label className="flex cursor-pointer items-start gap-2">
                                    <input
                                        type="radio"
                                        checked={data.type === 'praise'}
                                        onChange={() => onChangeType('praise')}
                                        className="mt-1"
                                    />
                                    <span className="text-sm text-zinc-900 dark:text-zinc-100">Enviar elogio</span>
                                </label>
                            </div>
                            <InputError message={errors.type} className="mt-1" />
                        </div>

                        <div>
                            <InputLabel value="Descrição" />
                            <Textarea
                                value={data.message}
                                onChange={(e) => setData('message', e.target.value)}
                                rows={5}
                                className="mt-1"
                                placeholder="Escreva com o máximo de detalhes possível…"
                            />
                            <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{data.message.length}/5000</div>
                            <InputError message={errors.message} className="mt-1" />
                        </div>

                        <div className="rounded-2xl border border-zinc-200 bg-zinc-50/80 p-4 dark:border-zinc-700 dark:bg-zinc-800/40">
                            <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Print (opcional)</div>
                            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                                Pode anexar uma imagem ou colar link do print.
                            </p>
                            <div className="mt-3 space-y-3">
                                <div>
                                    <InputLabel value="Anexar imagem" />
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => setData('screenshot_file', e.target.files?.[0] ?? null)}
                                        className="mt-1 block w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
                                    />
                                    <InputError message={errors.screenshot_file} className="mt-1" />
                                </div>
                                <div>
                                    <InputLabel value="Ou colar link do print" />
                                    <TextInput
                                        value={data.screenshot_url}
                                        onChange={(e) => setData('screenshot_url', e.target.value)}
                                        className="mt-1 block w-full"
                                        placeholder="https://..."
                                    />
                                    <InputError message={errors.screenshot_url} className="mt-1" />
                                </div>
                                <div
                                    onPaste={(e) => {
                                        const file = e.clipboardData?.files?.[0];
                                        if (file && file.type.startsWith('image/')) {
                                            e.preventDefault();
                                            setData('screenshot_file', file);
                                        }
                                    }}
                                    className="rounded-xl border border-dashed border-zinc-300 px-3 py-2 text-xs text-zinc-600 dark:border-zinc-600 dark:text-zinc-300"
                                >
                                    Dica: copie um print e cole aqui (Ctrl/Cmd + V).
                                </div>
                                {screenshotPreview ? (
                                    <img
                                        src={screenshotPreview}
                                        alt="Pré-visualização do print"
                                        className="max-h-48 rounded-xl border border-zinc-200 object-contain dark:border-zinc-700"
                                    />
                                ) : null}
                            </div>
                        </div>

                        {!isAuthenticated && (
                            <div className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
                                <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Seus dados (opcional)</div>
                                <div>
                                    <InputLabel value="Nome" />
                                    <TextInput
                                        value={data.guest_name}
                                        onChange={(e) => setData('guest_name', e.target.value)}
                                        className="mt-1 block w-full"
                                    />
                                    <InputError message={errors.guest_name} className="mt-1" />
                                </div>
                                <div>
                                    <InputLabel value="E-mail" />
                                    <TextInput
                                        type="email"
                                        value={data.guest_email}
                                        onChange={(e) => setData('guest_email', e.target.value)}
                                        className="mt-1 block w-full"
                                    />
                                    <InputError message={errors.guest_email} className="mt-1" />
                                </div>
                                <div>
                                    <InputLabel value="Telefone" />
                                    <TextInput
                                        value={data.guest_phone}
                                        onChange={(e) => setData('guest_phone', e.target.value)}
                                        className="mt-1 block w-full"
                                    />
                                    <InputError message={errors.guest_phone} className="mt-1" />
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="mt-8 flex gap-2">
                        <SecondaryButton type="button" className="flex-1" disabled={processing} onClick={closeModal}>
                            Cancelar
                        </SecondaryButton>
                        <PrimaryButton type="submit" className="flex-1" disabled={processing}>
                            Enviar chamado
                        </PrimaryButton>
                    </div>
                </form>
            </Modal>
        </MobileLayout>
    );
}
