import AdminLayout from '@/Layouts/AdminLayout';
import AddButton from '@/Components/AddButton';
import Modal from '@/Components/Modal';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import Textarea from '@/Components/Textarea';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import InputError from '@/Components/InputError';
import SelectInput from '@/Components/SelectInput';
import PageHeader from '@/Components/PageHeader';
import ListCardActionRow from '@/Components/ListCard/ListCardActionRow';
import ListCardIconActionButton from '@/Components/ListCard/ListCardIconActionButton';
import PollCardResults from '@/Components/Polls/PollCardResults';
import PollResultsCard from '@/Components/Polls/PollResultsCard';
import type { PollResults } from '@/Components/Polls/pollTypes';
import { useListModalSubmit } from '@/hooks/useListModalSubmit';
import { confirmAction } from '@/utils/confirmDialog';
import { Head, useForm, router } from '@inertiajs/react';
import {
    ArrowDownIcon,
    ArrowTopRightOnSquareIcon,
    ArrowUpIcon,
    Bars3Icon,
    ChartBarIcon,
    ClipboardDocumentIcon,
    PencilIcon,
    PlusIcon,
    TrashIcon,
} from '@heroicons/react/24/outline';
import { FormEventHandler, useCallback, useEffect, useRef, useState } from 'react';

type PollOptionForm = {
    id?: number | null;
    label: string;
};

type PollRow = {
    id: number;
    question: string;
    allow_multiple: boolean;
    response_type?: 'choice' | 'text';
    response_type_label?: string;
    shows_results?: boolean;
    status: string;
    status_label: string;
    options_count: number;
    votes_count: number;
    options: PollOptionForm[];
    results: PollResults | null;
    text_answers?: { id: number; answer_text: string; user_name: string | null; created_at: string | null }[];
    created_at: string | null;
    public_token: string | null;
    public_url: string | null;
    vote_url: string | null;
    display_bg_color: string;
    display_font: string;
    display_chart: string;
    display_logo: string;
    display_logo_url: string | null;
    display_enabled: boolean;
    publish_to_feed?: boolean;
};

type DisplayLogoOption = {
    key: string;
    label: string;
    url: string | null;
};

type Props = {
    polls: PollRow[];
    statuses: Record<string, string>;
    responseTypes?: Record<string, string>;
    displayFonts: Record<string, string>;
    displayCharts: Record<string, string>;
    displayLogos: DisplayLogoOption[];
    canManage?: boolean;
};

const emptyOptions = (): PollOptionForm[] => [{ label: '' }, { label: '' }];

type ModalTab = 'enquete' | 'resultado' | 'exibicao';

const DEFAULT_BG = '#0f172a';

const STATUS_META: Record<string, { dot: string; active: string; hint: string }> = {
    draft: {
        dot: 'bg-amber-400',
        active:
            'border-amber-400 bg-amber-50 text-amber-950 shadow-sm dark:border-amber-500 dark:bg-amber-950/50 dark:text-amber-100',
        hint: 'Só quem administra vê',
    },
    open: {
        dot: 'bg-emerald-500',
        active:
            'border-emerald-500 bg-emerald-50 text-emerald-950 shadow-sm dark:border-emerald-500 dark:bg-emerald-950/50 dark:text-emerald-100',
        hint: 'Visível para a congregação',
    },
    closed: {
        dot: 'bg-zinc-400',
        active:
            'border-zinc-400 bg-zinc-100 text-zinc-900 shadow-sm dark:border-zinc-500 dark:bg-zinc-800 dark:text-zinc-100',
        hint: 'Não aceita novos votos',
    },
};

const sectionLabelClass =
    'text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400 dark:text-zinc-500';

export default function Index({
    polls,
    statuses,
    responseTypes = { choice: 'Múltipla escolha', text: 'Texto livre' },
    displayFonts,
    displayCharts,
    displayLogos,
    canManage = false,
}: Props) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [saveMessage, setSaveMessage] = useState<string | null>(null);
    const [modalTab, setModalTab] = useState<ModalTab>('enquete');
    const [linkCopied, setLinkCopied] = useState<'painel' | 'voto' | null>(null);
    const syncFormAfterReloadRef = useRef(false);

    const { data, setData, errors, reset, clearErrors, setError } = useForm({
        question: '',
        allow_multiple: false,
        response_type: 'choice' as 'choice' | 'text',
        status: 'open',
        options: emptyOptions() as PollOptionForm[],
        display_bg_color: DEFAULT_BG,
        display_font: 'sans',
        display_chart: 'bar',
        display_logo: 'horizontal-color',
        display_enabled: true,
        publish_to_feed: true,
    });

    const { saving, save } = useListModalSubmit({
        reloadOnly: ['polls'],
        setError,
        clearErrors,
    });

    const editingPoll = editingId != null ? polls.find((p) => p.id === editingId) ?? null : null;

    const showSaveMessage = useCallback((message: string) => {
        setSaveMessage(message);
        window.setTimeout(() => setSaveMessage(null), 5000);
    }, []);

    const syncEditModalUrl = useCallback((id: number | null) => {
        if (typeof window === 'undefined') {
            return;
        }
        const params = new URLSearchParams(window.location.search);
        if (id != null && id > 0) {
            params.set('modal', 'edit');
            params.set('id', String(id));
        } else {
            params.delete('modal');
            params.delete('id');
        }
        const q = params.toString();
        const next = `${window.location.pathname}${q ? `?${q}` : ''}`;
        const current = `${window.location.pathname}${window.location.search}`;
        if (next !== current) {
            window.history.replaceState({}, '', next);
        }
    }, []);

    const applyPollToForm = useCallback(
        (poll: PollRow) => {
            setData({
                question: poll.question,
                allow_multiple: poll.allow_multiple,
                response_type: poll.response_type === 'text' ? 'text' : 'choice',
                status: poll.status,
                options:
                    poll.response_type === 'text'
                        ? []
                        : poll.options.length >= 2
                          ? poll.options.map((o) => ({ id: o.id ?? null, label: o.label }))
                          : emptyOptions(),
                display_bg_color: poll.display_bg_color || DEFAULT_BG,
                display_font: poll.display_font || 'sans',
                display_chart: poll.display_chart || 'bar',
                display_logo: poll.display_logo || 'horizontal-color',
                display_enabled: poll.response_type === 'text' ? false : (poll.display_enabled ?? true),
                publish_to_feed: poll.publish_to_feed ?? true,
            });
        },
        [setData],
    );

    const openCreateModal = () => {
        setIsEditing(false);
        setEditingId(null);
        setSaveMessage(null);
        setLinkCopied(null);
        setModalTab('enquete');
        syncEditModalUrl(null);
        reset();
        setData({
            question: '',
            allow_multiple: false,
            response_type: 'choice',
            status: 'open',
            options: emptyOptions(),
            display_bg_color: DEFAULT_BG,
            display_font: 'sans',
            display_chart: 'bar',
            display_logo: 'horizontal-color',
            display_enabled: true,
            publish_to_feed: true,
        });
        clearErrors();
        setIsModalOpen(true);
    };

    const openEditModal = (poll: PollRow) => {
        setIsEditing(true);
        setEditingId(poll.id);
        setSaveMessage(null);
        setLinkCopied(null);
        setModalTab('enquete');
        syncEditModalUrl(poll.id);
        applyPollToForm(poll);
        clearErrors();
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setSaveMessage(null);
        setLinkCopied(null);
        setModalTab('enquete');
        syncEditModalUrl(null);
        reset();
        setEditingId(null);
        setIsEditing(false);
    };

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }
        const params = new URLSearchParams(window.location.search);
        if (params.get('modal') !== 'edit') {
            return;
        }
        const id = Number(params.get('id'));
        if (Number.isNaN(id) || id <= 0) {
            return;
        }
        const poll = polls.find((p) => p.id === id);
        if (!poll) {
            return;
        }
        if (!isModalOpen || editingId !== id) {
            openEditModal(poll);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [polls]);

    useEffect(() => {
        if (!syncFormAfterReloadRef.current || editingId == null || !isModalOpen) {
            return;
        }
        const poll = polls.find((p) => p.id === editingId);
        if (!poll) {
            return;
        }
        applyPollToForm(poll);
        syncFormAfterReloadRef.current = false;
    }, [polls, editingId, isModalOpen, applyPollToForm]);

    const updateOption = (index: number, label: string) => {
        const next = data.options.map((opt, i) => (i === index ? { ...opt, label } : opt));
        setData('options', next);
    };

    const addOption = () => {
        if (data.options.length >= 20) {
            return;
        }
        setData('options', [...data.options, { label: '' }]);
    };

    const removeOption = (index: number) => {
        if (data.options.length <= 2) {
            return;
        }
        setData(
            'options',
            data.options.filter((_, i) => i !== index),
        );
    };

    const moveOption = (index: number, direction: -1 | 1) => {
        const target = index + direction;
        if (target < 0 || target >= data.options.length) {
            return;
        }
        const next = [...data.options];
        const tmp = next[index];
        next[index] = next[target];
        next[target] = tmp;
        setData('options', next);
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        void (async () => {
            const payload = {
                question: data.question,
                allow_multiple: false,
                response_type: data.response_type,
                status: data.status,
                options:
                    data.response_type === 'text'
                        ? []
                        : data.options.map((o) => ({
                              id: o.id ?? null,
                              label: o.label,
                          })),
                display_bg_color: data.display_bg_color,
                display_font: data.display_font,
                display_chart: data.display_chart,
                display_logo: data.display_logo,
                display_enabled: data.response_type === 'text' ? false : data.display_enabled,
                publish_to_feed: data.publish_to_feed,
            };
            const outcome = await save(
                isEditing,
                editingId,
                payload,
                route('polls.store'),
                (id) => route('polls.update', id),
            );
            if (!outcome.ok) {
                return;
            }
            if (isEditing) {
                showSaveMessage('Enquete atualizada.');
                return;
            }
            showSaveMessage('Enquete criada.');
            const newId = outcome.createdId;
            if (newId) {
                syncFormAfterReloadRef.current = true;
                setIsEditing(true);
                setEditingId(newId);
                syncEditModalUrl(newId);
            } else {
                reset();
                setData({
                    question: '',
                    allow_multiple: false,
                    response_type: 'choice',
                    status: 'open',
                    options: emptyOptions(),
                    display_bg_color: DEFAULT_BG,
                    display_font: 'sans',
                    display_chart: 'bar',
                    display_logo: 'horizontal-color',
                    display_enabled: true,
                    publish_to_feed: true,
                });
            }
        })();
    };

    const copyLink = async (kind: 'painel' | 'voto') => {
        const url = kind === 'painel' ? editingPoll?.public_url : editingPoll?.vote_url;
        if (!url) {
            return;
        }
        try {
            await navigator.clipboard.writeText(url);
            setLinkCopied(kind);
            window.setTimeout(() => setLinkCopied(null), 2500);
        } catch {
            setLinkCopied(null);
        }
    };

    const handleDelete = async (id: number) => {
        const ok = await confirmAction({
            title: 'Excluir enquete?',
            text: 'Todos os votos desta enquete serão removidos.',
            confirmButtonText: 'Excluir',
            danger: true,
        });
        if (!ok) {
            return;
        }
        if (editingId === id) {
            closeModal();
        }
        router.delete(route('polls.destroy', id), { preserveScroll: true });
    };

    const statusBadgeClass = (status: string) => {
        if (status === 'open') {
            return 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200/80 dark:bg-emerald-950/50 dark:text-emerald-200 dark:ring-emerald-800/60';
        }
        if (status === 'closed') {
            return 'bg-zinc-100 text-zinc-700 ring-1 ring-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-700';
        }
        return 'bg-amber-50 text-amber-800 ring-1 ring-amber-200/80 dark:bg-amber-950/40 dark:text-amber-200 dark:ring-amber-800/50';
    };

    const statusHint = STATUS_META[data.status]?.hint ?? '';

    return (
        <AdminLayout>
            <Head title="Enquetes" />
            <div className="space-y-6">
                <PageHeader
                    title="Enquetes"
                    subtitle="Publique perguntas objetivas no estilo WhatsApp para a congregação responder."
                    actions={
                        canManage ? (
                            <AddButton variant="icon" onClick={openCreateModal} title="Nova enquete">
                                Nova enquete
                            </AddButton>
                        ) : undefined
                    }
                />

                {polls.length === 0 ? (
                    <div className="rounded-3xl border border-dashed border-zinc-300 bg-gradient-to-b from-white to-zinc-50 p-12 text-center dark:border-zinc-700 dark:from-zinc-900 dark:to-zinc-950">
                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-300">
                            <ChartBarIcon className="h-7 w-7" />
                        </div>
                        <p className="mt-4 text-base font-semibold text-zinc-900 dark:text-zinc-50">Nenhuma enquete ainda</p>
                        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                            Crie a primeira pergunta e acompanhe os votos em tempo real.
                        </p>
                        {canManage && (
                            <SecondaryButton type="button" className="mt-5 cursor-pointer" onClick={openCreateModal}>
                                Criar primeira enquete
                            </SecondaryButton>
                        )}
                    </div>
                ) : (
                    <ul className="space-y-3">
                        {polls.map((poll) => (
                            <li
                                key={poll.id}
                                className="group rounded-3xl border border-zinc-200/80 bg-white p-4 shadow-sm ring-1 ring-black/[0.02] transition hover:border-emerald-200 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:ring-white/[0.03] dark:hover:border-emerald-800"
                            >
                                <button
                                    type="button"
                                    onClick={() => openEditModal(poll)}
                                    className="w-full cursor-pointer text-left"
                                >
                                    <div className="flex flex-wrap items-start justify-between gap-2">
                                        <h2 className="text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
                                            {poll.question}
                                        </h2>
                                        <span
                                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusBadgeClass(poll.status)}`}
                                        >
                                            <span
                                                className={`h-1.5 w-1.5 rounded-full ${STATUS_META[poll.status]?.dot ?? 'bg-zinc-400'}`}
                                            />
                                            {poll.status_label}
                                        </span>
                                    </div>
                                    <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                                        {poll.options_count} opções · {poll.votes_count}{' '}
                                        {poll.votes_count === 1 ? 'voto' : 'votos'} · 1 por pessoa
                                    </p>
                                    {poll.results && <PollCardResults results={poll.results} />}
                                </button>
                                {canManage && (
                                    <ListCardActionRow className="mt-3">
                                        <ListCardIconActionButton
                                            label="Editar"
                                            icon={<PencilIcon className="h-4 w-4" />}
                                            onClick={() => openEditModal(poll)}
                                        />
                                        <ListCardIconActionButton
                                            label="Excluir"
                                            icon={<TrashIcon className="h-4 w-4" />}
                                            tone="danger"
                                            onClick={() => void handleDelete(poll.id)}
                                        />
                                    </ListCardActionRow>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <Modal
                show={isModalOpen}
                onClose={closeModal}
                maxWidth="lg"
                footer={
                    <div className="flex flex-wrap items-center justify-end gap-2">
                        <SecondaryButton type="button" className="cursor-pointer" onClick={closeModal}>
                            Fechar
                        </SecondaryButton>
                        {canManage && (modalTab === 'enquete' || modalTab === 'exibicao') && (
                            <PrimaryButton
                                type="submit"
                                form="poll-form"
                                className="cursor-pointer"
                                disabled={saving}
                            >
                                {saving ? 'Salvando…' : 'Salvar'}
                            </PrimaryButton>
                        )}
                    </div>
                }
            >
                <div className="space-y-5 bg-gradient-to-b from-zinc-50/80 to-white p-4 dark:from-zinc-950/40 dark:to-zinc-900 sm:p-6">
                    <div>
                        <p className={sectionLabelClass}>Gestão</p>
                        <h2 className="mt-1 text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
                            {isEditing ? 'Editar enquete' : 'Criar enquete'}
                        </h2>
                        {saveMessage && (
                            <p className="mt-2 text-sm font-medium text-emerald-700 dark:text-emerald-400">
                                {saveMessage}
                            </p>
                        )}
                    </div>

                    {isEditing && (
                        <nav
                            role="tablist"
                            aria-label="Seções da enquete"
                            className="flex gap-1 rounded-2xl bg-zinc-100/80 p-1 dark:bg-zinc-800/80"
                        >
                            <button
                                type="button"
                                role="tab"
                                aria-selected={modalTab === 'enquete'}
                                className={`flex-1 cursor-pointer rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                                    modalTab === 'enquete'
                                        ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-900 dark:text-zinc-50'
                                        : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
                                }`}
                                onClick={() => setModalTab('enquete')}
                            >
                                Enquete
                            </button>
                            <button
                                type="button"
                                role="tab"
                                aria-selected={modalTab === 'resultado'}
                                className={`flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                                    modalTab === 'resultado'
                                        ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-900 dark:text-zinc-50'
                                        : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
                                }`}
                                onClick={() => setModalTab('resultado')}
                            >
                                Resultado
                                {editingPoll != null && editingPoll.votes_count > 0 ? (
                                    <span className="inline-flex min-h-[1.15rem] min-w-[1.15rem] items-center justify-center rounded-full bg-emerald-100 px-1.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
                                        {editingPoll.votes_count}
                                    </span>
                                ) : null}
                            </button>
                            <button
                                type="button"
                                role="tab"
                                aria-selected={modalTab === 'exibicao'}
                                className={`flex-1 cursor-pointer rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                                    modalTab === 'exibicao'
                                        ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-900 dark:text-zinc-50'
                                        : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
                                }`}
                                onClick={() => setModalTab('exibicao')}
                            >
                                Exibição
                            </button>
                        </nav>
                    )}

                    {(modalTab === 'enquete' || modalTab === 'exibicao') && (
                        <form id="poll-form" onSubmit={submit} className="space-y-5">
                            {modalTab === 'enquete' && (
                                <>
                            <section className="rounded-3xl border border-zinc-200/80 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900 sm:p-5">
                                <InputLabel
                                    htmlFor="poll_question"
                                    value="Pergunta"
                                    className={sectionLabelClass}
                                />
                                <Textarea
                                    id="poll_question"
                                    value={data.question}
                                    onChange={(e) => setData('question', e.target.value)}
                                    rows={4}
                                    className="mt-2 block w-full resize-y rounded-2xl border-zinc-200 px-4 py-3 text-base leading-relaxed shadow-none focus:border-emerald-500 focus:ring-emerald-500/20 dark:border-zinc-700"
                                    placeholder="Qual o tema que gostaria de ver?"
                                    disabled={!canManage}
                                />
                                <InputError message={errors.question} className="mt-1" />

                                <InputLabel
                                    htmlFor="poll_response_type"
                                    value="Tipo de resposta"
                                    className={`${sectionLabelClass} mt-4`}
                                />
                                <SelectInput
                                    id="poll_response_type"
                                    className="mt-2 w-full"
                                    value={data.response_type}
                                    disabled={!canManage}
                                    onChange={(e) => {
                                        const next = e.target.value === 'text' ? 'text' : 'choice';
                                        setData({
                                            ...data,
                                            response_type: next,
                                            options:
                                                next === 'text'
                                                    ? []
                                                    : data.options.length >= 2
                                                      ? data.options
                                                      : emptyOptions(),
                                            display_enabled: next === 'text' ? false : data.display_enabled,
                                        });
                                    }}
                                >
                                    {Object.entries(responseTypes).map(([value, label]) => (
                                        <option key={value} value={value}>
                                            {label}
                                        </option>
                                    ))}
                                </SelectInput>
                                {data.response_type === 'text' ? (
                                    <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                                        Texto livre (até 2 linhas). Não há resultado público — as respostas ficam só no
                                        painel.
                                    </p>
                                ) : null}
                            </section>

                            {data.response_type === 'text' ? (
                                <section className="rounded-3xl border border-dashed border-zinc-200 bg-zinc-50/60 p-4 text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-300 sm:p-5">
                                    Sem opções de múltipla escolha. O membro escreve a sugestão no app.
                                </section>
                            ) : (
                            <section className="rounded-3xl border border-zinc-200/80 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900 sm:p-5">
                                <InputLabel value="Opções" className={sectionLabelClass} />
                                <div className="mt-3 space-y-2.5">
                                    {data.options.map((option, index) => (
                                        <div
                                            key={option.id ?? `new-${index}`}
                                            className="flex items-center gap-2 rounded-2xl border border-zinc-200 bg-zinc-50/70 px-2 py-1.5 transition focus-within:border-emerald-400 focus-within:bg-white focus-within:ring-2 focus-within:ring-emerald-500/15 dark:border-zinc-700 dark:bg-zinc-800/50 dark:focus-within:border-emerald-600 dark:focus-within:bg-zinc-900"
                                        >
                                            <Bars3Icon className="ml-1 h-4 w-4 shrink-0 text-zinc-300 dark:text-zinc-600" />
                                            <TextInput
                                                value={option.label}
                                                onChange={(e) => updateOption(index, e.target.value)}
                                                className="block w-full border-0 bg-transparent shadow-none focus:ring-0 dark:bg-transparent"
                                                placeholder={`Opção ${index + 1}`}
                                                disabled={!canManage}
                                            />
                                            {canManage && (
                                                <div className="flex shrink-0 items-center gap-0.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => moveOption(index, -1)}
                                                        disabled={index === 0}
                                                        className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl text-zinc-400 hover:bg-white hover:text-zinc-700 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-zinc-700 dark:hover:text-zinc-200"
                                                        aria-label="Subir opção"
                                                    >
                                                        <ArrowUpIcon className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => moveOption(index, 1)}
                                                        disabled={index === data.options.length - 1}
                                                        className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl text-zinc-400 hover:bg-white hover:text-zinc-700 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-zinc-700 dark:hover:text-zinc-200"
                                                        aria-label="Descer opção"
                                                    >
                                                        <ArrowDownIcon className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeOption(index)}
                                                        disabled={data.options.length <= 2}
                                                        className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl text-zinc-400 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-red-950/40"
                                                        aria-label="Remover opção"
                                                    >
                                                        <TrashIcon className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                    {canManage && data.options.length < 20 && (
                                        <button
                                            type="button"
                                            onClick={addOption}
                                            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-zinc-300 px-3 py-3 text-sm font-medium text-zinc-500 transition hover:border-emerald-400 hover:bg-emerald-50/50 hover:text-emerald-700 dark:border-zinc-600 dark:text-zinc-400 dark:hover:border-emerald-600 dark:hover:bg-emerald-950/30 dark:hover:text-emerald-300"
                                        >
                                            <PlusIcon className="h-4 w-4" />
                                            Adicionar opção
                                        </button>
                                    )}
                                </div>
                                <InputError
                                    message={errors.options || (errors as Record<string, string>)['options.0.label']}
                                    className="mt-2"
                                />
                            </section>
                            )}

                            <section className="rounded-3xl border border-zinc-200/80 bg-white px-4 py-4 text-sm text-zinc-600 shadow-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 sm:px-5">
                                {data.response_type === 'text'
                                    ? 'Cada pessoa envia uma sugestão (até duas linhas). Não há gráfico de resultado.'
                                    : 'Cada pessoa pode votar só uma vez. Visitantes sem login ficam limitados pelo IP.'}
                            </section>
                            <InputError message={errors.allow_multiple} className="mt-1" />

                            <section className="rounded-3xl border border-zinc-200/80 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900 sm:p-5">
                                <InputLabel value="Status" className={sectionLabelClass} />
                                <div
                                    role="radiogroup"
                                    aria-label="Status da enquete"
                                    className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3"
                                >
                                    {Object.entries(statuses).map(([value, label]) => {
                                        const meta = STATUS_META[value];
                                        const active = data.status === value;
                                        return (
                                            <button
                                                key={value}
                                                type="button"
                                                role="radio"
                                                aria-checked={active}
                                                disabled={!canManage}
                                                onClick={() => canManage && setData('status', value)}
                                                className={`cursor-pointer rounded-2xl border px-3 py-3 text-left transition disabled:cursor-not-allowed disabled:opacity-60 ${
                                                    active
                                                        ? meta?.active ??
                                                          'border-zinc-900 bg-zinc-50 text-zinc-900 dark:border-white dark:bg-zinc-800 dark:text-white'
                                                        : 'border-zinc-200 bg-zinc-50/50 text-zinc-600 hover:border-zinc-300 hover:bg-white dark:border-zinc-700 dark:bg-zinc-800/40 dark:text-zinc-300 dark:hover:border-zinc-600'
                                                }`}
                                            >
                                                <span className="flex items-center gap-2 text-sm font-semibold">
                                                    <span
                                                        className={`h-2 w-2 rounded-full ${meta?.dot ?? 'bg-zinc-400'}`}
                                                    />
                                                    {label}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                                {statusHint && (
                                    <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">{statusHint}</p>
                                )}
                                <InputError message={errors.status} className="mt-1" />
                            </section>

                            <section className="flex items-center justify-between gap-4 rounded-3xl border border-zinc-200/80 bg-white px-4 py-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900 sm:px-5">
                                <div>
                                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                                        Publicar no feed de Publicações
                                    </p>
                                    <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                                        Quando a enquete estiver aberta, aparece no feed do app
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => canManage && setData('publish_to_feed', !data.publish_to_feed)}
                                    disabled={!canManage}
                                    className={`relative inline-flex h-8 w-14 shrink-0 cursor-pointer items-center rounded-full transition-colors disabled:cursor-not-allowed ${
                                        data.publish_to_feed ? 'bg-emerald-600' : 'bg-zinc-300 dark:bg-zinc-600'
                                    }`}
                                    role="switch"
                                    aria-checked={data.publish_to_feed}
                                    aria-label="Publicar no feed de Publicações"
                                >
                                    <span
                                        className={`inline-block h-6 w-6 transform rounded-full bg-white shadow transition-transform ${
                                            data.publish_to_feed ? 'translate-x-7' : 'translate-x-1'
                                        }`}
                                    />
                                </button>
                            </section>
                            <InputError message={errors.publish_to_feed} className="mt-1" />
                                </>
                            )}

                            {modalTab === 'exibicao' && (
                                <>
                                    <section className="rounded-3xl border border-zinc-200/80 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900 sm:p-5">
                                        <InputLabel value="Link para votar" className={sectionLabelClass} />
                                        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                                            Compartilhe com a congregação. Não precisa de login — 1 voto por IP.
                                        </p>
                                        {editingPoll?.vote_url ? (
                                            <div className="mt-3 space-y-2">
                                                <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-700 break-all dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                                                    {editingPoll.vote_url}
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    <SecondaryButton
                                                        type="button"
                                                        className="cursor-pointer"
                                                        onClick={() => void copyLink('voto')}
                                                    >
                                                        <ClipboardDocumentIcon className="mr-1.5 h-4 w-4" />
                                                        {linkCopied === 'voto' ? 'Copiado!' : 'Copiar link'}
                                                    </SecondaryButton>
                                                    <a
                                                        href={editingPoll.vote_url}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="inline-flex cursor-pointer items-center rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
                                                    >
                                                        <ArrowTopRightOnSquareIcon className="mr-1.5 h-4 w-4" />
                                                        Abrir votação
                                                    </a>
                                                </div>
                                            </div>
                                        ) : (
                                            <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
                                                Salve a enquete para gerar o link de voto.
                                            </p>
                                        )}
                                    </section>

                                    <section className="rounded-3xl border border-zinc-200/80 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900 sm:p-5">
                                        <InputLabel value="Link do painel" className={sectionLabelClass} />
                                        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                                            Abra em TV ou projetor para mostrar o resultado em tempo real.
                                        </p>
                                        {editingPoll?.public_url ? (
                                            <div className="mt-3 space-y-2">
                                                <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-700 break-all dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                                                    {editingPoll.public_url}
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    <SecondaryButton
                                                        type="button"
                                                        className="cursor-pointer"
                                                        onClick={() => void copyLink('painel')}
                                                    >
                                                        <ClipboardDocumentIcon className="mr-1.5 h-4 w-4" />
                                                        {linkCopied === 'painel' ? 'Copiado!' : 'Copiar link'}
                                                    </SecondaryButton>
                                                    <a
                                                        href={editingPoll.public_url}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="inline-flex cursor-pointer items-center rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
                                                    >
                                                        <ArrowTopRightOnSquareIcon className="mr-1.5 h-4 w-4" />
                                                        Abrir painel
                                                    </a>
                                                </div>
                                            </div>
                                        ) : (
                                            <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
                                                Salve a enquete para gerar o link público.
                                            </p>
                                        )}
                                    </section>

                                    <section className="flex items-center justify-between gap-4 rounded-3xl border border-zinc-200/80 bg-white px-4 py-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900 sm:px-5">
                                        <div>
                                            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                                                Painel público ativo
                                            </p>
                                            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                                                Se desativado, o link responde como indisponível
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => canManage && setData('display_enabled', !data.display_enabled)}
                                            disabled={!canManage}
                                            className={`relative inline-flex h-8 w-14 shrink-0 cursor-pointer items-center rounded-full transition-colors disabled:cursor-not-allowed ${
                                                data.display_enabled ? 'bg-emerald-600' : 'bg-zinc-300 dark:bg-zinc-600'
                                            }`}
                                            role="switch"
                                            aria-checked={data.display_enabled}
                                        >
                                            <span
                                                className={`inline-block h-6 w-6 transform rounded-full bg-white shadow transition-transform ${
                                                    data.display_enabled ? 'translate-x-7' : 'translate-x-1'
                                                }`}
                                            />
                                        </button>
                                    </section>

                                    <section className="rounded-3xl border border-zinc-200/80 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900 sm:p-5">
                                        <InputLabel value="Cor de fundo" className={sectionLabelClass} />
                                        <div className="mt-3 flex items-center gap-3">
                                            <input
                                                type="color"
                                                value={data.display_bg_color || DEFAULT_BG}
                                                onChange={(e) => setData('display_bg_color', e.target.value)}
                                                disabled={!canManage}
                                                className="h-11 w-14 cursor-pointer rounded-xl border border-zinc-200 bg-white p-1 disabled:cursor-not-allowed dark:border-zinc-700"
                                                aria-label="Cor de fundo do painel"
                                            />
                                            <TextInput
                                                value={data.display_bg_color}
                                                onChange={(e) => setData('display_bg_color', e.target.value)}
                                                className="block w-full max-w-[10rem] font-mono text-sm uppercase"
                                                disabled={!canManage}
                                            />
                                        </div>
                                        <InputError message={errors.display_bg_color} className="mt-1" />
                                    </section>

                                    <section className="rounded-3xl border border-zinc-200/80 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900 sm:p-5">
                                        <InputLabel value="Fonte" className={sectionLabelClass} />
                                        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                                            {Object.entries(displayFonts).map(([value, label]) => {
                                                const active = data.display_font === value;
                                                return (
                                                    <button
                                                        key={value}
                                                        type="button"
                                                        disabled={!canManage}
                                                        onClick={() => canManage && setData('display_font', value)}
                                                        className={`cursor-pointer rounded-2xl border px-3 py-3 text-left transition disabled:cursor-not-allowed ${
                                                            active
                                                                ? 'border-emerald-500 bg-emerald-50 text-emerald-950 shadow-sm dark:border-emerald-500 dark:bg-emerald-950/40 dark:text-emerald-100'
                                                                : 'border-zinc-200 bg-zinc-50/50 text-zinc-700 hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-800/40 dark:text-zinc-200'
                                                        }`}
                                                    >
                                                        <span
                                                            className="block text-sm font-semibold"
                                                            style={{
                                                                fontFamily:
                                                                    value === 'serif'
                                                                        ? 'Georgia, serif'
                                                                        : value === 'display'
                                                                          ? '"Avenir Next Condensed", "Trebuchet MS", sans-serif'
                                                                          : 'system-ui, sans-serif',
                                                            }}
                                                        >
                                                            {label}
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        <InputError message={errors.display_font} className="mt-1" />
                                    </section>

                                    <section className="rounded-3xl border border-zinc-200/80 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900 sm:p-5">
                                        <InputLabel value="Gráfico" className={sectionLabelClass} />
                                        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                                            {Object.entries(displayCharts).map(([value, label]) => {
                                                const active = data.display_chart === value;
                                                return (
                                                    <button
                                                        key={value}
                                                        type="button"
                                                        disabled={!canManage}
                                                        onClick={() => canManage && setData('display_chart', value)}
                                                        className={`cursor-pointer rounded-2xl border px-3 py-3 text-left transition disabled:cursor-not-allowed ${
                                                            active
                                                                ? 'border-emerald-500 bg-emerald-50 text-emerald-950 shadow-sm dark:border-emerald-500 dark:bg-emerald-950/40 dark:text-emerald-100'
                                                                : 'border-zinc-200 bg-zinc-50/50 text-zinc-700 hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-800/40 dark:text-zinc-200'
                                                        }`}
                                                    >
                                                        <span className="text-sm font-semibold">{label}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        <InputError message={errors.display_chart} className="mt-1" />
                                    </section>

                                    <section className="rounded-3xl border border-zinc-200/80 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900 sm:p-5">
                                        <InputLabel value="Logo Nova Semente" className={sectionLabelClass} />
                                        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                                            Escolha a versão da marca no painel público.
                                        </p>
                                        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                                            {displayLogos.map((logo) => {
                                                const active = data.display_logo === logo.key;
                                                return (
                                                    <button
                                                        key={logo.key}
                                                        type="button"
                                                        disabled={!canManage}
                                                        onClick={() => canManage && setData('display_logo', logo.key)}
                                                        className={`cursor-pointer rounded-2xl border p-3 text-left transition disabled:cursor-not-allowed ${
                                                            active
                                                                ? 'border-emerald-500 bg-emerald-50 shadow-sm dark:border-emerald-500 dark:bg-emerald-950/40'
                                                                : 'border-zinc-200 bg-zinc-50/50 hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-800/40'
                                                        }`}
                                                    >
                                                        <div
                                                            className="mb-2 flex h-14 items-center justify-center rounded-xl px-3"
                                                            style={{ backgroundColor: data.display_bg_color || DEFAULT_BG }}
                                                        >
                                                            {logo.url ? (
                                                                <div className="flex h-10 w-full max-w-[7.5rem] items-center justify-center">
                                                                    <img
                                                                        src={logo.url}
                                                                        alt=""
                                                                        className="h-full w-full object-contain object-center"
                                                                    />
                                                                </div>
                                                            ) : (
                                                                <span className="text-[11px] font-medium text-slate-400">
                                                                    Sem logo
                                                                </span>
                                                            )}
                                                        </div>
                                                        <span
                                                            className={`text-xs font-semibold ${
                                                                active
                                                                    ? 'text-emerald-900 dark:text-emerald-100'
                                                                    : 'text-zinc-700 dark:text-zinc-200'
                                                            }`}
                                                        >
                                                            {logo.label}
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        <InputError message={errors.display_logo} className="mt-1" />
                                    </section>

                                    <section
                                        className="overflow-hidden rounded-3xl border border-zinc-200/80 p-5 shadow-sm dark:border-zinc-700"
                                        style={{
                                            backgroundColor: data.display_bg_color || DEFAULT_BG,
                                            fontFamily:
                                                data.display_font === 'serif'
                                                    ? 'Georgia, serif'
                                                    : data.display_font === 'display'
                                                      ? '"Avenir Next Condensed", "Trebuchet MS", sans-serif'
                                                      : 'system-ui, sans-serif',
                                            color: '#f8fafc',
                                        }}
                                    >
                                        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                                            Prévia do painel
                                        </p>
                                        {(() => {
                                            const selectedLogo = displayLogos.find((l) => l.key === data.display_logo);
                                            return selectedLogo?.url ? (
                                                <div className="mt-3 flex justify-center">
                                                    <div className="flex h-11 w-full max-w-[10.5rem] items-center justify-center">
                                                        <img
                                                            src={selectedLogo.url}
                                                            alt=""
                                                            className="h-full w-full object-contain object-center"
                                                        />
                                                    </div>
                                                </div>
                                            ) : null;
                                        })()}
                                        <p className="mt-3 text-base font-bold leading-snug">
                                            {data.question || 'Sua pergunta aparece aqui'}
                                        </p>
                                        <div key={data.display_chart} className="mt-4">
                                            {(() => {
                                                const previewOptions = data.options
                                                    .filter((o) => o.label.trim())
                                                    .slice(0, 3)
                                                    .map((opt, i) => ({
                                                        label: opt.label,
                                                        percent: [42, 33, 25][i] ?? 10,
                                                        color: ['#34d399', '#60a5fa', '#fbbf24'][i] ?? '#94a3b8',
                                                    }));

                                                if (previewOptions.length === 0) {
                                                    return (
                                                        <p className="text-xs text-slate-400">
                                                            Adicione opções para ver o gráfico.
                                                        </p>
                                                    );
                                                }

                                                if (data.display_chart === 'pie') {
                                                    const size = 120;
                                                    const cx = size / 2;
                                                    const cy = size / 2;
                                                    const radius = 46;
                                                    let angle = -90;
                                                    const slices = previewOptions.map((opt) => {
                                                        const sweep = (opt.percent / 100) * 360;
                                                        const start = angle;
                                                        const end = angle + sweep;
                                                        angle = end;
                                                        const startRad = (start * Math.PI) / 180;
                                                        const endRad = (end * Math.PI) / 180;
                                                        const x1 = cx + radius * Math.cos(startRad);
                                                        const y1 = cy + radius * Math.sin(startRad);
                                                        const x2 = cx + radius * Math.cos(endRad);
                                                        const y2 = cy + radius * Math.sin(endRad);
                                                        const large = sweep > 180 ? 1 : 0;
                                                        const path = `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${large} 1 ${x2} ${y2} Z`;
                                                        return { ...opt, path };
                                                    });

                                                    return (
                                                        <div className="flex items-center gap-4">
                                                            <svg
                                                                viewBox={`0 0 ${size} ${size}`}
                                                                className="h-24 w-24 shrink-0"
                                                                aria-label="Prévia pizza"
                                                            >
                                                                {slices.map((slice, idx) => (
                                                                    <path key={idx} d={slice.path} fill={slice.color} />
                                                                ))}
                                                                <circle
                                                                    cx={cx}
                                                                    cy={cy}
                                                                    r={22}
                                                                    fill={data.display_bg_color || DEFAULT_BG}
                                                                />
                                                            </svg>
                                                            <ul className="min-w-0 space-y-1.5">
                                                                {slices.map((slice, idx) => (
                                                                    <li key={idx} className="flex items-center gap-2 text-xs">
                                                                        <span
                                                                            className="h-2 w-2 shrink-0 rounded-full"
                                                                            style={{ backgroundColor: slice.color }}
                                                                        />
                                                                        <span className="truncate">{slice.label}</span>
                                                                        <span className="tabular-nums text-slate-400">
                                                                            {slice.percent}%
                                                                        </span>
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    );
                                                }

                                                if (data.display_chart === 'column') {
                                                    return (
                                                        <div className="flex h-28 items-end justify-center gap-2">
                                                            {previewOptions.map((opt, i) => (
                                                                <div key={i} className="flex w-12 flex-col items-center gap-1">
                                                                    <div
                                                                        className="w-full rounded-t-md"
                                                                        style={{
                                                                            height: `${Math.max(18, opt.percent * 0.95)}px`,
                                                                            backgroundColor: opt.color,
                                                                        }}
                                                                    />
                                                                    <span className="w-full truncate text-center text-[10px]">
                                                                        {opt.label}
                                                                    </span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    );
                                                }

                                                if (data.display_chart === 'radial') {
                                                    return (
                                                        <div className="flex justify-center gap-3">
                                                            {previewOptions.map((opt, i) => {
                                                                const size = 56;
                                                                const stroke = 6;
                                                                const r = (size - stroke) / 2;
                                                                const c = 2 * Math.PI * r;
                                                                const dash = (opt.percent / 100) * c;
                                                                return (
                                                                    <div key={i} className="flex flex-col items-center gap-1">
                                                                        <svg viewBox={`0 0 ${size} ${size}`} className="h-14 w-14">
                                                                            <circle
                                                                                cx={size / 2}
                                                                                cy={size / 2}
                                                                                r={r}
                                                                                fill="none"
                                                                                stroke="#334155"
                                                                                strokeWidth={stroke}
                                                                            />
                                                                            <circle
                                                                                cx={size / 2}
                                                                                cy={size / 2}
                                                                                r={r}
                                                                                fill="none"
                                                                                stroke={opt.color}
                                                                                strokeWidth={stroke}
                                                                                strokeLinecap="round"
                                                                                strokeDasharray={`${dash} ${c}`}
                                                                                transform={`rotate(-90 ${size / 2} ${size / 2})`}
                                                                            />
                                                                            <text
                                                                                x={size / 2}
                                                                                y={size / 2 + 3}
                                                                                textAnchor="middle"
                                                                                style={{ fill: '#f8fafc', fontSize: 10, fontWeight: 700 }}
                                                                            >
                                                                                {opt.percent}%
                                                                            </text>
                                                                        </svg>
                                                                        <span className="max-w-[3.5rem] truncate text-[10px]">{opt.label}</span>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    );
                                                }

                                                if (data.display_chart === 'ranking') {
                                                    const ranked = [...previewOptions].sort((a, b) => b.percent - a.percent);
                                                    return (
                                                        <ol className="space-y-1.5">
                                                            {ranked.map((opt, i) => (
                                                                <li
                                                                    key={i}
                                                                    className="flex items-center gap-2 rounded-lg bg-white/5 px-2 py-1.5 text-xs"
                                                                >
                                                                    <span className="flex h-5 w-5 items-center justify-center rounded bg-amber-400/90 text-[10px] font-black text-amber-950">
                                                                        {i + 1}
                                                                    </span>
                                                                    <span className="min-w-0 flex-1 truncate">{opt.label}</span>
                                                                    <span className="tabular-nums text-slate-400">{opt.percent}%</span>
                                                                </li>
                                                            ))}
                                                        </ol>
                                                    );
                                                }

                                                if (data.display_chart === 'waffle') {
                                                    const cells: string[] = [];
                                                    previewOptions.forEach((opt) => {
                                                        const n = Math.round(opt.percent / 10);
                                                        for (let i = 0; i < n; i++) {
                                                            cells.push(opt.color);
                                                        }
                                                    });
                                                    while (cells.length < 10) {
                                                        cells.push('#334155');
                                                    }
                                                    return (
                                                        <div>
                                                            <div className="grid grid-cols-10 gap-1">
                                                                {cells.slice(0, 10).map((color, i) => (
                                                                    <div
                                                                        key={i}
                                                                        className="aspect-square rounded-sm"
                                                                        style={{ backgroundColor: color }}
                                                                    />
                                                                ))}
                                                            </div>
                                                            <ul className="mt-2 space-y-1">
                                                                {previewOptions.map((opt, i) => (
                                                                    <li key={i} className="flex items-center gap-2 text-[10px]">
                                                                        <span
                                                                            className="h-2 w-2 rounded-sm"
                                                                            style={{ backgroundColor: opt.color }}
                                                                        />
                                                                        <span className="truncate">{opt.label}</span>
                                                                        <span className="text-slate-400">{opt.percent}%</span>
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    );
                                                }

                                                return (
                                                    <div className="space-y-2">
                                                        {previewOptions.map((opt, i) => (
                                                            <div key={`${opt.label}-${i}`}>
                                                                <div className="mb-1 flex justify-between text-xs">
                                                                    <span>{opt.label}</span>
                                                                    <span>{opt.percent}%</span>
                                                                </div>
                                                                <div className="h-2 rounded-full bg-slate-700">
                                                                    <div
                                                                        className="h-full rounded-full transition-all"
                                                                        style={{
                                                                            width: `${opt.percent}%`,
                                                                            backgroundColor: opt.color,
                                                                        }}
                                                                    />
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    </section>
                                </>
                            )}
                        </form>
                    )}

                    {isEditing && modalTab === 'resultado' && (
                        <div className="space-y-3">
                            {editingPoll?.response_type === 'text' ? (
                                (editingPoll.text_answers?.length ?? 0) > 0 ? (
                                    <ul className="space-y-2">
                                        {editingPoll.text_answers?.map((row) => (
                                            <li
                                                key={row.id}
                                                className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-700 dark:bg-zinc-900"
                                            >
                                                <p className="whitespace-pre-wrap text-sm text-zinc-800 dark:text-zinc-100">
                                                    {row.answer_text}
                                                </p>
                                                <p className="mt-1 text-[11px] text-zinc-500">
                                                    {row.user_name ?? 'Anônimo'}
                                                </p>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="rounded-3xl border border-dashed border-zinc-300 bg-white px-4 py-10 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
                                        Ainda não há sugestões nesta enquete. Não há gráfico de resultado.
                                    </p>
                                )
                            ) : editingPoll?.results ? (
                                <PollResultsCard
                                    question={editingPoll.question}
                                    allowMultiple={false}
                                    results={editingPoll.results}
                                />
                            ) : (
                                <p className="rounded-3xl border border-dashed border-zinc-300 bg-white px-4 py-10 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
                                    Ainda não há votos nesta enquete.
                                </p>
                            )}
                        </div>
                    )}
                </div>
            </Modal>
        </AdminLayout>
    );
}
