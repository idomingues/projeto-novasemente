import MobileLayout from '@/Layouts/MobileLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import {
    BookOpenIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    ClipboardDocumentListIcon,
    EllipsisHorizontalCircleIcon,
    HandRaisedIcon,
    PlusIcon,
    SparklesIcon,
    UserGroupIcon,
} from '@heroicons/react/24/outline';
import Modal from '@/Components/Modal';
import SecondaryButton from '@/Components/SecondaryButton';
import PrimaryButton from '@/Components/PrimaryButton';
import InputLabel from '@/Components/InputLabel';
import Textarea from '@/Components/Textarea';
import InputError from '@/Components/InputError';
import type { ComponentType, SVGProps } from 'react';
import { FormEventHandler, useMemo, useState } from 'react';

interface TypeItem {
    type: string;
    label: string;
}

interface PastorOption {
    value: number;
    label: string;
}

interface Props {
    types: TypeItem[];
    mineUrl: string;
    storeUrl: string;
    pastorOptions: PastorOption[];
}

type IconComponent = ComponentType<SVGProps<SVGSVGElement> & { className?: string }>;

function iconForSolicitationType(type: string): IconComponent {
    switch (type) {
        case 'baptism':
            return SparklesIcon;
        case 'baby_presentation':
            return HandRaisedIcon;
        case 'pastor_visit':
            return UserGroupIcon;
        case 'bible_study':
            return BookOpenIcon;
        case 'other':
        default:
            return EllipsisHorizontalCircleIcon;
    }
}

export default function Hub({ types, mineUrl, storeUrl, pastorOptions }: Props) {
    const [createOpen, setCreateOpen] = useState(false);
    const [step, setStep] = useState<'pick' | 'form'>('pick');
    const [typeLabel, setTypeLabel] = useState('');

    const { data, setData, post, processing, errors, reset } = useForm({
        type: '',
        message: '',
        preferred_date: '',
        assigned_pastor_id: '',
    });

    const typeLabelByType = useMemo(() => {
        const m = new Map<string, string>();
        for (const t of types) {
            m.set(t.type, t.label);
        }
        return m;
    }, [types]);

    const openCreate = () => {
        reset();
        setStep('pick');
        setTypeLabel('');
        setCreateOpen(true);
    };

    const closeCreate = () => {
        setCreateOpen(false);
        setStep('pick');
        setTypeLabel('');
        reset();
    };

    const pickType = (type: string) => {
        setData('type', type);
        setTypeLabel(typeLabelByType.get(type) ?? type);
        setStep('form');
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(storeUrl);
    };

    return (
        <MobileLayout>
            <Head title="Solicitações" />
            <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <h1 className="text-xl font-bold text-zinc-900 dark:text-white">Solicitações</h1>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-0.5">
                            Envie um pedido à igreja e acompanhe as respostas.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={openCreate}
                        className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-zinc-900 text-white shadow-sm ring-1 ring-inset ring-white/10 transition hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-100"
                        aria-label="Nova solicitação"
                        title="Nova solicitação"
                    >
                        <PlusIcon className="h-6 w-6" strokeWidth={2.2} aria-hidden />
                    </button>
                </div>

                <Link
                    href={mineUrl}
                    className="flex items-center gap-4 p-4 rounded-2xl bg-brand-50 dark:bg-brand-950/40 border border-brand-200 dark:border-brand-800 hover:border-brand-300 dark:hover:border-brand-700 transition-colors"
                >
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-brand-100 dark:bg-brand-900/50">
                        <ClipboardDocumentListIcon className="w-6 h-6 text-brand-700 dark:text-brand-300" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <span className="font-semibold text-zinc-900 dark:text-white block">Os meus pedidos</span>
                        <span className="text-sm text-zinc-600 dark:text-zinc-400">Ver estado e conversar com a igreja</span>
                    </div>
                    <ChevronRightIcon className="w-5 h-5 text-zinc-400 shrink-0" />
                </Link>

                <div className="rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-900/50 p-6 text-center">
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        Clique no <strong>+</strong> para criar uma solicitação.
                    </p>
                </div>
            </div>

            <Modal show={createOpen} onClose={closeCreate} maxWidth={step === 'form' ? '2xl' : 'md'}>
                {step === 'pick' ? (
                    <div className="p-6">
                        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-1">Nova solicitação</h2>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-5">Escolha o tipo do seu pedido.</p>

                        <div className="grid grid-cols-1 gap-2">
                            {types.map((t) => {
                                const TypeIcon = iconForSolicitationType(t.type);
                                return (
                                    <button
                                        key={t.type}
                                        type="button"
                                        onClick={() => pickType(t.type)}
                                        className="flex w-full items-center gap-4 p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 active:bg-zinc-50 dark:active:bg-zinc-800 transition-colors text-left"
                                    >
                                        <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-zinc-100 dark:bg-zinc-800">
                                            <TypeIcon className="w-6 h-6 text-zinc-600 dark:text-zinc-400" aria-hidden />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <span className="font-semibold text-zinc-900 dark:text-white block">{t.label}</span>
                                        </div>
                                        <ChevronRightIcon className="w-5 h-5 text-zinc-400 shrink-0" />
                                    </button>
                                );
                            })}
                        </div>

                        <div className="mt-6 flex justify-end">
                            <SecondaryButton type="button" onClick={closeCreate}>
                                Fechar
                            </SecondaryButton>
                        </div>
                    </div>
                ) : (
                    <div className="p-6 sm:p-8">
                        <button
                            type="button"
                            onClick={() => {
                                setStep('pick');
                                setData('type', '');
                                setTypeLabel('');
                            }}
                            className="mb-4 inline-flex items-center gap-1 text-sm font-medium !text-zinc-900 dark:!text-zinc-100 hover:underline"
                        >
                            <ChevronLeftIcon className="h-4 w-4" aria-hidden />
                            Tipos de pedido
                        </button>

                        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">{typeLabel}</h2>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1 mb-6">
                            Descreva o seu pedido. A igreja responderá pela conversa do pedido, através do app web.
                        </p>

                        <form onSubmit={submit} className="space-y-4">
                            <div>
                                <InputLabel htmlFor="hub_sol_pref_date" value="Data pretendida ou relevante (opcional)" />
                                <input
                                    id="hub_sol_pref_date"
                                    type="date"
                                    value={data.preferred_date}
                                    onChange={(e) => setData('preferred_date', e.target.value)}
                                    className="mt-1 block w-full rounded-xl border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white text-sm py-2 px-3"
                                />
                                <InputError message={errors.preferred_date} className="mt-1" />
                            </div>
                            {pastorOptions.length > 0 && (
                                <div>
                                    <InputLabel htmlFor="hub_sol_pastor" value="Pastor (opcional)" />
                                    <select
                                        id="hub_sol_pastor"
                                        value={data.assigned_pastor_id}
                                        onChange={(e) => setData('assigned_pastor_id', e.target.value)}
                                        className="mt-1 block w-full rounded-xl border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white text-sm py-2 px-3"
                                    >
                                        <option value="">— Nenhum —</option>
                                        {pastorOptions.map((o) => (
                                            <option key={o.value} value={String(o.value)}>
                                                {o.label}
                                            </option>
                                        ))}
                                    </select>
                                    <InputError message={errors.assigned_pastor_id} className="mt-1" />
                                </div>
                            )}
                            <div>
                                <InputLabel htmlFor="hub_sol_message" value="Mensagem" />
                                <Textarea
                                    id="hub_sol_message"
                                    value={data.message}
                                    onChange={(e) => setData('message', e.target.value)}
                                    rows={8}
                                    className="mt-1 block w-full"
                                    placeholder="Escreva os detalhes do seu pedido…"
                                    required
                                />
                                <InputError message={errors.message} className="mt-1" />
                            </div>
                            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end pt-2">
                                <SecondaryButton type="button" className="justify-center" onClick={closeCreate}>
                                    Cancelar
                                </SecondaryButton>
                                <PrimaryButton type="submit" disabled={processing} className="justify-center">
                                    Enviar pedido
                                </PrimaryButton>
                            </div>
                        </form>
                    </div>
                )}
            </Modal>
        </MobileLayout>
    );
}
