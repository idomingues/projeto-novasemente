import Card from '@/Components/Card';
import InputLabel from '@/Components/InputLabel';
import Modal from '@/Components/Modal';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import SelectInput from '@/Components/SelectInput';
import TextInput from '@/Components/TextInput';
import { useForm, usePage } from '@inertiajs/react';
import {
    AdjustmentsHorizontalIcon,
    ChevronDownIcon,
    ChevronUpIcon,
    MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { FormEventHandler, useCallback, useEffect, useMemo, useState } from 'react';
import { volunteerDepartmentsInList } from '@/utils/volunteerDepartmentsInList';

type StageRow = { id: number; name: string; sort_order: number; volunteer_count: number };

type VolunteerListRow = {
    id: number;
    name: string | null;
    email: string | null;
    phone: string | null;
    createdAt: string | null;
    stageName: string;
    pendingInvite?: boolean;
    pendingInviteMinistryNames?: string[];
    ministryNames: string[];
    interestPreview: string | null;
};

type BoardFilters = {
    search: string;
    has_whatsapp: string;
    has_social_networks: string;
    is_official_member: string;
    member_record_at_nova_semente: string;
    has_previous_ministry_volunteer_experience: string;
    needs_pastoral_guidance: string;
    lgpd_data_consent: string;
    active: string;
    app_access_only: string;
    role: string;
    has_email: string;
    has_phone: string;
    has_birth_date: string;
    attendance_duration: string;
    attendance_duration_text: string;
    created_from: string;
    created_to: string;
    birth_date_from: string;
    birth_date_to: string;
    member_record_church: string;
    professional_area: string;
    ministry_ids: string;
    text_interest: string;
    pipeline_stage_id: string;
};

type PaginatedVolunteers = {
    data: VolunteerListRow[];
    links: { url: string | null; label: string; active: boolean }[];
};

const emptyBoardFilters = (): BoardFilters => ({
    search: '',
    has_whatsapp: '',
    has_social_networks: '',
    is_official_member: '',
    member_record_at_nova_semente: '',
    has_previous_ministry_volunteer_experience: '',
    needs_pastoral_guidance: '',
    lgpd_data_consent: '',
    active: '',
    app_access_only: '',
    role: '',
    has_email: '',
    has_phone: '',
    has_birth_date: '',
    attendance_duration: '',
    attendance_duration_text: '',
    created_from: '',
    created_to: '',
    birth_date_from: '',
    birth_date_to: '',
    member_record_church: '',
    professional_area: '',
    ministry_ids: '',
    text_interest: '',
    pipeline_stage_id: '',
});

const tri = (
    <>
        <option value="">Qualquer</option>
        <option value="1">Sim</option>
        <option value="0">Não</option>
    </>
);

const attendanceOptions: { value: string; label: string }[] = [
    { value: 'less_than_3_months', label: 'Menos de 3 meses' },
    { value: 'months_3_6', label: '3–6 meses' },
    { value: 'months_6_12', label: '6–12 meses' },
    { value: 'years_1_3', label: '1–3 anos' },
    { value: 'more_than_3_years', label: '+ 3 anos' },
];

function formatShortDate(iso: string | null): string {
    if (!iso) return '—';
    try {
        return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
        return '—';
    }
}

function filtersToQuery(f: BoardFilters): string {
    const sp = new URLSearchParams();
    (Object.entries(f) as [string, string][]).forEach(([k, v]) => {
        if (v !== '' && v !== undefined && v !== null) sp.set(k, String(v));
    });
    return sp.toString();
}

type MinistryOpt = { id: number; name: string };

interface Props {
    open: boolean;
    onClose: () => void;
    pickerUrl: string;
    onSelectVolunteer: (id: number, name: string | null) => void;
}

export default function AttachVolunteerPickerModal({ open, onClose, pickerUrl, onSelectVolunteer }: Props) {
    const page = usePage();
    const csrf = (page.props as { csrf_token?: string }).csrf_token ?? '';

    const filterForm = useForm<BoardFilters>(emptyBoardFilters());
    const [filtersOpen, setFiltersOpen] = useState(false);
    const [listLoading, setListLoading] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [stages, setStages] = useState<StageRow[]>([]);
    const [ministries, setMinistries] = useState<MinistryOpt[]>([]);
    const [volunteers, setVolunteers] = useState<PaginatedVolunteers>({ data: [], links: [] });

    const loadList = useCallback(
        async (filtersOverride: BoardFilters, pageUrl?: string | null) => {
            setListLoading(true);
            setLoadError(null);
            try {
                const qs = pageUrl ? '' : filtersToQuery(filtersOverride);
                const url = pageUrl ?? `${pickerUrl}${qs ? `?${qs}` : ''}`;
                const r = await fetch(url, {
                    headers: {
                        Accept: 'application/json',
                        'X-Requested-With': 'XMLHttpRequest',
                        'X-CSRF-TOKEN': csrf,
                    },
                    credentials: 'same-origin',
                });
                if (!r.ok) throw new Error('bad');
                const j = (await r.json()) as {
                    stages?: StageRow[];
                    volunteers?: PaginatedVolunteers & { current_page?: number };
                    ministries?: MinistryOpt[];
                };
                setStages(j.stages ?? []);
                setMinistries(j.ministries ?? []);
                const vol = j.volunteers ?? { data: [], links: [] };
                setVolunteers({ data: vol.data ?? [], links: vol.links ?? [] });
            } catch {
                setLoadError('Não foi possível carregar a lista de voluntários.');
            } finally {
                setListLoading(false);
            }
        },
        [pickerUrl, csrf],
    );

    useEffect(() => {
        if (!open) return;
        filterForm.setData(emptyBoardFilters());
        void loadList(emptyBoardFilters());
        // eslint-disable-next-line react-hooks/exhaustive-deps -- reset só ao abrir
    }, [open, pickerUrl]);

    const currentStageFilter = filterForm.data.pipeline_stage_id ?? '';
    const pipelineTotalCount = useMemo(() => stages.reduce((acc, s) => acc + s.volunteer_count, 0), [stages]);
    const activeFiltersCount = useMemo(() => {
        return (Object.entries(filterForm.data) as [string, string][]).filter(([k, v]) => {
            if (k === 'pipeline_stage_id') return false;
            return v !== '' && v !== null && v !== undefined;
        }).length;
    }, [filterForm.data]);

    const pickStage = (stageId: number | '') => {
        const next: BoardFilters = {
            ...filterForm.data,
            pipeline_stage_id: stageId === '' ? '' : String(stageId),
        };
        filterForm.setData(next);
        void loadList(next);
    };

    const applyFilters: FormEventHandler = (e) => {
        e.preventDefault();
        void loadList(filterForm.data);
    };

    const clearFilters = () => {
        const cleared = emptyBoardFilters();
        filterForm.setData(cleared);
        void loadList(cleared);
    };

    const choose = (row: VolunteerListRow) => {
        onSelectVolunteer(row.id, row.name);
        onClose();
    };

    return (
        <Modal
            show={open}
            onClose={onClose}
            maxWidth="7xl"
            disableBodyScroll
            footer={
                <div className="flex justify-end">
                    <SecondaryButton type="button" onClick={onClose}>
                        Fechar
                    </SecondaryButton>
                </div>
            }
        >
            <div className="flex max-h-[min(90dvh,calc(100dvh-2rem))] min-h-0 flex-col">
                <div className="shrink-0 border-b border-zinc-200 p-4 pr-12 dark:border-zinc-700 sm:p-6">
                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Escolher voluntário</h2>
                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                        Mesma lista e filtros do quadro <strong className="text-zinc-700 dark:text-zinc-200">Voluntários</strong>{' '}
                        (fases e cadastro). Toque em «Escolher» para voltar ao anexo com esse voluntário pré-selecionado.
                    </p>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain p-4 sm:p-6">
                    {loadError ? (
                        <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
                            {loadError}
                        </p>
                    ) : null}

                    <div className="flex flex-col gap-6 lg:flex-row">
                        <aside className="lg:w-64 shrink-0 space-y-4">
                            <Card className="p-4">
                                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                                    Fases
                                </div>
                                <ul className="space-y-1">
                                    <li>
                                        <button
                                            type="button"
                                            onClick={() => pickStage('')}
                                            aria-pressed={currentStageFilter === ''}
                                            disabled={listLoading}
                                            className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium ${
                                                currentStageFilter === ''
                                                    ? 'bg-brand-600 text-white shadow-sm ring-2 ring-brand-800/40 dark:bg-brand-500 dark:ring-brand-300/35'
                                                    : 'text-zinc-800 ring-1 ring-transparent hover:bg-zinc-100 hover:ring-zinc-200 dark:text-zinc-100 dark:hover:bg-zinc-800 dark:hover:ring-zinc-600'
                                            }`}
                                        >
                                            <span className="truncate">Todos</span>
                                            <span
                                                className={`shrink-0 tabular-nums text-xs ${
                                                    currentStageFilter === '' ? 'text-white/90' : 'text-zinc-500 dark:text-zinc-400'
                                                }`}
                                            >
                                                {pipelineTotalCount}
                                            </span>
                                        </button>
                                    </li>
                                    {stages.map((s) => {
                                        const label = (s.name || '').trim() || 'Não definido';
                                        const selected = currentStageFilter === String(s.id);
                                        return (
                                            <li key={s.id}>
                                                <button
                                                    type="button"
                                                    onClick={() => pickStage(s.id)}
                                                    aria-pressed={selected}
                                                    disabled={listLoading}
                                                    className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm ${
                                                        selected
                                                            ? 'bg-brand-600 font-medium text-white shadow-sm ring-2 ring-brand-800/40 dark:bg-brand-500 dark:ring-brand-300/35'
                                                            : 'text-zinc-800 ring-1 ring-transparent hover:bg-zinc-100 hover:ring-zinc-200 dark:text-zinc-100 dark:hover:bg-zinc-800 dark:hover:ring-zinc-600'
                                                    }`}
                                                >
                                                    <span className="truncate pr-2">{label}</span>
                                                    <span
                                                        className={`shrink-0 tabular-nums text-xs ${
                                                            selected
                                                                ? 'text-white/90'
                                                                : s.volunteer_count === 0
                                                                  ? 'text-zinc-400 dark:text-zinc-500'
                                                                  : 'text-zinc-500 dark:text-zinc-400'
                                                        }`}
                                                    >
                                                        {s.volunteer_count}
                                                    </span>
                                                </button>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </Card>
                        </aside>

                        <div className="min-w-0 flex-1 space-y-4">
                            <button
                                type="button"
                                onClick={() => setFiltersOpen((o) => !o)}
                                className="flex w-full items-center justify-between rounded-xl border border-zinc-200 bg-white px-4 py-3 text-left text-sm font-semibold text-zinc-900 shadow-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
                            >
                                <span className="flex items-center gap-2">
                                    <AdjustmentsHorizontalIcon className="h-5 w-5 text-zinc-500" aria-hidden />
                                    Filtros do cadastro
                                    {activeFiltersCount > 0 ? (
                                        <span className="ml-1 inline-flex items-center rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                                            {activeFiltersCount}
                                        </span>
                                    ) : null}
                                </span>
                                {filtersOpen ? <ChevronUpIcon className="h-5 w-5" /> : <ChevronDownIcon className="h-5 w-5" />}
                            </button>

                            {filtersOpen ? (
                                <Card className="p-4">
                                    <form onSubmit={applyFilters} className="space-y-4">
                                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                                            <div className="sm:col-span-2 xl:col-span-3">
                                                <InputLabel value="Nome, e-mail ou telefone" />
                                                <TextInput
                                                    className="mt-1"
                                                    value={filterForm.data.search}
                                                    onChange={(e) => filterForm.setData('search', e.target.value)}
                                                />
                                            </div>
                                            <div>
                                                <InputLabel value="WhatsApp" />
                                                <SelectInput
                                                    className="mt-1"
                                                    value={filterForm.data.has_whatsapp}
                                                    onChange={(e) => filterForm.setData('has_whatsapp', e.target.value)}
                                                >
                                                    {tri}
                                                </SelectInput>
                                            </div>
                                            <div>
                                                <InputLabel value="Redes sociais" />
                                                <SelectInput
                                                    className="mt-1"
                                                    value={filterForm.data.has_social_networks}
                                                    onChange={(e) => filterForm.setData('has_social_networks', e.target.value)}
                                                >
                                                    {tri}
                                                </SelectInput>
                                            </div>
                                            <div>
                                                <InputLabel value="Membro oficial" />
                                                <SelectInput
                                                    className="mt-1"
                                                    value={filterForm.data.is_official_member}
                                                    onChange={(e) => filterForm.setData('is_official_member', e.target.value)}
                                                >
                                                    {tri}
                                                </SelectInput>
                                            </div>
                                            <div>
                                                <InputLabel value="Registro na Nova Semente" />
                                                <SelectInput
                                                    className="mt-1"
                                                    value={filterForm.data.member_record_at_nova_semente}
                                                    onChange={(e) => filterForm.setData('member_record_at_nova_semente', e.target.value)}
                                                >
                                                    {tri}
                                                </SelectInput>
                                            </div>
                                            <div>
                                                <InputLabel value="Experiência em ministério" />
                                                <SelectInput
                                                    className="mt-1"
                                                    value={filterForm.data.has_previous_ministry_volunteer_experience}
                                                    onChange={(e) =>
                                                        filterForm.setData('has_previous_ministry_volunteer_experience', e.target.value)
                                                    }
                                                >
                                                    {tri}
                                                </SelectInput>
                                            </div>
                                            <div>
                                                <InputLabel value="Orientação pastoral" />
                                                <SelectInput
                                                    className="mt-1"
                                                    value={filterForm.data.needs_pastoral_guidance}
                                                    onChange={(e) => filterForm.setData('needs_pastoral_guidance', e.target.value)}
                                                >
                                                    {tri}
                                                </SelectInput>
                                            </div>
                                            <div>
                                                <InputLabel value="LGPD" />
                                                <SelectInput
                                                    className="mt-1"
                                                    value={filterForm.data.lgpd_data_consent}
                                                    onChange={(e) => filterForm.setData('lgpd_data_consent', e.target.value)}
                                                >
                                                    {tri}
                                                </SelectInput>
                                            </div>
                                            <div>
                                                <InputLabel value="Ativo" />
                                                <SelectInput
                                                    className="mt-1"
                                                    value={filterForm.data.active}
                                                    onChange={(e) => filterForm.setData('active', e.target.value)}
                                                >
                                                    {tri}
                                                </SelectInput>
                                            </div>
                                            <div>
                                                <InputLabel value="Só app" />
                                                <SelectInput
                                                    className="mt-1"
                                                    value={filterForm.data.app_access_only}
                                                    onChange={(e) => filterForm.setData('app_access_only', e.target.value)}
                                                >
                                                    {tri}
                                                </SelectInput>
                                            </div>
                                            <div>
                                                <InputLabel value="Cargo (texto)" />
                                                <TextInput
                                                    className="mt-1"
                                                    value={filterForm.data.role}
                                                    onChange={(e) => filterForm.setData('role', e.target.value)}
                                                    placeholder="Ex.: Diácono, Líder…"
                                                />
                                            </div>
                                            <div>
                                                <InputLabel value="Tem e-mail" />
                                                <SelectInput
                                                    className="mt-1"
                                                    value={filterForm.data.has_email}
                                                    onChange={(e) => filterForm.setData('has_email', e.target.value)}
                                                >
                                                    {tri}
                                                </SelectInput>
                                            </div>
                                            <div>
                                                <InputLabel value="Tem telefone" />
                                                <SelectInput
                                                    className="mt-1"
                                                    value={filterForm.data.has_phone}
                                                    onChange={(e) => filterForm.setData('has_phone', e.target.value)}
                                                >
                                                    {tri}
                                                </SelectInput>
                                            </div>
                                            <div>
                                                <InputLabel value="Tem data de nascimento" />
                                                <SelectInput
                                                    className="mt-1"
                                                    value={filterForm.data.has_birth_date}
                                                    onChange={(e) => filterForm.setData('has_birth_date', e.target.value)}
                                                >
                                                    {tri}
                                                </SelectInput>
                                            </div>
                                            <div>
                                                <InputLabel value="Tempo na igreja (cadastro novo)" />
                                                <SelectInput
                                                    className="mt-1"
                                                    value={filterForm.data.attendance_duration}
                                                    onChange={(e) => filterForm.setData('attendance_duration', e.target.value)}
                                                >
                                                    <option value="">Qualquer</option>
                                                    {attendanceOptions.map((o) => (
                                                        <option key={o.value} value={o.value}>
                                                            {o.label}
                                                        </option>
                                                    ))}
                                                </SelectInput>
                                            </div>
                                            <div>
                                                <InputLabel value="Tempo como voluntário (recadastro) — texto" />
                                                <TextInput
                                                    className="mt-1"
                                                    value={filterForm.data.attendance_duration_text}
                                                    onChange={(e) => filterForm.setData('attendance_duration_text', e.target.value)}
                                                    placeholder="Ex.: 1 ano, 6 meses, desde 2020…"
                                                />
                                            </div>
                                            <div>
                                                <InputLabel value="Cadastro desde" />
                                                <TextInput
                                                    type="date"
                                                    className="mt-1"
                                                    value={filterForm.data.created_from}
                                                    onChange={(e) => filterForm.setData('created_from', e.target.value)}
                                                />
                                            </div>
                                            <div>
                                                <InputLabel value="Cadastro até" />
                                                <TextInput
                                                    type="date"
                                                    className="mt-1"
                                                    value={filterForm.data.created_to}
                                                    onChange={(e) => filterForm.setData('created_to', e.target.value)}
                                                />
                                            </div>
                                            <div>
                                                <InputLabel value="Nascimento desde" />
                                                <TextInput
                                                    type="date"
                                                    className="mt-1"
                                                    value={filterForm.data.birth_date_from}
                                                    onChange={(e) => filterForm.setData('birth_date_from', e.target.value)}
                                                />
                                            </div>
                                            <div>
                                                <InputLabel value="Nascimento até" />
                                                <TextInput
                                                    type="date"
                                                    className="mt-1"
                                                    value={filterForm.data.birth_date_to}
                                                    onChange={(e) => filterForm.setData('birth_date_to', e.target.value)}
                                                />
                                            </div>
                                            <div>
                                                <InputLabel value="Área profissional" />
                                                <TextInput
                                                    className="mt-1"
                                                    value={filterForm.data.professional_area}
                                                    onChange={(e) => filterForm.setData('professional_area', e.target.value)}
                                                    placeholder="Ex.: Saúde, TI, Educação…"
                                                />
                                            </div>
                                            <div className="sm:col-span-2 xl:col-span-2">
                                                <InputLabel value="Registro em qual igreja (texto)" />
                                                <TextInput
                                                    className="mt-1"
                                                    value={filterForm.data.member_record_church}
                                                    onChange={(e) => filterForm.setData('member_record_church', e.target.value)}
                                                    placeholder="Ex.: Central, Paulista…"
                                                />
                                            </div>
                                            <div className="sm:col-span-2 xl:col-span-3">
                                                <InputLabel value="Departamentos (seleção múltipla)" />
                                                <div className="mt-2 rounded-xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-900/50">
                                                    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                                                        {ministries.map((m) => {
                                                            const selected = (filterForm.data.ministry_ids || '')
                                                                .split(',')
                                                                .map((x) => x.trim())
                                                                .filter(Boolean)
                                                                .includes(String(m.id));
                                                            return (
                                                                <label key={m.id} className="flex items-center gap-2">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={selected}
                                                                        onChange={(e) => {
                                                                            const cur = (filterForm.data.ministry_ids || '')
                                                                                .split(',')
                                                                                .map((x) => x.trim())
                                                                                .filter(Boolean);
                                                                            const id = String(m.id);
                                                                            const next = e.target.checked
                                                                                ? Array.from(new Set([...cur, id]))
                                                                                : cur.filter((x) => x !== id);
                                                                            filterForm.setData('ministry_ids', next.join(','));
                                                                        }}
                                                                        className="rounded border-zinc-300 text-zinc-900 focus:ring-zinc-500 dark:border-zinc-600"
                                                                    />
                                                                    <span className="text-sm text-zinc-900 dark:text-zinc-100">{m.name}</span>
                                                                </label>
                                                            );
                                                        })}
                                                    </div>
                                                    {ministries.length === 0 ? (
                                                        <div className="text-xs text-zinc-500 dark:text-zinc-400">
                                                            Nenhum departamento disponível.
                                                        </div>
                                                    ) : null}
                                                </div>
                                            </div>
                                            <div className="sm:col-span-2 xl:col-span-3">
                                                <InputLabel value="Palavras nos textos (interesses, dons…)" />
                                                <TextInput
                                                    className="mt-1"
                                                    value={filterForm.data.text_interest}
                                                    onChange={(e) => filterForm.setData('text_interest', e.target.value)}
                                                />
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            <PrimaryButton type="submit" className="inline-flex items-center gap-1" disabled={listLoading}>
                                                <MagnifyingGlassIcon className="h-4 w-4" aria-hidden />
                                                Aplicar
                                            </PrimaryButton>
                                            <SecondaryButton type="button" onClick={clearFilters} disabled={listLoading}>
                                                Limpar
                                            </SecondaryButton>
                                        </div>
                                    </form>
                                </Card>
                            ) : null}

                            <Card>
                                {listLoading && volunteers.data.length === 0 ? (
                                    <div className="p-6 text-sm text-zinc-500">A carregar…</div>
                                ) : (
                                    <>
                                        <div className="overflow-x-auto">
                                            <table className="hidden min-w-full text-sm md:table">
                                                <thead>
                                                    <tr className="border-b border-zinc-200 text-left dark:border-zinc-700">
                                                        <th className="pb-2 pr-3 font-semibold">Nome</th>
                                                        <th className="pb-2 pr-3 font-semibold">Fase</th>
                                                        <th className="pb-2 pr-3 font-semibold">Departamentos</th>
                                                        <th className="pb-2 pr-3 font-semibold">Cadastro</th>
                                                        <th className="pb-2 pr-3 font-semibold">Contato</th>
                                                        <th className="pb-2 pr-3 font-semibold">Interesses</th>
                                                        <th className="pb-2 w-28" />
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {volunteers.data.map((v) => (
                                                        <tr
                                                            key={v.id}
                                                            className={`border-b border-zinc-100 dark:border-zinc-800 ${
                                                                v.pendingInvite ? 'bg-amber-50/40 dark:bg-amber-950/10' : ''
                                                            }`}
                                                        >
                                                            <td className="py-2 pr-3 font-medium text-zinc-900 dark:text-white">{v.name}</td>
                                                            <td className="py-2 pr-3 text-zinc-700 dark:text-zinc-200">{v.stageName}</td>
                                                            <td className="max-w-[220px] py-2 pr-3 text-xs text-zinc-600 dark:text-zinc-300">
                                                                {volunteerDepartmentsInList(v) || '—'}
                                                            </td>
                                                            <td className="py-2 pr-3 whitespace-nowrap text-zinc-600 dark:text-zinc-400">
                                                                {formatShortDate(v.createdAt)}
                                                            </td>
                                                            <td className="py-2 pr-3 text-zinc-600 dark:text-zinc-400">
                                                                <div>{v.email}</div>
                                                                {v.phone ? <div className="text-xs">{v.phone}</div> : null}
                                                            </td>
                                                            <td className="max-w-[200px] py-2 pr-3 text-xs text-zinc-500">
                                                                {v.interestPreview ?? '—'}
                                                            </td>
                                                            <td className="py-2 text-right">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => choose(v)}
                                                                    className="rounded-lg border border-brand-200 bg-brand-50 px-2.5 py-1.5 text-xs font-semibold text-brand-900 shadow-sm hover:bg-brand-100 dark:border-brand-800 dark:bg-brand-950/50 dark:text-brand-100 dark:hover:bg-brand-900/60"
                                                                >
                                                                    Escolher
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>

                                        <div className="space-y-3 p-3 md:hidden">
                                            {volunteers.data.map((v) => (
                                                <div
                                                    key={v.id}
                                                    className={`w-full rounded-2xl border px-4 py-3 text-left shadow-sm ${
                                                        v.pendingInvite
                                                            ? 'border-amber-200 bg-amber-50/60 dark:border-amber-900/50 dark:bg-amber-950/10'
                                                            : 'border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900'
                                                    }`}
                                                >
                                                    <div className="font-semibold text-zinc-900 dark:text-white">{v.name ?? '—'}</div>
                                                    <div className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                                                        {v.stageName} · {formatShortDate(v.createdAt)}
                                                    </div>
                                                    <div className="mt-2 space-y-1 text-xs text-zinc-600 dark:text-zinc-300">
                                                        {v.email ? <div className="truncate">{v.email}</div> : null}
                                                        {v.phone ? <div className="truncate">{v.phone}</div> : null}
                                                        {volunteerDepartmentsInList(v) ? (
                                                            <div className="truncate text-zinc-700 dark:text-zinc-200">
                                                                Departamentos: {volunteerDepartmentsInList(v)}
                                                            </div>
                                                        ) : null}
                                                    </div>
                                                    <PrimaryButton type="button" className="mt-3 w-full" onClick={() => choose(v)}>
                                                        Escolher este voluntário
                                                    </PrimaryButton>
                                                </div>
                                            ))}
                                        </div>

                                        {volunteers.data.length === 0 && !listLoading ? (
                                            <div className="mt-4 rounded-2xl border border-dashed border-zinc-200 p-6 text-center text-sm text-zinc-600 dark:border-zinc-800 dark:text-zinc-300">
                                                <div className="font-semibold text-zinc-900 dark:text-white">Nenhum voluntário encontrado</div>
                                                <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                                                    Ajuste a fase ou os filtros do cadastro.
                                                </div>
                                                <div className="mt-4 flex flex-wrap justify-center gap-2">
                                                    <SecondaryButton type="button" onClick={clearFilters}>
                                                        Limpar filtros
                                                    </SecondaryButton>
                                                    <SecondaryButton type="button" onClick={() => pickStage('')}>
                                                        Ver todos
                                                    </SecondaryButton>
                                                </div>
                                            </div>
                                        ) : null}

                                        {volunteers.links.length > 3 ? (
                                            <nav className="mt-4 flex flex-wrap gap-1 px-3 pb-3">
                                                {volunteers.links.map((l, i) =>
                                                    l.url ? (
                                                        <button
                                                            key={i}
                                                            type="button"
                                                            disabled={listLoading}
                                                            onClick={() => void loadList(filterForm.data, l.url)}
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
                                    </>
                                )}
                            </Card>
                        </div>
                    </div>
                </div>
            </div>
        </Modal>
    );
}
