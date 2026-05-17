import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import PageHeader from '@/Components/PageHeader';
import Card from '@/Components/Card';
import TextInput from '@/Components/TextInput';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import Modal from '@/Components/Modal';
import InputError from '@/Components/InputError';
import SelectInput from '@/Components/SelectInput';
import { FormEventHandler, useCallback, useEffect, useMemo, useState } from 'react';
import {
    AdjustmentsHorizontalIcon,
    ChatBubbleLeftRightIcon,
    ChevronDownIcon,
    ChevronUpIcon,
    MagnifyingGlassIcon,
    PlusIcon,
    StarIcon,
    TrashIcon,
} from '@heroicons/react/24/outline';
import { confirmAction } from '@/utils/confirmDialog';
import { formatListPreview } from '@/utils/formatListPreview';

interface MinistryRef {
    id: number;
    name: string;
}

interface Criterion {
    id: number;
    label: string;
    sort_order: number;
    destroyUrl: string;
}

interface VolunteerSignals {
    memberNs: boolean;
    sixMonthsInChurchOrLetter: boolean;
    ministryExperienceDeclared: boolean;
}

interface VolunteerRow {
    id: number;
    name: string | null;
    email: string | null;
    phone: string | null;
    active: boolean;
    createdAt: string | null;
    inThisMinistry: boolean;
    ministryNames: string[];
    interestPreview: string | null;
    signals: VolunteerSignals;
    clearanceStatus: string;
    criteriaMet: number;
    criteriaTotal: number;
    showUrl: string | null;
}

interface BoardFilters {
    search: string;
    has_whatsapp: string;
    has_social_networks: string;
    is_official_member: string;
    has_previous_ministry_volunteer_experience: string;
    needs_pastoral_guidance: string;
    lgpd_data_consent: string;
    active: string;
    app_access_only: string;
    attendance_duration: string;
    created_from: string;
    created_to: string;
    text_interest: string;
    in_ministry: string;
}

interface Paginated<T> {
    data: T[];
    links: { url: string | null; label: string; active: boolean }[];
    meta?: { current_page: number; last_page: number };
}

interface Props {
    ministry: MinistryRef;
    criteria: Criterion[];
    volunteers: Paginated<VolunteerRow>;
    filters: BoardFilters;
    indexUrl: string;
    storeCriterionUrl: string;
    attachVolunteerUrl: string;
    lookupVolunteersUrl: string;
    assistantUrl: string;
}

function clearanceLabel(s: string): string {
    switch (s) {
        case 'cleared':
            return 'Liberado';
        case 'blocked':
            return 'Bloqueado';
        default:
            return 'Pendente';
    }
}

function formatShortDate(iso: string | null): string {
    if (!iso) return '—';
    try {
        const d = new Date(iso);
        return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
        return '—';
    }
}

const triStateOptions = (
    <>
        <option value="">Qualquer</option>
        <option value="1">Sim</option>
        <option value="0">Não</option>
    </>
);

export default function Board({
    ministry,
    criteria,
    volunteers,
    filters,
    indexUrl,
    storeCriterionUrl,
    attachVolunteerUrl,
    lookupVolunteersUrl,
    assistantUrl,
}: Props) {
    const page = usePage();
    const csrf = (page.props as { csrf_token?: string }).csrf_token ?? '';

    const filterForm = useForm<BoardFilters>({ ...filters });
    const filtersKey = useMemo(() => JSON.stringify(filters), [filters]);
    useEffect(() => {
        filterForm.setData({ ...filters });
        // eslint-disable-next-line react-hooks/exhaustive-deps -- sincronizar com URL após navegação Inertia
    }, [filtersKey]);

    const [criteriaOpen, setCriteriaOpen] = useState(false);
    const [filtersOpen, setFiltersOpen] = useState(true);
    const [assistantOpen, setAssistantOpen] = useState(false);
    const [assistantInput, setAssistantInput] = useState('');
    const [assistantMessages, setAssistantMessages] = useState<{ role: 'user' | 'assistant'; text: string }[]>([]);
    const [assistantLoading, setAssistantLoading] = useState(false);
    const [pendingAssistantFilters, setPendingAssistantFilters] = useState<Partial<BoardFilters> | null>(null);

    const [addOpen, setAddOpen] = useState(false);
    const [lookupQ, setLookupQ] = useState('');
    const [lookupResults, setLookupResults] = useState<{ id: number; name: string | null; email: string | null }[]>([]);
    const [lookupLoading, setLookupLoading] = useState(false);
    const [forwardingId, setForwardingId] = useState<number | null>(null);

    const criterionForm = useForm({ label: '' });
    const attachForm = useForm({ volunteer_id: '' as string | number });

    useEffect(() => {
        const t = window.setTimeout(() => {
            if (lookupQ.trim().length < 2) {
                setLookupResults([]);
                return;
            }
            setLookupLoading(true);
            const url = `${lookupVolunteersUrl}?q=${encodeURIComponent(lookupQ.trim())}`;
            fetch(url, {
                headers: {
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRF-TOKEN': csrf,
                },
                credentials: 'same-origin',
            })
                .then((r) => r.json())
                .then((j: { results?: { id: number; name: string | null; email: string | null }[] }) => {
                    setLookupResults(j.results ?? []);
                })
                .catch(() => setLookupResults([]))
                .finally(() => setLookupLoading(false));
        }, 320);
        return () => window.clearTimeout(t);
    }, [lookupQ, lookupVolunteersUrl, csrf]);

    const applyFilters: FormEventHandler = (e) => {
        e.preventDefault();
        const data = Object.fromEntries(
            Object.entries(filterForm.data).filter(([, v]) => v !== '' && v !== null && v !== undefined),
        ) as Record<string, string>;
        router.get(route('ministry-lead.volunteers.board', ministry.id), data, { preserveState: true, replace: true });
    };

    const clearFilters = () => {
        router.get(route('ministry-lead.volunteers.board', ministry.id), {}, { preserveState: true, replace: true });
    };

    const submitCriterion: FormEventHandler = (e) => {
        e.preventDefault();
        criterionForm.post(storeCriterionUrl, {
            preserveScroll: true,
            onSuccess: () => {
                criterionForm.reset('label');
            },
        });
    };

    const attachVolunteer: FormEventHandler = (e) => {
        e.preventDefault();
        attachForm.post(attachVolunteerUrl, {
            preserveScroll: true,
            onSuccess: () => {
                setAddOpen(false);
                setLookupQ('');
                setLookupResults([]);
                attachForm.reset('volunteer_id');
            },
        });
    };

    const pickResult = useCallback(
        (id: number) => {
            attachForm.setData('volunteer_id', id);
        },
        [attachForm],
    );

    const forwardOne = (volunteerId: number) => {
        setForwardingId(volunteerId);
        router.post(
            attachVolunteerUrl,
            { volunteer_id: volunteerId },
            {
                preserveScroll: true,
                onFinish: () => setForwardingId(null),
            },
        );
    };

    const sendAssistant = async () => {
        const msg = assistantInput.trim();
        if (!msg || assistantLoading) return;
        setAssistantInput('');
        setAssistantMessages((m) => [...m, { role: 'user', text: msg }]);
        setAssistantLoading(true);
        setPendingAssistantFilters(null);
        try {
            const r = await fetch(assistantUrl, {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRF-TOKEN': csrf,
                },
                credentials: 'same-origin',
                body: JSON.stringify({ message: msg }),
            });
            const j = (await r.json()) as { reply?: string; filters?: Record<string, string> };
            const reply = typeof j.reply === 'string' ? j.reply : 'Sem resposta.';
            setAssistantMessages((m) => [...m, { role: 'assistant', text: reply }]);
            if (j.filters && typeof j.filters === 'object' && Object.keys(j.filters).length > 0) {
                setPendingAssistantFilters(j.filters as Partial<BoardFilters>);
            }
        } catch {
            setAssistantMessages((m) => [...m, { role: 'assistant', text: 'Não foi possível contactar o assistente. Tente de novo.' }]);
        } finally {
            setAssistantLoading(false);
        }
    };

    const applyAssistantFilters = () => {
        if (!pendingAssistantFilters) return;
        const merged = { ...filterForm.data, ...pendingAssistantFilters };
        const data = Object.fromEntries(Object.entries(merged).filter(([, v]) => v !== '' && v !== null && v !== undefined)) as Record<
            string,
            string
        >;
        setPendingAssistantFilters(null);
        router.get(route('ministry-lead.volunteers.board', ministry.id), data, { preserveState: true, replace: true });
    };

    return (
        <AdminLayout>
            <Head title={`Voluntários — ${ministry.name}`} />
            <PageHeader
                lead={
                    <Link href={indexUrl} className="text-sm font-medium text-primary-600 hover:underline dark:text-primary-400">
                        ← Todos os ministérios
                    </Link>
                }
                title={ministry.name}
                subtitle="Lista de voluntários cadastrados na igreja (como em Voluntários). Filtre pelo formulário de inscrição, encaminhe para este ministério e faça a liberação na ficha."
            />

            <button
                type="button"
                onClick={() => setCriteriaOpen((o) => !o)}
                className="mb-3 flex w-full items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-left text-sm font-semibold text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
            >
                <span className="flex items-center gap-2">
                    <StarIcon className="h-5 w-5 text-amber-500" aria-hidden />
                    Critérios de liberação neste ministério (opcional)
                </span>
                {criteriaOpen ? <ChevronUpIcon className="h-5 w-5" /> : <ChevronDownIcon className="h-5 w-5" />}
            </button>
            {criteriaOpen ? (
                <Card className="mb-6">
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-3">
                        Estrelas manuais por pessoa já neste ministério — use a ficha para marcar. A lista abaixo inclui todos os cadastros.
                    </p>
                    {criteria.length === 0 ? (
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-3">
                            Ainda não definiu critérios. Adicione abaixo (ex.: «Membro NS», «Experiência com crianças»).
                        </p>
                    ) : (
                        <ul className="mb-3 space-y-1 text-sm text-zinc-700 dark:text-zinc-300">
                            {criteria.map((c) => (
                                <li key={c.id} className="flex items-center justify-between gap-2">
                                    <span className="flex items-center gap-2 min-w-0">
                                        <StarIcon className="h-4 w-4 text-amber-500 shrink-0" aria-hidden />
                                        <span className="truncate">{c.label}</span>
                                    </span>
                                    <button
                                        type="button"
                                        title="Remover critério"
                                        className="shrink-0 rounded p-1 text-zinc-400 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/40 dark:hover:text-red-300"
                                        onClick={async () => {
                                            const ok = await confirmAction({
                                                title: 'Remover critério?',
                                                text: 'Remove o critério para todos os voluntários deste ministério.',
                                                icon: 'warning',
                                                danger: true,
                                                confirmButtonText: 'Remover',
                                            });
                                            if (!ok) return;
                                            router.delete(c.destroyUrl, { preserveScroll: true });
                                        }}
                                    >
                                        <TrashIcon className="h-4 w-4" aria-hidden />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                    <form onSubmit={submitCriterion} className="flex flex-col gap-2 sm:flex-row sm:items-end">
                        <div className="flex-1">
                            <InputLabel htmlFor="crit_label" value="Novo critério" />
                            <TextInput
                                id="crit_label"
                                value={criterionForm.data.label}
                                onChange={(e) => criterionForm.setData('label', e.target.value)}
                                className="mt-1"
                                placeholder="Ex.: Tem experiência com crianças"
                            />
                            <InputError message={criterionForm.errors.label} className="mt-1" />
                        </div>
                        <PrimaryButton type="submit" disabled={criterionForm.processing} className="shrink-0">
                            Adicionar
                        </PrimaryButton>
                    </form>
                </Card>
            ) : null}

            <button
                type="button"
                onClick={() => setFiltersOpen((o) => !o)}
                className="mb-3 flex w-full items-center justify-between rounded-xl border border-zinc-200 bg-white px-4 py-3 text-left text-sm font-semibold text-zinc-900 shadow-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
            >
                <span className="flex items-center gap-2">
                    <AdjustmentsHorizontalIcon className="h-5 w-5 text-zinc-500" aria-hidden />
                    Filtros do cadastro de voluntários
                </span>
                {filtersOpen ? <ChevronUpIcon className="h-5 w-5" /> : <ChevronDownIcon className="h-5 w-5" />}
            </button>
            {filtersOpen ? (
                <Card className="mb-6">
                    <form onSubmit={applyFilters} className="space-y-4">
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            <div className="sm:col-span-2 lg:col-span-3">
                                <InputLabel htmlFor="f_search" value="Nome, e-mail ou telefone" />
                                <TextInput
                                    id="f_search"
                                    value={filterForm.data.search}
                                    onChange={(e) => filterForm.setData('search', e.target.value)}
                                    className="mt-1"
                                    placeholder="Pesquisa geral"
                                />
                            </div>
                            <div>
                                <InputLabel htmlFor="f_in_min" value="Relação com este ministério" />
                                <SelectInput
                                    id="f_in_min"
                                    className="mt-1"
                                    value={filterForm.data.in_ministry}
                                    onChange={(e) => filterForm.setData('in_ministry', e.target.value)}
                                >
                                    <option value="any">Todos</option>
                                    <option value="no">Ainda não encaminhados para aqui</option>
                                    <option value="yes">Já neste ministério</option>
                                </SelectInput>
                            </div>
                            <div>
                                <InputLabel htmlFor="f_whatsapp" value="Tem WhatsApp?" />
                                <SelectInput
                                    id="f_whatsapp"
                                    className="mt-1"
                                    value={filterForm.data.has_whatsapp}
                                    onChange={(e) => filterForm.setData('has_whatsapp', e.target.value)}
                                >
                                    {triStateOptions}
                                </SelectInput>
                            </div>
                            <div>
                                <InputLabel htmlFor="f_social" value="Redes sociais" />
                                <SelectInput
                                    id="f_social"
                                    className="mt-1"
                                    value={filterForm.data.has_social_networks}
                                    onChange={(e) => filterForm.setData('has_social_networks', e.target.value)}
                                >
                                    {triStateOptions}
                                </SelectInput>
                            </div>
                            <div>
                                <InputLabel htmlFor="f_member" value="Membro oficial" />
                                <SelectInput
                                    id="f_member"
                                    className="mt-1"
                                    value={filterForm.data.is_official_member}
                                    onChange={(e) => filterForm.setData('is_official_member', e.target.value)}
                                >
                                    {triStateOptions}
                                </SelectInput>
                            </div>
                            <div>
                                <InputLabel htmlFor="f_prev" value="Experiência em ministério antes" />
                                <SelectInput
                                    id="f_prev"
                                    className="mt-1"
                                    value={filterForm.data.has_previous_ministry_volunteer_experience}
                                    onChange={(e) => filterForm.setData('has_previous_ministry_volunteer_experience', e.target.value)}
                                >
                                    {triStateOptions}
                                </SelectInput>
                            </div>
                            <div>
                                <InputLabel htmlFor="f_past" value="Precisa orientação pastoral" />
                                <SelectInput
                                    id="f_past"
                                    className="mt-1"
                                    value={filterForm.data.needs_pastoral_guidance}
                                    onChange={(e) => filterForm.setData('needs_pastoral_guidance', e.target.value)}
                                >
                                    {triStateOptions}
                                </SelectInput>
                            </div>
                            <div>
                                <InputLabel htmlFor="f_lgpd" value="Consentimento LGPD" />
                                <SelectInput
                                    id="f_lgpd"
                                    className="mt-1"
                                    value={filterForm.data.lgpd_data_consent}
                                    onChange={(e) => filterForm.setData('lgpd_data_consent', e.target.value)}
                                >
                                    {triStateOptions}
                                </SelectInput>
                            </div>
                            <div>
                                <InputLabel htmlFor="f_active" value="Ativo" />
                                <SelectInput
                                    id="f_active"
                                    className="mt-1"
                                    value={filterForm.data.active}
                                    onChange={(e) => filterForm.setData('active', e.target.value)}
                                >
                                    {triStateOptions}
                                </SelectInput>
                            </div>
                            <div>
                                <InputLabel htmlFor="f_app_only" value="Só acesso app" />
                                <SelectInput
                                    id="f_app_only"
                                    className="mt-1"
                                    value={filterForm.data.app_access_only}
                                    onChange={(e) => filterForm.setData('app_access_only', e.target.value)}
                                >
                                    {triStateOptions}
                                </SelectInput>
                            </div>
                            <div>
                                <InputLabel htmlFor="f_att" value="Tempo na igreja (texto do cadastro)" />
                                <TextInput
                                    id="f_att"
                                    value={filterForm.data.attendance_duration}
                                    onChange={(e) => filterForm.setData('attendance_duration', e.target.value)}
                                    className="mt-1"
                                    placeholder="Ex.: menos de 6 meses"
                                />
                            </div>
                            <div>
                                <InputLabel htmlFor="f_cf" value="Cadastrado desde" />
                                <TextInput
                                    id="f_cf"
                                    type="date"
                                    value={filterForm.data.created_from}
                                    onChange={(e) => filterForm.setData('created_from', e.target.value)}
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <InputLabel htmlFor="f_ct" value="Cadastrado até" />
                                <TextInput
                                    id="f_ct"
                                    type="date"
                                    value={filterForm.data.created_to}
                                    onChange={(e) => filterForm.setData('created_to', e.target.value)}
                                    className="mt-1"
                                />
                            </div>
                            <div className="sm:col-span-2 lg:col-span-3">
                                <InputLabel htmlFor="f_txt" value="Palavras nos textos (interesses, dons, experiência)" />
                                <TextInput
                                    id="f_txt"
                                    value={filterForm.data.text_interest}
                                    onChange={(e) => filterForm.setData('text_interest', e.target.value)}
                                    className="mt-1"
                                    placeholder="Ex.: música, crianças, mídia…"
                                />
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <PrimaryButton type="submit" disabled={filterForm.processing} className="inline-flex items-center gap-1">
                                <MagnifyingGlassIcon className="h-4 w-4" aria-hidden />
                                Aplicar filtros
                            </PrimaryButton>
                            <SecondaryButton type="button" onClick={clearFilters}>
                                Limpar
                            </SecondaryButton>
                        </div>
                    </form>
                </Card>
            ) : null}

            <button
                type="button"
                onClick={() => setAssistantOpen((o) => !o)}
                className="mb-3 flex w-full items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-left text-sm font-semibold text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100"
            >
                <span className="flex items-center gap-2">
                    <ChatBubbleLeftRightIcon className="h-5 w-5" aria-hidden />
                    Assistente (sugestão de filtros em português)
                </span>
                {assistantOpen ? <ChevronUpIcon className="h-5 w-5" /> : <ChevronDownIcon className="h-5 w-5" />}
            </button>
            {assistantOpen ? (
                <Card className="mb-6 border-emerald-200/80 dark:border-emerald-900">
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 mb-3">
                        Descreva o que procura em linguagem natural. O assistente sugere filtros (regras locais, sem serviço externo). Ex.: «últimos
                        10 dias», «membros oficiais com whatsapp», «ainda não estão neste ministério».
                    </p>
                    <div className="max-h-52 space-y-2 overflow-y-auto rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm dark:border-zinc-700 dark:bg-zinc-950">
                        {assistantMessages.length === 0 ? (
                            <p className="text-zinc-500">Comece uma conversa…</p>
                        ) : (
                            assistantMessages.map((msg, i) => (
                                <div
                                    key={i}
                                    className={`rounded-lg px-3 py-2 ${
                                        msg.role === 'user'
                                            ? 'ml-6 bg-primary-600 text-white'
                                            : 'mr-6 border border-zinc-200 bg-white text-zinc-800 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100'
                                    }`}
                                >
                                    {msg.text}
                                </div>
                            ))
                        )}
                    </div>
                    <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                        <TextInput
                            className="flex-1"
                            value={assistantInput}
                            onChange={(e) => setAssistantInput(e.target.value)}
                            placeholder="Escreva aqui…"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    void sendAssistant();
                                }
                            }}
                        />
                        <PrimaryButton type="button" disabled={assistantLoading} onClick={() => void sendAssistant()}>
                            Enviar
                        </PrimaryButton>
                    </div>
                    {pendingAssistantFilters ? (
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                            <SecondaryButton type="button" onClick={applyAssistantFilters}>
                                Aplicar filtros sugeridos à lista
                            </SecondaryButton>
                            <button
                                type="button"
                                className="text-xs text-zinc-500 underline"
                                onClick={() => setPendingAssistantFilters(null)}
                            >
                                Ignorar sugestão
                            </button>
                        </div>
                    ) : null}
                </Card>
            ) : null}

            <div className="flex flex-wrap items-center justify-end gap-3 mb-4">
                <SecondaryButton type="button" onClick={() => setAddOpen(true)} className="inline-flex items-center gap-1">
                    <PlusIcon className="h-5 w-5" aria-hidden />
                    Procurar e associar outro cadastro
                </SecondaryButton>
            </div>

            <Card>
                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead>
                            <tr className="border-b border-zinc-200 text-left dark:border-zinc-700">
                                <th className="pb-2 pr-3 font-semibold text-zinc-900 dark:text-white">Nome</th>
                                <th className="pb-2 pr-3 font-semibold text-zinc-900 dark:text-white">Cadastro</th>
                                <th className="pb-2 pr-3 font-semibold text-zinc-900 dark:text-white">Contato</th>
                                <th className="pb-2 pr-3 font-semibold text-zinc-900 dark:text-white">Interesses</th>
                                <th className="pb-2 pr-3 font-semibold text-zinc-900 dark:text-white">Sinais</th>
                                <th className="pb-2 pr-3 font-semibold text-zinc-900 dark:text-white">Ministérios</th>
                                <th className="pb-2 pr-3 font-semibold text-zinc-900 dark:text-white">Aqui</th>
                                <th className="pb-2 pr-3 font-semibold text-zinc-900 dark:text-white">Liberação</th>
                                <th className="pb-2 font-semibold text-zinc-900 dark:text-white" />
                            </tr>
                        </thead>
                        <tbody>
                            {volunteers.data.map((v) => (
                                <tr key={v.id} className="border-b border-zinc-100 dark:border-zinc-800 align-top">
                                    <td className="py-2 pr-3 font-medium text-zinc-900 dark:text-white">{v.name}</td>
                                    <td className="py-2 pr-3 whitespace-nowrap text-zinc-600 dark:text-zinc-400">{formatShortDate(v.createdAt)}</td>
                                    <td className="py-2 pr-3 text-zinc-600 dark:text-zinc-400">
                                        <div>{v.email}</div>
                                        {v.phone ? <div className="text-xs">{v.phone}</div> : null}
                                    </td>
                                    <td className="py-2 pr-3 max-w-[200px] text-xs text-zinc-600 dark:text-zinc-400">
                                        {v.interestPreview ?? '—'}
                                    </td>
                                    <td className="py-2 pr-3 text-xs text-zinc-500">
                                        <div className="flex flex-wrap gap-1">
                                            {v.signals.memberNs ? (
                                                <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-emerald-900 dark:bg-emerald-900/50 dark:text-emerald-100">
                                                    NS
                                                </span>
                                            ) : null}
                                            {v.signals.sixMonthsInChurchOrLetter ? (
                                                <span className="rounded bg-sky-100 px-1.5 py-0.5 text-sky-900 dark:bg-sky-900/50 dark:text-sky-100">
                                                    ≥6m
                                                </span>
                                            ) : null}
                                            {v.signals.ministryExperienceDeclared ? (
                                                <span className="rounded bg-violet-100 px-1.5 py-0.5 text-violet-900 dark:bg-violet-900/50 dark:text-violet-100">
                                                    Exp.
                                                </span>
                                            ) : null}
                                            {!v.signals.memberNs && !v.signals.sixMonthsInChurchOrLetter && !v.signals.ministryExperienceDeclared ? (
                                                <span>—</span>
                                            ) : null}
                                        </div>
                                    </td>
                                    <td className="py-2 pr-3 max-w-[220px] text-xs text-zinc-600 dark:text-zinc-400">
                                        {formatListPreview(v.ministryNames) || <span className="text-zinc-400">—</span>}
                                    </td>
                                    <td className="py-2 pr-3">
                                        {v.inThisMinistry ? (
                                            <span className="text-emerald-700 dark:text-emerald-300">Sim</span>
                                        ) : (
                                            <span className="text-amber-700 dark:text-amber-300">Não</span>
                                        )}
                                    </td>
                                    <td className="py-2 pr-3">
                                        {v.inThisMinistry ? (
                                            <div className="space-y-1">
                                                <span
                                                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                                                        v.clearanceStatus === 'cleared'
                                                            ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100'
                                                            : v.clearanceStatus === 'blocked'
                                                              ? 'bg-red-100 text-red-900 dark:bg-red-900/40 dark:text-red-100'
                                                              : 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100'
                                                    }`}
                                                >
                                                    {clearanceLabel(v.clearanceStatus)}
                                                </span>
                                                <div className="text-xs text-zinc-500">
                                                    {v.criteriaMet}/{v.criteriaTotal} critérios
                                                </div>
                                            </div>
                                        ) : (
                                            <span className="text-zinc-400">—</span>
                                        )}
                                    </td>
                                    <td className="py-2 text-right whitespace-nowrap">
                                        {v.inThisMinistry && v.showUrl ? (
                                            <Link href={v.showUrl} className="text-primary-600 text-sm font-semibold hover:underline dark:text-primary-400">
                                                Ficha
                                            </Link>
                                        ) : (
                                            <PrimaryButton
                                                type="button"
                                                className="px-2 py-1 text-xs"
                                                disabled={forwardingId === v.id}
                                                onClick={() => forwardOne(v.id)}
                                            >
                                                {forwardingId === v.id ? '…' : `Encaminhar`}
                                            </PrimaryButton>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {volunteers.links.length > 3 ? (
                    <nav className="mt-4 flex flex-wrap gap-1">
                        {volunteers.links.map((l, i) =>
                            l.url ? (
                                <Link
                                    key={i}
                                    href={l.url}
                                    className={`rounded px-2 py-1 text-xs ${
                                        l.active
                                            ? 'bg-zinc-900 text-white dark:bg-white dark:text-black'
                                            : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200'
                                    }`}
                                    dangerouslySetInnerHTML={{ __html: l.label }}
                                />
                            ) : (
                                <span
                                    key={i}
                                    className="rounded px-2 py-1 text-xs text-zinc-400"
                                    dangerouslySetInnerHTML={{ __html: l.label }}
                                />
                            ),
                        )}
                    </nav>
                ) : null}
            </Card>

            <Modal show={addOpen} onClose={() => setAddOpen(false)} maxWidth="lg">
                <div className="p-6">
                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Associar outro cadastro a este ministério</h2>
                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                        Pesquisa por nome ou e-mail (mín. 2 caracteres). Só aparecem pessoas ainda sem este ministério na ficha.
                    </p>
                    <div className="mt-4">
                        <InputLabel htmlFor="lookup_q" value="Procurar" />
                        <TextInput
                            id="lookup_q"
                            value={lookupQ}
                            onChange={(e) => setLookupQ(e.target.value)}
                            className="mt-1"
                            placeholder="Comece a escrever…"
                        />
                    </div>
                    <div className="mt-3 max-h-48 overflow-y-auto rounded-lg border border-zinc-200 dark:border-zinc-700">
                        {lookupLoading ? (
                            <p className="p-3 text-sm text-zinc-500">A procurar…</p>
                        ) : lookupResults.length === 0 ? (
                            <p className="p-3 text-sm text-zinc-500">{lookupQ.trim().length < 2 ? 'Escreva pelo menos 2 letras.' : 'Sem resultados.'}</p>
                        ) : (
                            <ul>
                                {lookupResults.map((r) => (
                                    <li key={r.id}>
                                        <button
                                            type="button"
                                            onClick={() => pickResult(r.id)}
                                            className={`flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 ${
                                                String(attachForm.data.volunteer_id) === String(r.id) ? 'bg-primary-50 dark:bg-primary-900/20' : ''
                                            }`}
                                        >
                                            <span className="font-medium text-zinc-900 dark:text-white">{r.name}</span>
                                            <span className="text-xs text-zinc-500">{r.email}</span>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                    <form onSubmit={attachVolunteer} className="mt-6 flex justify-end gap-2">
                        <SecondaryButton type="button" onClick={() => setAddOpen(false)}>
                            Cancelar
                        </SecondaryButton>
                        <PrimaryButton type="submit" disabled={attachForm.processing || !attachForm.data.volunteer_id}>
                            Associar
                        </PrimaryButton>
                    </form>
                    <InputError message={attachForm.errors.volunteer_id} className="mt-2" />
                </div>
            </Modal>
        </AdminLayout>
    );
}
