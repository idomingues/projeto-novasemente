import AdminLayout from '@/Layouts/AdminLayout';
import FlashMessages from '@/Components/FlashMessages';
import Modal from '@/Components/Modal';
import Card from '@/Components/Card';
import PageHeader from '@/Components/PageHeader';
import { titleBarAddIconClass } from '@/Components/AddButton';
import TextInput from '@/Components/TextInput';
import Textarea from '@/Components/Textarea';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import SelectInput from '@/Components/SelectInput';
import InputError from '@/Components/InputError';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { FormEventHandler, useEffect, useMemo, useState } from 'react';
import {
    AdjustmentsHorizontalIcon,
    ChevronDownIcon,
    ChevronUpIcon,
    LinkIcon,
    MagnifyingGlassIcon,
    PlusIcon,
} from '@heroicons/react/24/outline';
import PublicVolunteerSignupShareModal from '@/Components/Volunteers/PublicVolunteerSignupShareModal';

type StageRow = { id: number; name: string; sort_order: number; volunteer_count: number };

type VolunteerListRow = {
    id: number;
    name: string | null;
    email: string | null;
    phone: string | null;
    active: boolean;
    createdAt: string | null;
    stageId: number | undefined;
    stageName: string;
    ministryNames: string[];
    interestPreview: string | null;
    signals: { memberNs: boolean; sixMonthsInChurchOrLetter: boolean; ministryExperienceDeclared: boolean };
};

type BoardFilters = {
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
    pipeline_stage_id: string;
};

interface Paginated<T> {
    data: T[];
    links: { url: string | null; label: string; active: boolean }[];
}

type DetailVolunteer = Record<string, unknown> & { id: number; name: string | null };

type DetailNote = { id: number; body: string; authorName: string; createdAt: string };

type DetailJson = {
    volunteer: DetailVolunteer;
    pipeline: { stageId?: number; stageName?: string };
    stages: { id: number; name: string; sort_order: number }[];
    notes: DetailNote[];
    updateStageUrl: string;
    storeNoteUrl: string;
};

interface Props {
    stages: StageRow[];
    volunteers: Paginated<VolunteerListRow>;
    filters: BoardFilters;
    storeStageUrl: string;
    canVolunteerManage: boolean;
    canPipelineMutate: boolean;
    volunteersAdminUrl: string;
    publicVolunteerSignupUrl: string | null;
}

const tri = (
    <>
        <option value="">Qualquer</option>
        <option value="1">Sim</option>
        <option value="0">Não</option>
    </>
);

function yn(v: unknown): string {
    if (v === true || v === 1 || v === '1') return 'Sim';
    if (v === false || v === 0 || v === '0') return 'Não';
    return '—';
}

function formatShortDate(iso: string | null): string {
    if (!iso) return '—';
    try {
        return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
        return '—';
    }
}

function formatDateTime(iso: string): string {
    try {
        return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    } catch {
        return iso;
    }
}

export default function Pipeline({
    stages,
    volunteers,
    filters,
    storeStageUrl,
    canVolunteerManage,
    canPipelineMutate,
    volunteersAdminUrl,
    publicVolunteerSignupUrl,
}: Props) {
    const page = usePage();
    const csrf = (page.props as { csrf_token?: string }).csrf_token ?? '';
    const currentChurch = (page.props as { currentChurch?: { name?: string } | null }).currentChurch;
    const churchName = currentChurch?.name ?? 'Igreja';

    const filterForm = useForm<BoardFilters>({ ...filters });
    const filtersKey = useMemo(() => JSON.stringify(filters), [filters]);
    useEffect(() => {
        filterForm.setData({ ...filters });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filtersKey]);

    const stageForm = useForm({ name: '' });

    const [filtersOpen, setFiltersOpen] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detail, setDetail] = useState<DetailJson | null>(null);
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [detailTab, setDetailTab] = useState<'ficha' | 'notas'>('ficha');
    const [publicInviteOpen, setPublicInviteOpen] = useState(false);

    const noteForm = useForm({ body: '' });
    const stageMoveForm = useForm({ stage_id: '' as string | number });

    const openVolunteer = async (id: number, tab: 'ficha' | 'notas' = 'ficha') => {
        setSelectedId(id);
        setModalOpen(true);
        setDetailTab(tab);
        setDetail(null);
        setDetailLoading(true);
        noteForm.reset('body');
        try {
            const url = route('ministry-lead.volunteers.pipeline.detail', id);
            const r = await fetch(url, {
                headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest', 'X-CSRF-TOKEN': csrf },
                credentials: 'same-origin',
            });
            const j = (await r.json()) as DetailJson;
            setDetail(j);
            const sid = j.pipeline?.stageId;
            stageMoveForm.setData('stage_id', sid != null ? String(sid) : '');
        } catch {
            setDetail(null);
        } finally {
            setDetailLoading(false);
        }
    };

    const applyFilters: FormEventHandler = (e) => {
        e.preventDefault();
        const data = Object.fromEntries(
            Object.entries(filterForm.data).filter(([, v]) => v !== '' && v !== null && v !== undefined),
        ) as Record<string, string>;
        router.get(route('ministry-lead.volunteers.index'), data, { preserveState: true, replace: true });
    };

    const clearFilters = () => {
        router.get(route('ministry-lead.volunteers.index'), {}, { preserveState: true, replace: true });
    };

    const pickStage = (stageId: number | '') => {
        const next = { ...filterForm.data, pipeline_stage_id: stageId === '' ? '' : String(stageId) };
        const data = Object.fromEntries(Object.entries(next).filter(([, v]) => v !== '')) as Record<string, string>;
        router.get(route('ministry-lead.volunteers.index'), data, { preserveState: true, replace: true });
    };

    const submitNewStage: FormEventHandler = (e) => {
        e.preventDefault();
        stageForm.post(storeStageUrl, { preserveScroll: true, onSuccess: () => stageForm.reset('name') });
    };

    const submitNote: FormEventHandler = (e) => {
        e.preventDefault();
        if (!detail) return;
        noteForm.post(detail.storeNoteUrl, {
            preserveScroll: true,
            onSuccess: () => {
                noteForm.reset('body');
                if (selectedId) void openVolunteer(selectedId, 'notas');
            },
        });
    };

    const submitStageMove: FormEventHandler = (e) => {
        e.preventDefault();
        if (!detail) return;
        stageMoveForm.patch(detail.updateStageUrl, {
            preserveScroll: true,
            onSuccess: () => {
                if (selectedId) void openVolunteer(selectedId);
                router.reload({ only: ['volunteers', 'stages'] });
            },
        });
    };

    const currentStageFilter = filters.pipeline_stage_id ?? '';

    return (
        <AdminLayout>
            <Head title="Voluntários" />
            <FlashMessages />
            <PageHeader
                title="Voluntários"
                subtitle="Quadro por fases: inscrição, treino até servir. Toque numa linha para abrir a ficha ou as anotações."
                actions={
                    canVolunteerManage ? (
                        <Link
                            href={`${volunteersAdminUrl}?modal=create`}
                            className={titleBarAddIconClass}
                            title="Novo voluntário"
                            aria-label="Novo voluntário"
                        >
                            <PlusIcon className="h-6 w-6" strokeWidth={2.25} />
                        </Link>
                    ) : undefined
                }
            >
                <div className="flex flex-wrap items-center gap-2">
                    {canVolunteerManage ? (
                        <Link
                            href={volunteersAdminUrl}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-800 shadow-sm hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
                        >
                            Cadastro secretaria
                        </Link>
                    ) : null}
                    {publicVolunteerSignupUrl && canPipelineMutate ? (
                        <button
                            type="button"
                            onClick={() => setPublicInviteOpen(true)}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-800 shadow-sm hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
                        >
                            <LinkIcon className="h-4 w-4" aria-hidden />
                            Link cadastro público
                        </button>
                    ) : null}
                </div>
            </PageHeader>

            <div className="flex flex-col gap-6 lg:flex-row">
                <aside className="lg:w-64 shrink-0 space-y-4">
                    <Card className="p-4">
                        <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400 mb-2">Fases</div>
                        <ul className="space-y-1">
                            <li>
                                <button
                                    type="button"
                                    onClick={() => pickStage('')}
                                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm ${
                                        currentStageFilter === ''
                                            ? 'bg-primary-600 text-white'
                                            : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-100'
                                    }`}
                                >
                                    <span>Todos</span>
                                </button>
                            </li>
                            {stages.map((s) => (
                                <li key={s.id}>
                                    <button
                                        type="button"
                                        onClick={() => pickStage(s.id)}
                                        className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm ${
                                            currentStageFilter === String(s.id)
                                                ? 'bg-primary-600 text-white'
                                                : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-100'
                                        }`}
                                    >
                                        <span className="truncate pr-2">{s.name}</span>
                                        <span className="shrink-0 text-xs opacity-80">{s.volunteer_count}</span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </Card>
                    {canPipelineMutate ? (
                        <Card className="p-4">
                            <div className="text-xs font-semibold text-zinc-700 dark:text-zinc-200 mb-2">Nova fase / pasta</div>
                            <form onSubmit={submitNewStage} className="space-y-2">
                                <TextInput
                                    value={stageForm.data.name}
                                    onChange={(e) => stageForm.setData('name', e.target.value)}
                                    placeholder="Ex.: Entrevista agendada"
                                />
                                <InputError message={stageForm.errors.name} />
                                <PrimaryButton type="submit" className="w-full" disabled={stageForm.processing}>
                                    Criar fase
                                </PrimaryButton>
                            </form>
                        </Card>
                    ) : null}
                    {canVolunteerManage ? (
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 px-1">
                            <Link href={volunteersAdminUrl} className="underline">
                                Abrir lista completa (convites, edição)
                            </Link>
                        </p>
                    ) : null}
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
                                        <InputLabel value="Experiência em ministério" />
                                        <SelectInput
                                            className="mt-1"
                                            value={filterForm.data.has_previous_ministry_volunteer_experience}
                                            onChange={(e) => filterForm.setData('has_previous_ministry_volunteer_experience', e.target.value)}
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
                                        <InputLabel value="Tempo na igreja (texto)" />
                                        <TextInput
                                            className="mt-1"
                                            value={filterForm.data.attendance_duration}
                                            onChange={(e) => filterForm.setData('attendance_duration', e.target.value)}
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
                                    <PrimaryButton type="submit" className="inline-flex items-center gap-1" disabled={filterForm.processing}>
                                        <MagnifyingGlassIcon className="h-4 w-4" aria-hidden />
                                        Aplicar
                                    </PrimaryButton>
                                    <SecondaryButton type="button" onClick={clearFilters}>
                                        Limpar
                                    </SecondaryButton>
                                </div>
                            </form>
                        </Card>
                    ) : null}

                    <Card>
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                                <thead>
                                    <tr className="border-b border-zinc-200 text-left dark:border-zinc-700">
                                        <th className="pb-2 pr-3 font-semibold">Nome</th>
                                        <th className="pb-2 pr-3 font-semibold">Fase</th>
                                        <th className="pb-2 pr-3 font-semibold">Cadastro</th>
                                        <th className="pb-2 pr-3 font-semibold">Contacto</th>
                                        <th className="pb-2 pr-3 font-semibold">Interesses</th>
                                        <th className="pb-2 font-semibold">Ministérios</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {volunteers.data.map((v) => (
                                        <tr
                                            key={v.id}
                                            className="border-b border-zinc-100 cursor-pointer hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900/80"
                                            onClick={() => void openVolunteer(v.id)}
                                        >
                                            <td className="py-2 pr-3 font-medium text-zinc-900 dark:text-white">{v.name}</td>
                                            <td className="py-2 pr-3 text-zinc-700 dark:text-zinc-200">{v.stageName}</td>
                                            <td className="py-2 pr-3 whitespace-nowrap text-zinc-600 dark:text-zinc-400">
                                                {formatShortDate(v.createdAt)}
                                            </td>
                                            <td className="py-2 pr-3 text-zinc-600 dark:text-zinc-400">
                                                <div>{v.email}</div>
                                                {v.phone ? <div className="text-xs">{v.phone}</div> : null}
                                            </td>
                                            <td className="py-2 pr-3 max-w-[200px] text-xs text-zinc-500">{v.interestPreview ?? '—'}</td>
                                            <td className="py-2 text-xs text-zinc-500">
                                                {v.ministryNames.length ? v.ministryNames.join(', ') : '—'}
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
                </div>
            </div>

            <Modal show={modalOpen} onClose={() => setModalOpen(false)} maxWidth="2xl">
                <div className="flex max-h-[85vh] flex-col">
                    {detailLoading ? (
                        <div className="p-6">
                            <p className="text-sm text-zinc-500">A carregar…</p>
                        </div>
                    ) : detail?.volunteer ? (
                        <>
                            <div className="shrink-0 border-b border-zinc-200 p-4 dark:border-zinc-700">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                    <div>
                                        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">{detail.volunteer.name}</h2>
                                        <p className="text-xs text-zinc-500">Dados do formulário de inscrição</p>
                                    </div>
                                    {canPipelineMutate ? (
                                        <form onSubmit={submitStageMove} className="flex flex-wrap items-end gap-2">
                                            <div>
                                                <InputLabel value="Fase / pasta" />
                                                <SelectInput
                                                    className="mt-1 min-w-[200px]"
                                                    value={stageMoveForm.data.stage_id}
                                                    onChange={(e) => stageMoveForm.setData('stage_id', e.target.value)}
                                                >
                                                    {detail.stages.map((s) => (
                                                        <option key={s.id} value={String(s.id)}>
                                                            {s.name}
                                                        </option>
                                                    ))}
                                                </SelectInput>
                                            </div>
                                            <PrimaryButton type="submit" disabled={stageMoveForm.processing}>
                                                Salvar fase
                                            </PrimaryButton>
                                            <InputError message={stageMoveForm.errors.stage_id} />
                                        </form>
                                    ) : (
                                        <div className="text-right text-sm text-zinc-600 dark:text-zinc-300">
                                            <div className="text-xs font-medium text-zinc-500">Fase / pasta</div>
                                            <div className="mt-1 font-medium text-zinc-900 dark:text-white">
                                                {detail.pipeline?.stageName ?? '—'}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="mt-4 flex gap-1 rounded-xl bg-zinc-100 p-1 dark:bg-zinc-800">
                                    <button
                                        type="button"
                                        onClick={() => setDetailTab('ficha')}
                                        className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${
                                            detailTab === 'ficha'
                                                ? 'bg-white text-zinc-900 shadow dark:bg-zinc-950 dark:text-white'
                                                : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'
                                        }`}
                                    >
                                        Ficha do cadastro
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setDetailTab('notas')}
                                        className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${
                                            detailTab === 'notas'
                                                ? 'bg-white text-zinc-900 shadow dark:bg-zinc-950 dark:text-white'
                                                : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'
                                        }`}
                                    >
                                        Lista de anotações
                                    </button>
                                </div>
                            </div>

                            <div className="min-h-0 flex-1 overflow-y-auto p-4">
                                {detailTab === 'ficha' ? (
                                    <>
                                        <div className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                                            {[
                                                ['E-mail', String(detail.volunteer.email ?? '—')],
                                                ['Telefone', String(detail.volunteer.phone ?? '—')],
                                                ['Data de nascimento', String(detail.volunteer.birth_date ?? '—')],
                                                ['WhatsApp', yn(detail.volunteer.has_whatsapp)],
                                                ['Redes sociais', yn(detail.volunteer.has_social_networks)],
                                                ['Tempo na igreja (texto)', String(detail.volunteer.attendance_duration ?? '—')],
                                                ['Membro oficial', yn(detail.volunteer.is_official_member)],
                                                ['Registo na NS', yn(detail.volunteer.member_record_at_nova_semente)],
                                                ['Registo noutra igreja', String(detail.volunteer.member_record_church ?? '—')],
                                                ['Experiência prévia em ministério', yn(detail.volunteer.has_previous_ministry_volunteer_experience)],
                                                ['Precisa orientação pastoral', yn(detail.volunteer.needs_pastoral_guidance)],
                                                ['Consentimento LGPD', yn(detail.volunteer.lgpd_data_consent)],
                                                ['Área profissional', String(detail.volunteer.professional_area ?? '—')],
                                                [
                                                    'Ministérios no cadastro',
                                                    Array.isArray(detail.volunteer.ministries)
                                                        ? (detail.volunteer.ministries as { name: string }[]).map((m) => m.name).join(', ') || '—'
                                                        : '—',
                                                ],
                                            ].map(([k, val]) => (
                                                <div key={k} className="border-b border-zinc-100 pb-2 dark:border-zinc-800">
                                                    <div className="text-xs font-medium text-zinc-500">{k}</div>
                                                    <div className="text-zinc-900 dark:text-zinc-100 whitespace-pre-wrap">{val}</div>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="mt-6 space-y-2">
                                            <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">Textos longos</h3>
                                            {(
                                                [
                                                    ['Experiências anteriores', detail.volunteer.previous_ministry_details],
                                                    ['Como quer servir', detail.volunteer.ministry_involvement],
                                                    ['Outros interesses', detail.volunteer.other_ministry_interest],
                                                    ['Dons a desenvolver', detail.volunteer.gifts_to_develop],
                                                ] as [string, unknown][]
                                            ).map(([label, val]) => {
                                                const text = val != null && String(val).trim() !== '' ? String(val) : '—';
                                                return (
                                                    <div key={label} className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
                                                        <div className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">{label}</div>
                                                        <div className="mt-1 text-sm text-zinc-800 whitespace-pre-wrap dark:text-zinc-200">{text}</div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </>
                                ) : (
                                    <div className="space-y-4">
                                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                            Notas internas da equipe de voluntariado (histórico abaixo).
                                        </p>
                                        <ul className="max-h-[min(45vh,320px)] space-y-2 overflow-y-auto text-sm">
                                            {detail.notes.length === 0 ? (
                                                <li className="text-zinc-500">Ainda sem notas.</li>
                                            ) : (
                                                detail.notes.map((n) => (
                                                    <li key={n.id} className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900">
                                                        <div className="text-xs text-zinc-500">
                                                            {n.authorName} · {formatDateTime(n.createdAt)}
                                                        </div>
                                                        <div className="text-zinc-800 whitespace-pre-wrap dark:text-zinc-200">{n.body}</div>
                                                    </li>
                                                ))
                                            )}
                                        </ul>
                                        {canPipelineMutate ? (
                                            <form onSubmit={submitNote} className="space-y-2 border-t border-zinc-200 pt-4 dark:border-zinc-700">
                                                <InputLabel value="Nova anotação" />
                                                <Textarea
                                                    value={noteForm.data.body}
                                                    onChange={(e) => noteForm.setData('body', e.target.value)}
                                                    rows={4}
                                                    className="w-full"
                                                    placeholder="Escreva uma nota visível à equipe de voluntariado…"
                                                />
                                                <InputError message={noteForm.errors.body} />
                                                <PrimaryButton type="submit" disabled={noteForm.processing}>
                                                    Adicionar nota
                                                </PrimaryButton>
                                            </form>
                                        ) : (
                                            <p className="border-t border-zinc-200 pt-4 text-xs text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                                                Apenas consulta: não tem permissão para alterar fases nem adicionar anotações.
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="p-6">
                            <p className="text-sm text-red-600">Não foi possível carregar a ficha.</p>
                        </div>
                    )}
                </div>
            </Modal>

            {publicVolunteerSignupUrl && canPipelineMutate ? (
                <PublicVolunteerSignupShareModal
                    show={publicInviteOpen}
                    link={publicVolunteerSignupUrl}
                    churchName={churchName}
                    onClose={() => setPublicInviteOpen(false)}
                />
            ) : null}
        </AdminLayout>
    );
}
