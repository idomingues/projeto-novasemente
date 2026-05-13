import AdminLayout from '@/Layouts/AdminLayout';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { ChatBubbleLeftRightIcon, InboxIcon, PencilIcon, TrashIcon, UserMinusIcon, UserPlusIcon } from '@heroicons/react/24/outline';
import { FormEventHandler, useEffect, useMemo, useRef, useState } from 'react';
import AddButton from '@/Components/AddButton';
import Card from '@/Components/Card';
import FlashMessages from '@/Components/FlashMessages';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import Modal from '@/Components/Modal';
import PageHeader from '@/Components/PageHeader';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import SelectInput from '@/Components/SelectInput';
import Textarea from '@/Components/Textarea';
import TextInput from '@/Components/TextInput';
import AttachVolunteerPickerModal from '@/Components/VolunteerRequests/AttachVolunteerPickerModal';
import SolicitationDetailPanel, { type SolicitationDetailPanelProps } from '@/Components/Solicitations/SolicitationDetailPanel';
import { confirmAction } from '@/utils/confirmDialog';

type ScheduleRoleOption = { id: number; name: string };

type MinistryOption = {
    id: number;
    name: string;
    schedule_roles: ScheduleRoleOption[];
};

type VolunteerAttachOption = {
    id: number;
    name: string;
    email: string | null;
};

type VolunteerRequestRow = {
    id: number;
    subject: string;
    message: string;
    message_preview: string;
    status: string;
    status_label: string;
    created_at: string | null;
    batch_slot_label: string | null;
    requester_name: string | null;
    attached_volunteer_name: string | null;
    attached_volunteer_email: string | null;
    attached_volunteer_id: number | null;
    attached_volunteer_show_url: string | null;
    attached_volunteer_profile: {
        id: number;
        name: string | null;
        email: string | null;
        phone: string | null;
        birthDate: string | null;
        hasWhatsapp: boolean | null;
        hasSocialNetworks: boolean | null;
        attendanceDuration: string | null;
        isOfficialMember: boolean | null;
        memberRecordAtNovaSemente: boolean | null;
        memberRecordChurch: string | null;
        hasPreviousMinistryVolunteerExperience: boolean | null;
        previousMinistryDetails: string | null;
        professionalArea: string | null;
        ministryInvolvement: string | null;
        otherMinistryInterest: string | null;
        giftsToDevelop: string | null;
        needsPastoralGuidance: boolean | null;
        lgpdDataConsent: boolean | null;
        role: string | null;
        appAccessOnly: boolean | null;
    } | null;
    ministry_id: number | null;
    schedule_role_id: number | null;
    can_edit: boolean;
    can_delete: boolean;
    update_url: string | null;
    destroy_url: string | null;
    can_attach_volunteer: boolean;
    attach_volunteer_url: string | null;
    can_detach_volunteer: boolean;
    detach_volunteer_url: string | null;
    panel_json_url: string;
};

type VolunteerPanelPayload = Omit<SolicitationDetailPanelProps, 'variant' | 'section' | 'composerRole'>;

type OpenPanelOpts = {
    tab?: 'detalhes' | 'chat';
    scrollTo?: 'edit' | 'attach';
};

interface Props {
    mode: 'leader' | 'staff';
    rows: VolunteerRequestRow[];
    ministries: MinistryOption[];
    storeUrl: string;
    /** Só modo staff: lista para anexar voluntário ao pedido. */
    volunteersForAttach?: VolunteerAttachOption[];
    /** Só modo staff: JSON com quadro completo (fases + filtros + tabela). */
    attachVolunteerPickerUrl?: string;
}

function formatCreatedAt(iso: string | null): string {
    if (!iso) return '—';
    try {
        return new Date(iso).toLocaleString('pt-PT', { dateStyle: 'short', timeStyle: 'short' });
    } catch {
        return iso;
    }
}

function areaLabelFromSubject(subject: string): string {
    const parts = subject.split('—').map((part) => part.trim()).filter(Boolean);
    if (parts.length >= 2) return parts[1] ?? 'Sem área';
    return 'Sem área';
}

export default function VolunteerRequestsIndex({
    mode,
    rows,
    ministries,
    storeUrl,
    volunteersForAttach = [],
    attachVolunteerPickerUrl,
}: Props) {
    const page = usePage();
    const csrf = (page.props as { csrf_token?: string }).csrf_token ?? '';

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [attachPickerOpen, setAttachPickerOpen] = useState(false);
    /** Voluntário escolhido no modal «Filtros» pode não existir na lista rápida (400). */
    const [attachPickerChoice, setAttachPickerChoice] = useState<{ id: number; name: string } | null>(null);
    const [panelOpen, setPanelOpen] = useState(false);
    const [panelRow, setPanelRow] = useState<VolunteerRequestRow | null>(null);
    const [profileVolunteer, setProfileVolunteer] = useState<VolunteerRequestRow['attached_volunteer_profile'] | null>(null);
    const [panelLoading, setPanelLoading] = useState(false);
    const [panelPayload, setPanelPayload] = useState<VolunteerPanelPayload | null>(null);
    const [panelTab, setPanelTab] = useState<'detalhes' | 'chat'>('detalhes');
    const [panelScrollTarget, setPanelScrollTarget] = useState<'edit' | 'attach' | null>(null);
    const [groupByArea, setGroupByArea] = useState(false);
    const [selectedArea, setSelectedArea] = useState<string | null>(null);
    const prevPanelSolicitationIdRef = useRef<number | null>(null);
    const panelEditSectionRef = useRef<HTMLDivElement | null>(null);
    const panelAttachSectionRef = useRef<HTMLDivElement | null>(null);

    const createForm = useForm({
        ministry_id: '' as '' | number,
        schedule_role_id: '' as '' | number,
        message: '',
        quantity: 1,
    });

    const panelEditForm = useForm({
        ministry_id: '' as '' | number,
        schedule_role_id: '' as '' | number,
        message: '',
    });

    const attachForm = useForm({
        volunteer_id: '' as '' | number,
    });

    const ministryOptions = useMemo(
        () => ministries.map((m) => ({ value: m.id, label: m.name })),
        [ministries],
    );

    const selectedMinistryCreate = useMemo(
        () => ministries.find((m) => m.id === Number(createForm.data.ministry_id)),
        [ministries, createForm.data.ministry_id],
    );

    const roleOptionsCreate = useMemo(() => {
        const roles = selectedMinistryCreate?.schedule_roles ?? [];
        return roles.map((r) => ({ value: r.id, label: r.name }));
    }, [selectedMinistryCreate]);

    const selectedMinistryPanel = useMemo(
        () => ministries.find((m) => m.id === Number(panelEditForm.data.ministry_id)),
        [ministries, panelEditForm.data.ministry_id],
    );

    const roleOptionsPanel = useMemo(() => {
        const roles = selectedMinistryPanel?.schedule_roles ?? [];
        return roles.map((r) => ({ value: r.id, label: r.name }));
    }, [selectedMinistryPanel]);

    const ministryNameById = useMemo(() => {
        const map = new Map<number, string>();
        ministries.forEach((m) => map.set(m.id, m.name));
        return map;
    }, [ministries]);

    const groupedRows = useMemo(() => {
        const groups = new Map<string, VolunteerRequestRow[]>();
        rows.forEach((row) => {
            const area =
                (row.ministry_id != null && row.ministry_id > 0 ? ministryNameById.get(row.ministry_id) : null) ??
                areaLabelFromSubject(row.subject);
            const key = area || 'Sem área';
            const current = groups.get(key) ?? [];
            current.push(row);
            groups.set(key, current);
        });

        return Array.from(groups.entries())
            .sort(([a], [b]) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }))
            .map(([area, items]) => ({ area, items }));
    }, [rows, ministryNameById]);

    useEffect(() => {
        if (!groupByArea) {
            setSelectedArea(null);
            return;
        }

        if (selectedArea && groupedRows.some((group) => group.area === selectedArea)) {
            return;
        }

        setSelectedArea(groupedRows[0]?.area ?? null);
    }, [groupByArea, groupedRows, selectedArea]);

    const onMinistryChangeCreate = (v: string) => {
        const id = v === '' ? '' : Number(v);
        createForm.setData(
            'ministry_id',
            id === '' || Number.isNaN(id) ? '' : id,
        );
        createForm.setData('schedule_role_id', '');
    };

    const onMinistryChangePanel = (v: string) => {
        const id = v === '' ? '' : Number(v);
        panelEditForm.setData(
            'ministry_id',
            id === '' || Number.isNaN(id) ? '' : id,
        );
        panelEditForm.setData('schedule_role_id', '');
    };

    const openModal = () => {
        if (ministries.length === 0) return;
        createForm.reset();
        createForm.clearErrors();
        createForm.setData({
            ministry_id: '',
            schedule_role_id: '',
            message: '',
            quantity: 1,
        });
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        createForm.reset();
        createForm.clearErrors();
    };

    const submitAttach: FormEventHandler = (e) => {
        e.preventDefault();
        if (!panelRow?.attach_volunteer_url) return;
        attachForm.post(panelRow.attach_volunteer_url, {
            preserveScroll: true,
            onSuccess: () => {
                closePanel();
            },
        });
    };

    const handleDelete = async (row: VolunteerRequestRow) => {
        if (!row.destroy_url) return;
        const ok = await confirmAction({
            title: 'Excluir pedido?',
            text: 'O pedido será removido permanentemente e deixa de aparecer na lista de pedidos de voluntário.',
            confirmButtonText: 'Excluir',
            danger: true,
            icon: 'warning',
        });
        if (ok) {
            router.delete(row.destroy_url, { preserveScroll: true });
        }
    };

    const handleDetachVolunteer = async (row: VolunteerRequestRow) => {
        if (!row.detach_volunteer_url) return;
        const ok = await confirmAction({
            title: 'Remover voluntário anexado?',
            text: 'O pedido voltará para pendente e será possível anexar outro voluntário.',
            confirmButtonText: 'Remover anexo',
            danger: true,
            icon: 'warning',
        });
        if (ok) {
            router.post(row.detach_volunteer_url, {}, { preserveScroll: true });
        }
    };

    const submitCreate: FormEventHandler = (e) => {
        e.preventDefault();
        createForm.post(storeUrl, {
            preserveScroll: true,
            onSuccess: () => {
                closeModal();
            },
        });
    };

    const boolLabel = (v: boolean | null | undefined) => {
        if (v === null || v === undefined) return 'Não informado';
        return v ? 'Sim' : 'Não';
    };

    const textLabel = (v: string | null | undefined) => {
        if (!v || v.trim() === '') return '—';
        return v;
    };

    const attendanceLabel = (raw: string | null | undefined) => {
        if (!raw) return '—';
        const map: Record<string, string> = {
            less_than_3_months: 'Menos de 3 meses',
            months_3_6: '3 a 6 meses',
            months_6_12: '6 meses a 1 ano',
            years_1_3: '1 a 3 anos',
            more_than_3_years: 'Mais de 3 anos',
        };
        return map[raw] ?? raw;
    };

    const title = mode === 'staff' ? 'Registar pedido de voluntário' : 'Solicitar voluntário';
    const subtitle =
        mode === 'staff'
            ? 'Pedidos ordenados por data (mais antigos primeiro). Abra um pedido para ver detalhes, chat, alterar dados ou anexar voluntário no mesmo painel. Se na criação indicar quantidade > 1, o sistema gera uma linha por pessoa. Use + para novos pedidos.'
            : 'Os seus pedidos à secretaria (ordenados por data). Abra um pedido para ver detalhes e chat no mesmo painel. Use + para indicar quantidade e departamento; observações e função na escala são opcionais. Quantidade maior que 1 gera um pedido por pessoa.';

    const canAdd = ministries.length > 0;

    const closePanel = () => {
        setPanelOpen(false);
        setPanelRow(null);
        setPanelPayload(null);
        setPanelTab('detalhes');
        setPanelLoading(false);
        setPanelScrollTarget(null);
        setAttachPickerOpen(false);
        setAttachPickerChoice(null);
        attachForm.reset();
        attachForm.clearErrors();
        prevPanelSolicitationIdRef.current = null;
    };

    const refetchPanelPayload = async () => {
        if (!panelRow) return;
        try {
            const r = await fetch(panelRow.panel_json_url, {
                headers: {
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRF-TOKEN': csrf,
                },
                credentials: 'same-origin',
            });
            if (!r.ok) return;
            setPanelPayload((await r.json()) as VolunteerPanelPayload);
        } catch {
            /* manter último payload */
        }
    };

    const submitPanelEdit: FormEventHandler = (e) => {
        e.preventDefault();
        if (!panelRow?.can_edit || !panelRow.update_url) return;
        panelEditForm.put(panelRow.update_url, {
            preserveScroll: true,
            onSuccess: () => {
                void refetchPanelPayload();
                router.reload({ only: ['rows'] });
            },
        });
    };

    const openPanel = async (row: VolunteerRequestRow, opts?: OpenPanelOpts) => {
        setPanelTab(opts?.tab ?? 'detalhes');
        setPanelScrollTarget(opts?.scrollTo ?? null);
        setPanelRow(row);
        setPanelOpen(true);
        if (row.can_edit && row.update_url) {
            panelEditForm.setData({
                ministry_id: row.ministry_id != null && row.ministry_id > 0 ? row.ministry_id : '',
                schedule_role_id:
                    row.schedule_role_id != null && row.schedule_role_id > 0 ? row.schedule_role_id : '',
                message: row.message,
            });
            panelEditForm.clearErrors();
        }
        attachForm.reset();
        attachForm.clearErrors();
        attachForm.setData('volunteer_id', '');
        setAttachPickerChoice(null);
        setAttachPickerOpen(false);
        setPanelPayload(null);
        setPanelLoading(true);
        try {
            const r = await fetch(row.panel_json_url, {
                headers: {
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRF-TOKEN': csrf,
                },
                credentials: 'same-origin',
            });
            if (!r.ok) throw new Error('bad');
            const j = (await r.json()) as VolunteerPanelPayload;
            setPanelPayload(j);
        } catch {
            setPanelPayload(null);
            setPanelOpen(false);
            setPanelRow(null);
        } finally {
            setPanelLoading(false);
        }
    };

    /** Ao mudar de pedido com o painel aberto, voltar ao separador Detalhes (não sobrescrever abertura directa no Chat). */
    useEffect(() => {
        if (!panelOpen) {
            prevPanelSolicitationIdRef.current = null;
            return;
        }
        const id = panelPayload?.solicitation?.id;
        if (id == null) return;
        const prev = prevPanelSolicitationIdRef.current;
        if (prev !== null && prev !== id) {
            setPanelTab('detalhes');
        }
        prevPanelSolicitationIdRef.current = id;
    }, [panelOpen, panelPayload?.solicitation?.id]);

    useEffect(() => {
        if (!panelOpen || panelLoading || panelTab !== 'detalhes' || panelScrollTarget === null) return;
        const target = panelScrollTarget;
        const t = window.setTimeout(() => {
            if (target === 'edit') {
                panelEditSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            } else if (target === 'attach') {
                panelAttachSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
            setPanelScrollTarget(null);
        }, 120);
        return () => window.clearTimeout(t);
    }, [panelOpen, panelLoading, panelTab, panelScrollTarget, panelPayload?.solicitation?.id]);

    useEffect(() => {
        if (panelTab !== 'detalhes') {
            setPanelScrollTarget(null);
        }
    }, [panelTab]);

    useEffect(() => {
        if (!panelOpen || !panelRow) return;
        const next = rows.find((r) => r.id === panelRow.id);
        if (next) setPanelRow(next);
    }, [rows, panelOpen, panelRow?.id]);

    const chatBadgeCount = panelPayload?.messages?.length ?? 0;

    const tabBtn = (active: boolean) =>
        `rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
            active
                ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-white'
                : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
        }`;

    const panelComposerRole = mode === 'staff' ? 'staff' : 'member';

    const renderRequestCard = (row: VolunteerRequestRow) => (
        <Card key={row.id} className="p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-2">
                <button
                    type="button"
                    onClick={() => void openPanel(row)}
                    className="min-w-0 flex-1 rounded-lg text-left text-base font-semibold text-zinc-900 transition hover:text-zinc-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 dark:text-white dark:hover:text-zinc-300 dark:focus-visible:ring-zinc-500"
                >
                    {row.subject}
                </button>
                <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
                    <button
                        type="button"
                        onClick={() => void openPanel(row, { tab: 'chat' })}
                        title="Abrir painel no chat"
                        className="rounded-lg p-2 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-white"
                    >
                        <ChatBubbleLeftRightIcon className="h-5 w-5" aria-hidden />
                    </button>
                    {row.can_attach_volunteer ? (
                        <button
                            type="button"
                            onClick={() => void openPanel(row, { tab: 'detalhes', scrollTo: 'attach' })}
                            title="Abrir painel — anexar voluntário"
                            className="rounded-lg p-2 text-zinc-500 transition hover:bg-emerald-50 hover:text-emerald-800 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-300"
                        >
                            <UserPlusIcon className="h-5 w-5" aria-hidden />
                        </button>
                    ) : null}
                    {row.can_detach_volunteer ? (
                        <button
                            type="button"
                            onClick={() => handleDetachVolunteer(row)}
                            title="Remover voluntário anexado"
                            className="rounded-lg p-2 text-zinc-500 transition hover:bg-amber-50 hover:text-amber-700 dark:hover:bg-amber-950/40 dark:hover:text-amber-300"
                        >
                            <UserMinusIcon className="h-5 w-5" aria-hidden />
                        </button>
                    ) : null}
                    {row.can_edit ? (
                        <button
                            type="button"
                            onClick={() => void openPanel(row, { tab: 'detalhes', scrollTo: 'edit' })}
                            title="Abrir painel — alterar departamento e observações"
                            className="rounded-lg p-2 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-white"
                        >
                            <PencilIcon className="h-5 w-5" aria-hidden />
                        </button>
                    ) : null}
                    {row.can_delete ? (
                        <button
                            type="button"
                            onClick={() => handleDelete(row)}
                            title="Excluir"
                            className="rounded-lg p-2 text-zinc-500 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                        >
                            <TrashIcon className="h-5 w-5" aria-hidden />
                        </button>
                    ) : null}
                    <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
                        {row.status_label}
                    </span>
                </div>
            </div>
            {row.batch_slot_label ? (
                <p className="mt-1 text-xs font-medium text-zinc-600 dark:text-zinc-300">
                    Lote: lugar {row.batch_slot_label}
                </p>
            ) : null}
            {mode === 'staff' && row.requester_name ? (
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Por {row.requester_name}</p>
            ) : null}
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                <span className="font-medium text-zinc-700 dark:text-zinc-300">Observação:</span> {row.message_preview}
            </p>
            <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                <span className="font-medium text-zinc-600 dark:text-zinc-300">Data do pedido:</span>{' '}
                {formatCreatedAt(row.created_at)}
            </p>
            {row.attached_volunteer_name ? (
                <div className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm dark:border-emerald-900/60 dark:bg-emerald-950/20">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-emerald-800 dark:text-emerald-200">Voluntário anexado:</span>
                        <span className="text-emerald-900 dark:text-emerald-100">{row.attached_volunteer_name}</span>
                        {row.attached_volunteer_email ? (
                            <span className="text-emerald-700 dark:text-emerald-300">{` — ${row.attached_volunteer_email}`}</span>
                        ) : null}
                        {row.attached_volunteer_profile ? (
                            <button
                                type="button"
                                onClick={() => setProfileVolunteer(row.attached_volunteer_profile)}
                                className="ml-1 inline-flex items-center rounded-md border border-emerald-300 bg-white/80 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-emerald-800 transition hover:bg-white dark:border-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-200 dark:hover:bg-emerald-950/50"
                            >
                                Ver dados
                            </button>
                        ) : null}
                    </div>
                </div>
            ) : null}
        </Card>
    );

    return (
        <AdminLayout>
            <Head title={title} />
            <FlashMessages />
            <PageHeader
                title={title}
                subtitle={subtitle}
                actions={
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() =>
                                setGroupByArea((prev) => {
                                    const next = !prev;
                                    if (!next) setSelectedArea(null);
                                    return next;
                                })
                            }
                            className="inline-flex items-center rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-wide text-zinc-700 transition hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-zinc-600 dark:hover:bg-zinc-800"
                        >
                            {groupByArea ? 'Lista única' : 'Agrupar por área'}
                        </button>
                        <AddButton
                            variant="icon"
                            onClick={openModal}
                            disabled={!canAdd}
                            title={
                                canAdd
                                    ? 'Novo pedido'
                                    : 'Configure departamentos e funções na escala antes de criar pedidos.'
                            }
                        >
                            Novo pedido
                        </AddButton>
                    </div>
                }
            />

            {!canAdd ? (
                <Card className="mb-6 p-6 text-sm text-zinc-600 dark:text-zinc-400">
                    {mode === 'leader' ? (
                        <p>
                            Não há departamentos associados à sua conta como líder, ou não existem funções de escala
                            configuradas. Peça à secretaria para associar departamentos ou configure funções em{' '}
                            <strong>Escalas</strong>.
                        </p>
                    ) : (
                        <p>
                            Não há departamentos nesta igreja ou não existem funções de escala. Crie departamentos e
                            funções em <strong>Escalas</strong> antes de registar pedidos.
                        </p>
                    )}
                </Card>
            ) : null}

            <div className="space-y-4">
                {rows.length === 0 ? (
                    <Card className="p-10 text-center text-sm text-zinc-600 dark:text-zinc-400">
                        {canAdd ? (
                            <p>
                                Ainda não há pedidos registados. Toque em <strong className="text-zinc-900 dark:text-white">+</strong>{' '}
                                para enviar o primeiro.
                            </p>
                        ) : (
                            <p>Quando existirem departamentos e funções, poderá criar pedidos aqui.</p>
                        )}
                    </Card>
                ) : (
                    groupByArea ? (
                        <div className="space-y-4">
                            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                                {groupedRows.map((group) => {
                                    const isActive = selectedArea === group.area;
                                    return (
                                        <button
                                            key={group.area}
                                            type="button"
                                            onClick={() => setSelectedArea(group.area)}
                                            className={`rounded-2xl border p-4 text-left transition ${
                                                isActive
                                                    ? 'border-emerald-300 bg-emerald-50 shadow-sm dark:border-emerald-800 dark:bg-emerald-950/30'
                                                    : 'border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700 dark:hover:bg-zinc-800/70'
                                            }`}
                                        >
                                            <p
                                                className={`text-sm font-semibold uppercase tracking-wide ${
                                                    isActive
                                                        ? 'text-emerald-800 dark:text-emerald-200'
                                                        : 'text-zinc-700 dark:text-zinc-200'
                                                }`}
                                            >
                                                {group.area}
                                            </p>
                                            <p
                                                className={`mt-2 text-2xl font-bold leading-none ${
                                                    isActive
                                                        ? 'text-emerald-900 dark:text-emerald-100'
                                                        : 'text-zinc-900 dark:text-white'
                                                }`}
                                            >
                                                {group.items.length}
                                            </p>
                                            <p
                                                className={`mt-1 text-xs ${
                                                    isActive
                                                        ? 'text-emerald-700 dark:text-emerald-300'
                                                        : 'text-zinc-500 dark:text-zinc-400'
                                                }`}
                                            >
                                                {group.items.length === 1 ? 'pedido' : 'pedidos'}
                                            </p>
                                        </button>
                                    );
                                })}
                            </div>

                            {selectedArea ? (
                                <section className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-700 dark:text-zinc-300">
                                            Área selecionada: {selectedArea}
                                        </h3>
                                        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                                            {(groupedRows.find((group) => group.area === selectedArea)?.items.length ?? 0).toString()}
                                        </span>
                                    </div>
                                    <div className="space-y-3">
                                        {(groupedRows.find((group) => group.area === selectedArea)?.items ?? []).map((row) =>
                                            renderRequestCard(row),
                                        )}
                                    </div>
                                </section>
                            ) : null}
                        </div>
                    ) : (
                        rows.map((row) => renderRequestCard(row))
                    )
                )}
            </div>

            <Modal
                show={isModalOpen}
                onClose={closeModal}
                maxWidth="lg"
                footer={
                    <div className="flex flex-wrap justify-end gap-2">
                        <SecondaryButton type="button" onClick={closeModal}>
                            Cancelar
                        </SecondaryButton>
                        <PrimaryButton type="submit" form="volunteer-request-create-form" disabled={createForm.processing}>
                            {mode === 'staff' ? 'Registar pedido' : 'Enviar pedido'}
                        </PrimaryButton>
                    </div>
                }
            >
                <form id="volunteer-request-create-form" onSubmit={submitCreate} className="space-y-5 p-6">
                    <div>
                        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
                            {mode === 'staff' ? 'Novo pedido de voluntário' : 'Novo pedido à secretaria'}
                        </h2>
                        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                            {mode === 'staff'
                                ? 'Quantidade opcional (predefinição 1): se for maior que 1, são criados vários pedidos iguais (um por pessoa a anexar). Departamento obrigatório; observações e função na escala opcionais.'
                                : 'Quantidade opcional (predefinição 1): se for maior que 1, são criados vários pedidos. Departamento obrigatório; observações e função na escala opcionais.'}
                        </p>
                    </div>

                    <div>
                        <InputLabel htmlFor="create_ministry_id" value="Departamento" />
                        <SelectInput
                            id="create_ministry_id"
                            name="ministry_id"
                            value={createForm.data.ministry_id === '' ? '' : String(createForm.data.ministry_id)}
                            className="mt-1 block w-full"
                            required
                            onChange={(e) => onMinistryChangeCreate(e.target.value)}
                        >
                            <option value="">Selecione…</option>
                            {ministryOptions.map((o) => (
                                <option key={o.value} value={String(o.value)}>
                                    {o.label}
                                </option>
                            ))}
                        </SelectInput>
                        <InputError className="mt-2" message={createForm.errors.ministry_id} />
                    </div>

                    <div>
                        <InputLabel htmlFor="create_schedule_role_id" value="Função (escala) — opcional" />
                        <SelectInput
                            id="create_schedule_role_id"
                            name="schedule_role_id"
                            value={createForm.data.schedule_role_id === '' ? '' : String(createForm.data.schedule_role_id)}
                            className="mt-1 block w-full"
                            disabled={createForm.data.ministry_id === ''}
                            onChange={(e) => {
                                const v = e.target.value;
                                const id = v === '' ? '' : Number(v);
                                createForm.setData('schedule_role_id', id === '' || Number.isNaN(id) ? '' : id);
                            }}
                        >
                            <option value="">
                                {createForm.data.ministry_id === ''
                                    ? 'Escolha primeiro o departamento'
                                    : 'Sem função específica (opcional)'}
                            </option>
                            {roleOptionsCreate.map((o) => (
                                <option key={o.value} value={String(o.value)}>
                                    {o.label}
                                </option>
                            ))}
                        </SelectInput>
                        <InputError className="mt-2" message={createForm.errors.schedule_role_id} />
                        {createForm.data.ministry_id !== '' && roleOptionsCreate.length === 0 ? (
                            <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                                Este departamento ainda não tem funções na escala; pode enviar o pedido sem observações
                                ou pedir à secretaria para configurar funções em Escalas.
                            </p>
                        ) : null}
                    </div>

                    <div>
                        <InputLabel htmlFor="create_quantity" value="Quantidade (opcional)" />
                        <TextInput
                            id="create_quantity"
                            name="quantity"
                            type="number"
                            min={1}
                            max={50}
                            step={1}
                            value={String(createForm.data.quantity)}
                            className="mt-1 block w-full max-w-xs"
                            onChange={(e) => {
                                const raw = e.target.value;
                                const n = parseInt(raw, 10);
                                createForm.setData('quantity', Number.isNaN(n) || n < 1 ? 1 : Math.min(50, n));
                            }}
                        />
                        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                            Predefinição 1. Máximo 50. Cada unidade gera um pedido separado com a mesma informação.
                        </p>
                        <InputError className="mt-2" message={createForm.errors.quantity} />
                    </div>

                    <div>
                        <InputLabel htmlFor="create_message" value="Observações (opcional)" />
                        <Textarea
                            id="create_message"
                            name="message"
                            value={createForm.data.message}
                            className="mt-1 block w-full"
                            rows={5}
                            placeholder={
                                mode === 'staff'
                                    ? 'Ex.: pedido por WhatsApp de fulano, contacto, urgência do culto…'
                                    : 'Quantidade, datas preferidas, requisitos, etc.'
                            }
                            onChange={(e) => createForm.setData('message', e.target.value)}
                        />
                        <InputError className="mt-2" message={createForm.errors.message} />
                    </div>
                </form>
            </Modal>

            <Modal show={panelOpen} onClose={closePanel} disableBodyScroll maxWidth="2xl">
                <div className="flex max-h-[min(100dvh-1rem,880px)] min-h-0 w-full flex-col overflow-hidden sm:max-h-[min(90dvh,860px)]">
                    <div className="flex shrink-0 items-start gap-3 border-b border-zinc-200 px-5 pb-3 pt-4 dark:border-zinc-800 sm:px-6 sm:pb-4 sm:pt-5">
                        <InboxIcon className="mt-0.5 h-6 w-6 shrink-0 text-zinc-500 dark:text-zinc-400" aria-hidden />
                        <div className="min-w-0 flex-1 pr-10">
                            <h2 className="truncate text-lg font-semibold leading-tight text-zinc-900 dark:text-white">
                                {panelPayload?.solicitation?.typeLabel ?? 'Pedido de voluntário'}
                            </h2>
                            {panelPayload?.solicitation?.memberLabel ? (
                                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                                    Requisitante:{' '}
                                    <span className="font-medium text-zinc-700 dark:text-zinc-300">
                                        {panelPayload.solicitation.memberLabel}
                                    </span>
                                    <span className="mx-1.5 text-zinc-300 dark:text-zinc-600">·</span>
                                    <span className="font-mono text-zinc-400 dark:text-zinc-500">
                                        #{panelPayload.solicitation.id}
                                    </span>
                                </p>
                            ) : null}
                        </div>
                    </div>

                    {panelOpen && (
                        <>
                            <div className="shrink-0 border-b border-zinc-200 px-5 py-2 dark:border-zinc-800 sm:px-6">
                                <div className="inline-flex w-full max-w-md rounded-xl bg-zinc-100 p-1 dark:bg-zinc-800/80">
                                    <button
                                        type="button"
                                        className={`flex-1 ${tabBtn(panelTab === 'detalhes')}`}
                                        onClick={() => setPanelTab('detalhes')}
                                    >
                                        Detalhes
                                    </button>
                                    <button
                                        type="button"
                                        className={`flex flex-1 items-center justify-center gap-2 ${tabBtn(panelTab === 'chat')}`}
                                        onClick={() => setPanelTab('chat')}
                                    >
                                        Chat
                                        {chatBadgeCount > 0 ? (
                                            <span className="inline-flex min-h-[1.25rem] min-w-[1.25rem] items-center justify-center rounded-full bg-emerald-600 px-1.5 text-[10px] font-bold text-white dark:bg-emerald-500">
                                                {chatBadgeCount > 99 ? '99+' : chatBadgeCount}
                                            </span>
                                        ) : null}
                                    </button>
                                </div>
                            </div>

                            <div
                                className={
                                    panelTab === 'chat'
                                        ? 'flex min-h-0 flex-1 flex-col overflow-hidden px-5 py-3 sm:px-6 sm:py-4'
                                        : 'min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-5 py-4 sm:px-6 sm:py-5'
                                }
                            >
                                {panelLoading ? (
                                    <p className="text-sm text-zinc-500">A carregar…</p>
                                ) : panelPayload ? (
                                    <>
                                        {panelTab === 'detalhes' && (
                                            <SolicitationDetailPanel
                                                {...panelPayload}
                                                variant="modal"
                                                section="details"
                                                composerRole={panelComposerRole}
                                                staffBubbleLabel="Secretaria / equipa"
                                                memberBubbleLabel={mode === 'leader' ? 'Eu (requisitante)' : 'Requisitante'}
                                                canManage={panelPayload.canManage === true}
                                                preserveStateOnPanelActions
                                                onPanelActionSuccess={refetchPanelPayload}
                                                detailsBeforeAdminFooter={
                                                    (panelRow?.can_edit && panelRow.update_url) ||
                                                    (mode === 'staff' &&
                                                        panelRow?.can_attach_volunteer &&
                                                        panelRow.attach_volunteer_url) ? (
                                                        <>
                                                            {panelRow?.can_edit && panelRow.update_url ? (
                                                                <div
                                                                    ref={panelEditSectionRef}
                                                                    className="rounded-2xl border border-zinc-200 bg-zinc-50/80 p-4 dark:border-zinc-700 dark:bg-zinc-900/40 sm:p-5"
                                                                >
                                                                    <form
                                                                        id="panel-edit-volunteer-form"
                                                                        onSubmit={submitPanelEdit}
                                                                        className="space-y-4"
                                                                    >
                                                                        <div>
                                                                            <InputLabel htmlFor="panel_ministry_id" value="Departamento" />
                                                                            <SelectInput
                                                                                id="panel_ministry_id"
                                                                                name="ministry_id"
                                                                                value={
                                                                                    panelEditForm.data.ministry_id === ''
                                                                                        ? ''
                                                                                        : String(panelEditForm.data.ministry_id)
                                                                                }
                                                                                className="mt-1 block w-full"
                                                                                required
                                                                                onChange={(e) => onMinistryChangePanel(e.target.value)}
                                                                            >
                                                                                <option value="">Selecione…</option>
                                                                                {ministryOptions.map((o) => (
                                                                                    <option key={o.value} value={String(o.value)}>
                                                                                        {o.label}
                                                                                    </option>
                                                                                ))}
                                                                            </SelectInput>
                                                                            <InputError
                                                                                className="mt-2"
                                                                                message={panelEditForm.errors.ministry_id}
                                                                            />
                                                                        </div>
                                                                        <div>
                                                                            <InputLabel
                                                                                htmlFor="panel_schedule_role_id"
                                                                                value="Função (escala) — opcional"
                                                                            />
                                                                            <SelectInput
                                                                                id="panel_schedule_role_id"
                                                                                name="schedule_role_id"
                                                                                value={
                                                                                    panelEditForm.data.schedule_role_id === ''
                                                                                        ? ''
                                                                                        : String(panelEditForm.data.schedule_role_id)
                                                                                }
                                                                                className="mt-1 block w-full"
                                                                                disabled={panelEditForm.data.ministry_id === ''}
                                                                                onChange={(e) => {
                                                                                    const v = e.target.value;
                                                                                    const id = v === '' ? '' : Number(v);
                                                                                    panelEditForm.setData(
                                                                                        'schedule_role_id',
                                                                                        id === '' || Number.isNaN(id) ? '' : id,
                                                                                    );
                                                                                }}
                                                                            >
                                                                                <option value="">
                                                                                    {panelEditForm.data.ministry_id === ''
                                                                                        ? 'Escolha primeiro o departamento'
                                                                                        : 'Sem função específica (opcional)'}
                                                                                </option>
                                                                                {roleOptionsPanel.map((o) => (
                                                                                    <option key={o.value} value={String(o.value)}>
                                                                                        {o.label}
                                                                                    </option>
                                                                                ))}
                                                                            </SelectInput>
                                                                            <InputError
                                                                                className="mt-2"
                                                                                message={panelEditForm.errors.schedule_role_id}
                                                                            />
                                                                        </div>
                                                                        <div>
                                                                            <InputLabel htmlFor="panel_message" value="Observações (opcional)" />
                                                                            <Textarea
                                                                                id="panel_message"
                                                                                name="message"
                                                                                value={panelEditForm.data.message}
                                                                                className="mt-1 block w-full"
                                                                                rows={4}
                                                                                onChange={(e) =>
                                                                                    panelEditForm.setData('message', e.target.value)
                                                                                }
                                                                            />
                                                                            <InputError
                                                                                className="mt-2"
                                                                                message={panelEditForm.errors.message}
                                                                            />
                                                                        </div>
                                                                        <div className="flex justify-end pt-1">
                                                                            <PrimaryButton type="submit" disabled={panelEditForm.processing}>
                                                                                Guardar alterações
                                                                            </PrimaryButton>
                                                                        </div>
                                                                    </form>
                                                                </div>
                                                            ) : null}
                                                            {mode === 'staff' &&
                                                            panelRow?.can_attach_volunteer &&
                                                            panelRow.attach_volunteer_url ? (
                                                        <div
                                                            ref={panelAttachSectionRef}
                                                            className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 dark:border-emerald-900/60 dark:bg-emerald-950/25 sm:p-5"
                                                        >
                                                            <h3 className="text-sm font-semibold uppercase tracking-wide text-emerald-800 dark:text-emerald-200">
                                                                Concluir: anexar voluntário
                                                            </h3>
                                                            <p className="mt-1 text-sm text-emerald-900/90 dark:text-emerald-100/90">
                                                                Será criado o convite ao departamento indicado no pedido (como no
                                                                encaminhamento manual). O pedido passa a{' '}
                                                                <strong className="font-semibold">concluído</strong>, fica registo no
                                                                histórico e o voluntário entra na fase «Encaminhado» no cadastro,
                                                                quando essa fase existir.
                                                            </p>
                                                            <form
                                                                id="attach-volunteer-inline-form"
                                                                onSubmit={submitAttach}
                                                                className="mt-4 space-y-4"
                                                            >
                                                                {volunteersForAttach.length === 0 && !attachVolunteerPickerUrl ? (
                                                                    <p className="text-sm text-amber-800 dark:text-amber-200">
                                                                        Não há voluntários listáveis nesta igreja. Crie ou associe
                                                                        cadastros em <strong>Voluntários</strong> antes de anexar.
                                                                    </p>
                                                                ) : volunteersForAttach.length === 0 && attachVolunteerPickerUrl ? (
                                                                    <div className="space-y-3">
                                                                        <p className="text-sm text-zinc-700 dark:text-zinc-300">
                                                                            A lista rápida está vazia. Abra o quadro completo (como na
                                                                            página Voluntários) para procurar e escolher o voluntário.
                                                                        </p>
                                                                        <SecondaryButton type="button" onClick={() => setAttachPickerOpen(true)}>
                                                                            Filtros
                                                                        </SecondaryButton>
                                                                        {attachForm.data.volunteer_id !== '' ? (
                                                                            <p className="text-sm font-medium text-zinc-800 dark:text-zinc-100">
                                                                                Selecionado:{' '}
                                                                                {attachPickerChoice?.id === attachForm.data.volunteer_id
                                                                                    ? attachPickerChoice.name
                                                                                    : `ID ${String(attachForm.data.volunteer_id)}`}
                                                                            </p>
                                                                        ) : null}
                                                                        <InputError className="mt-2" message={attachForm.errors.volunteer_id} />
                                                                    </div>
                                                                ) : (
                                                                    <div>
                                                                        <InputLabel htmlFor="attach_volunteer_id_inline" value="Voluntário" />
                                                                        <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-end">
                                                                            <div className="min-w-0 flex-1">
                                                                                <SelectInput
                                                                                    id="attach_volunteer_id_inline"
                                                                                    name="volunteer_id"
                                                                                    value={
                                                                                        attachForm.data.volunteer_id === ''
                                                                                            ? ''
                                                                                            : String(attachForm.data.volunteer_id)
                                                                                    }
                                                                                    className="block w-full"
                                                                                    onChange={(e) => {
                                                                                        const v = e.target.value;
                                                                                        const id = v === '' ? '' : Number(v);
                                                                                        attachForm.setData(
                                                                                            'volunteer_id',
                                                                                            id === '' || Number.isNaN(id) ? '' : id,
                                                                                        );
                                                                                        if (v === '') {
                                                                                            setAttachPickerChoice(null);
                                                                                        } else {
                                                                                            const fromList = volunteersForAttach.find(
                                                                                                (x) => x.id === id,
                                                                                            );
                                                                                            if (fromList) {
                                                                                                setAttachPickerChoice(null);
                                                                                            }
                                                                                        }
                                                                                    }}
                                                                                >
                                                                                    <option value="">Selecione o voluntário…</option>
                                                                                    {attachPickerChoice &&
                                                                                    !volunteersForAttach.some(
                                                                                        (x) => x.id === attachPickerChoice.id,
                                                                                    ) ? (
                                                                                        <option value={String(attachPickerChoice.id)}>
                                                                                            {attachPickerChoice.name.trim() ||
                                                                                                `Voluntário #${attachPickerChoice.id}`}{' '}
                                                                                            (quadro detalhado)
                                                                                        </option>
                                                                                    ) : null}
                                                                                    {volunteersForAttach.map((v) => (
                                                                                        <option key={v.id} value={String(v.id)}>
                                                                                            {v.name}
                                                                                            {v.email ? ` — ${v.email}` : ''}
                                                                                        </option>
                                                                                    ))}
                                                                                </SelectInput>
                                                                            </div>
                                                                            {attachVolunteerPickerUrl ? (
                                                                                <SecondaryButton
                                                                                    type="button"
                                                                                    onClick={() => setAttachPickerOpen(true)}
                                                                                >
                                                                                    Filtros
                                                                                </SecondaryButton>
                                                                            ) : null}
                                                                        </div>
                                                                        <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                                                                            Use{' '}
                                                                            <strong className="font-medium text-zinc-700 dark:text-zinc-300">
                                                                                Filtros
                                                                            </strong>{' '}
                                                                            para o quadro completo (fase, contacto, ministérios, etc.),
                                                                            como na página Voluntários.
                                                                        </p>
                                                                        <InputError className="mt-2" message={attachForm.errors.volunteer_id} />
                                                                    </div>
                                                                )}
                                                                <div className="flex flex-wrap justify-end gap-2 pt-2">
                                                                    <PrimaryButton
                                                                        type="submit"
                                                                        disabled={
                                                                            attachForm.processing ||
                                                                            (attachForm.data.volunteer_id === '' &&
                                                                                volunteersForAttach.length === 0 &&
                                                                                !attachVolunteerPickerUrl)
                                                                        }
                                                                    >
                                                                        Anexar e concluir
                                                                    </PrimaryButton>
                                                                </div>
                                                            </form>
                                                        </div>
                                                    ) : null}
                                                </>
                                            ) : undefined
                                            }
                                            />
                                        )}

                                        {panelTab === 'chat' && (
                                            <SolicitationDetailPanel
                                                {...panelPayload}
                                                variant="modal"
                                                section="chat"
                                                composerRole={panelComposerRole}
                                                staffBubbleLabel="Secretaria / equipa"
                                                memberBubbleLabel={mode === 'leader' ? 'Eu (requisitante)' : 'Requisitante'}
                                                canManage={panelPayload.canManage === true}
                                                preserveStateOnPanelActions
                                                onPanelActionSuccess={refetchPanelPayload}
                                            />
                                        )}
                                    </>
                                ) : (
                                    <p className="text-sm text-red-600 dark:text-red-400">Não foi possível carregar o painel.</p>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </Modal>

            {mode === 'staff' && attachVolunteerPickerUrl ? (
                <AttachVolunteerPickerModal
                    open={attachPickerOpen}
                    onClose={() => setAttachPickerOpen(false)}
                    pickerUrl={attachVolunteerPickerUrl}
                    onSelectVolunteer={(id, name) => {
                        const label = (name ?? '').trim() || `Voluntário #${id}`;
                        setAttachPickerChoice({ id, name: label });
                        attachForm.setData('volunteer_id', id);
                        attachForm.clearErrors();
                    }}
                />
            ) : null}

            <Modal show={!!profileVolunteer} onClose={() => setProfileVolunteer(null)} maxWidth="lg">
                {profileVolunteer ? (
                    <div className="space-y-4 p-6">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Dados do voluntário</h2>
                                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">{profileVolunteer.name ?? 'Voluntário'}</p>
                            </div>
                            <SecondaryButton type="button" onClick={() => setProfileVolunteer(null)}>
                                Fechar
                            </SecondaryButton>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                            <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
                                <div className="text-xs text-zinc-500">E-mail</div>
                                <div className="mt-1 text-sm text-zinc-900 dark:text-white">{textLabel(profileVolunteer.email)}</div>
                            </div>
                            <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
                                <div className="text-xs text-zinc-500">Telefone</div>
                                <div className="mt-1 text-sm text-zinc-900 dark:text-white">{textLabel(profileVolunteer.phone)}</div>
                            </div>
                            <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
                                <div className="text-xs text-zinc-500">Data de nascimento</div>
                                <div className="mt-1 text-sm text-zinc-900 dark:text-white">{textLabel(profileVolunteer.birthDate)}</div>
                            </div>
                            <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
                                <div className="text-xs text-zinc-500">Área profissional</div>
                                <div className="mt-1 text-sm text-zinc-900 dark:text-white">{textLabel(profileVolunteer.professionalArea)}</div>
                            </div>
                            <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
                                <div className="text-xs text-zinc-500">Este número tem WhatsApp?</div>
                                <div className="mt-1 text-sm text-zinc-900 dark:text-white">{boolLabel(profileVolunteer.hasWhatsapp)}</div>
                            </div>
                            <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
                                <div className="text-xs text-zinc-500">Redes Sociais (Instagram, Facebook ou TikTok)</div>
                                <div className="mt-1 text-sm text-zinc-900 dark:text-white">{boolLabel(profileVolunteer.hasSocialNetworks)}</div>
                            </div>
                            <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
                                <div className="text-xs text-zinc-500">Há quanto tempo você frequenta a Nova Semente?</div>
                                <div className="mt-1 text-sm text-zinc-900 dark:text-white">{attendanceLabel(profileVolunteer.attendanceDuration)}</div>
                            </div>
                            <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
                                <div className="text-xs text-zinc-500">Você é membro oficial da igreja adventista?</div>
                                <div className="mt-1 text-sm text-zinc-900 dark:text-white">{boolLabel(profileVolunteer.isOfficialMember)}</div>
                            </div>
                            <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
                                <div className="text-xs text-zinc-500">Seu registro de membro está na Nova Semente?</div>
                                <div className="mt-1 text-sm text-zinc-900 dark:text-white">{boolLabel(profileVolunteer.memberRecordAtNovaSemente)}</div>
                            </div>
                            <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
                                <div className="text-xs text-zinc-500">Se não estiver, em qual igreja está?</div>
                                <div className="mt-1 text-sm text-zinc-900 dark:text-white">{textLabel(profileVolunteer.memberRecordChurch)}</div>
                            </div>
                            <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
                                <div className="text-xs text-zinc-500">Você já foi voluntário em algum ministério da igreja?</div>
                                <div className="mt-1 text-sm text-zinc-900 dark:text-white">{boolLabel(profileVolunteer.hasPreviousMinistryVolunteerExperience)}</div>
                            </div>
                            <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
                                <div className="text-xs text-zinc-500">Precisa de alguma orientação pastoral nesse momento?</div>
                                <div className="mt-1 text-sm text-zinc-900 dark:text-white">{boolLabel(profileVolunteer.needsPastoralGuidance)}</div>
                            </div>
                            <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
                                <div className="text-xs text-zinc-500">Consentimento LGPD</div>
                                <div className="mt-1 text-sm text-zinc-900 dark:text-white">{boolLabel(profileVolunteer.lgpdDataConsent)}</div>
                            </div>
                            <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
                                <div className="text-xs text-zinc-500">Função/cargo informado</div>
                                <div className="mt-1 text-sm text-zinc-900 dark:text-white">{textLabel(profileVolunteer.role)}</div>
                            </div>
                            <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
                                <div className="text-xs text-zinc-500">Acesso somente app</div>
                                <div className="mt-1 text-sm text-zinc-900 dark:text-white">{boolLabel(profileVolunteer.appAccessOnly)}</div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
                                <div className="text-xs text-zinc-500">Detalhes da experiência anterior</div>
                                <div className="mt-1 whitespace-pre-wrap text-sm text-zinc-900 dark:text-white">
                                    {textLabel(profileVolunteer.previousMinistryDetails)}
                                </div>
                            </div>
                            <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
                                <div className="text-xs text-zinc-500">Envolvimento em ministérios</div>
                                <div className="mt-1 whitespace-pre-wrap text-sm text-zinc-900 dark:text-white">
                                    {textLabel(profileVolunteer.ministryInvolvement)}
                                </div>
                            </div>
                            <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
                                <div className="text-xs text-zinc-500">Outros interesses ministeriais</div>
                                <div className="mt-1 whitespace-pre-wrap text-sm text-zinc-900 dark:text-white">
                                    {textLabel(profileVolunteer.otherMinistryInterest)}
                                </div>
                            </div>
                            <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
                                <div className="text-xs text-zinc-500">Dons a desenvolver</div>
                                <div className="mt-1 whitespace-pre-wrap text-sm text-zinc-900 dark:text-white">
                                    {textLabel(profileVolunteer.giftsToDevelop)}
                                </div>
                            </div>
                        </div>
                    </div>
                ) : null}
            </Modal>
        </AdminLayout>
    );
}
