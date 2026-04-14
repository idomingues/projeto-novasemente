import MobileLayout from '@/Layouts/MobileLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { useMemo, useState, FormEventHandler } from 'react';
import { ClipboardDocumentListIcon } from '@heroicons/react/24/outline';
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
    message: string;
    createdAt: string;
};

interface Props {
    tickets: SupportTicketListItem[];
    isAuthenticated: boolean;
}

export default function MobileSupport({ tickets, isAuthenticated }: Props) {
    const { data, setData, post, processing, errors, reset } = useForm({
        type: 'problem' as 'problem' | 'suggestion' | 'praise',
        message: '',
        guest_name: '',
        guest_email: '',
        guest_phone: '',
    });

    const [selectedTypeLabel, setSelectedTypeLabel] = useState<string>('Problema');

    const onChangeType = (v: 'problem' | 'suggestion' | 'praise') => {
        setData('type', v);
        setSelectedTypeLabel(v === 'problem' ? 'Problema' : v === 'suggestion' ? 'Sugestão' : 'Elogio');
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('mobile.support.store'), {
            onSuccess: () => {
                reset();
            },
        });
    };

    const openTickets = useMemo(
        () => tickets.filter((t) => t.status === 'open').slice(0, 10),
        [tickets],
    );

    return (
        <MobileLayout>
            <Head title="Suporte do app" />
            <div className="space-y-6">
                <div>
                    <h1 className="text-xl font-bold text-zinc-900 dark:text-white">Suporte do app</h1>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                        Envie um <span className="font-semibold">{selectedTypeLabel}</span> e acompanhe o andamento.
                    </p>
                </div>

                {!isAuthenticated && (
                    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4 text-sm text-zinc-600 dark:text-zinc-400">
                        Você pode enviar o chamado sem login, mas o chat fica disponível apenas para usuários com conta.
                    </div>
                )}

                <form onSubmit={submit} className="space-y-4">
                    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
                        <InputLabel value="Tipo de contato" />
                        <div className="mt-2 space-y-2">
                            <label className="flex items-start gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    checked={data.type === 'problem'}
                                    onChange={() => onChangeType('problem')}
                                    className="mt-1"
                                />
                                <span className="text-sm text-zinc-900 dark:text-zinc-100">Problema</span>
                            </label>
                            <label className="flex items-start gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    checked={data.type === 'suggestion'}
                                    onChange={() => onChangeType('suggestion')}
                                    className="mt-1"
                                />
                                <span className="text-sm text-zinc-900 dark:text-zinc-100">Sugestão</span>
                            </label>
                            <label className="flex items-start gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    checked={data.type === 'praise'}
                                    onChange={() => onChangeType('praise')}
                                    className="mt-1"
                                />
                                <span className="text-sm text-zinc-900 dark:text-zinc-100">Elogio</span>
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
                            placeholder="Escreva sua mensagem com o máximo de detalhes possível..."
                        />
                        <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                            {data.message.length}/5000
                        </div>
                        <InputError message={errors.message} className="mt-1" />
                    </div>

                    {!isAuthenticated && (
                        <div className="space-y-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
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

                    <div className="flex gap-2">
                        <SecondaryButton type="button" onClick={() => reset()} disabled={processing}>
                            Limpar
                        </SecondaryButton>
                        <PrimaryButton type="submit" disabled={processing} className="flex-1">
                            Enviar chamado
                        </PrimaryButton>
                    </div>
                </form>

                {isAuthenticated && (
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <ClipboardDocumentListIcon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                            <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">Seus chamados abertos</h2>
                        </div>
                        {openTickets.length === 0 ? (
                            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 text-sm text-zinc-600 dark:text-zinc-400">
                                Nenhum chamado aberto.
                            </div>
                        ) : (
                            <ul className="space-y-2">
                                {openTickets.map((t) => (
                                    <li key={t.publicToken}>
                                        <Link
                                            href={route('mobile.support.ticket', { token: t.publicToken })}
                                            className="block rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-sm"
                                        >
                                            <div className="flex items-center justify-between gap-3">
                                                <div className="min-w-0">
                                                    <div className="text-sm font-semibold text-zinc-900 dark:text-white truncate">{t.typeLabel}</div>
                                                    <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 truncate">{t.message}</div>
                                                </div>
                                                <div className="text-xs text-zinc-400 dark:text-zinc-500 whitespace-nowrap">Aberto</div>
                                            </div>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                )}
            </div>
        </MobileLayout>
    );
}

