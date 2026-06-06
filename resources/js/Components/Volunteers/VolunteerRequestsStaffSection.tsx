import { router, useForm, usePage } from '@inertiajs/react';
import {
    ArchiveBoxArrowDownIcon,
    ArchiveBoxIcon,
    ChatBubbleLeftRightIcon,
    InboxIcon,
    PencilIcon,
    SparklesIcon,
    UserMinusIcon,
    UserPlusIcon,
} from '@heroicons/react/24/outline';
import { FormEventHandler, KeyboardEvent, MouseEvent, useEffect, useMemo, useRef, useState } from 'react';
import AddButton from '@/Components/AddButton';
import Card from '@/Components/Card';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import Modal from '@/Components/Modal';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import SelectInput from '@/Components/SelectInput';
import Textarea from '@/Components/Textarea';
import TextInput from '@/Components/TextInput';
import VolunteerRequestAttachModal from '@/Components/VolunteerRequests/VolunteerRequestAttachModal';
import VolunteerRequestAreaTags from '@/Components/VolunteerRequests/VolunteerRequestAreaTags';
import VolunteerQuestionnaireProfileModal, {
    type VolunteerQuestionnaireProfile,
} from '@/Components/Volunteers/VolunteerQuestionnaireProfileModal';
import SolicitationDetailPanel, { type SolicitationDetailPanelProps } from '@/Components/Solicitations/SolicitationDetailPanel';
import { confirmAction } from '@/utils/confirmDialog';
import { inertiaListModalSave } from '@/utils/inertiaListModalSave';
import {
    buildVolunteerRequestAreaTags,
    filterVolunteerRequestRowsByArea,
} from '@/utils/volunteerRequestAreas';

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

export type VolunteerRequestRow = {
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
    attached_volunteer_profile: VolunteerQuestionnaireProfile | null;
    ministry_id: number | null;
    schedule_role_id: number | null;
    can_edit: boolean;
    can_delete: boolean;
    update_url: string | null;
    destroy_url: string | null;
    can_archive: boolean;
    archive_url: string | null;
    can_unarchive: boolean;
    unarchive_url: string | null;
    can_attach_volunteer: boolean;
    attach_volunteer_url: string | null;
    suggest_volunteers_url: string | null;
    can_detach_volunteer: boolean;
    detach_volunteer_url: string | null;
    panel_json_url: string;
};

type VolunteerPanelPayload = Omit<SolicitationDetailPanelProps, 'variant' | 'section' | 'composerRole'> & {
    suggestVolunteersUrl?: string | null;
};

type OpenPanelOpts = {
    tab?: 'detalhes' | 'chat';
    scrollTo?: 'edit';
};

export interface VolunteerRequestsStaffSectionProps {
    rows: VolunteerRequestRow[];
    ministries: MinistryOption[];
    storeUrl: string;
    volunteersForAttach?: VolunteerAttachOption[];
    attachVolunteerPickerUrl?: string;
    filters?: { arquivados: boolean };
    archivedCount?: number;
    activeCount?: number;
}

function pedidosIndexParams(arquivados: boolean): Record<string, string> {
    if (arquivados) {
        return { arquivados: '1' };
    }

    return {};
}

function formatCreatedAt(iso: string | null): string {
    if (!iso) return '—';
    try {
        return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
    } catch {
        return iso;
    }
}

export default function VolunteerRequestsStaffSection({
    rows,
    ministries,
    storeUrl,
    volunteersForAttach = [],
    attachVolunteerPickerUrl,
    filters = { arquivados: false },
    archivedCount = 0,
    activeCount = 0,
}: VolunteerRequestsStaffSectionProps) {
    const mode = 'staff' as const;
    const page = usePage();
    const csrf = (page.props as { csrf_token?: string }).csrf_token ?? '';

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [attachModalOpen, setAttachModalOpen] = useState(false);
    const [attachModalRow, setAttachModalRow] = useState<VolunteerRequestRow | null>(null);
    const [attachModalAutoSuggest, setAttachModalAutoSuggest] = useState(false);
    const [panelOpen, setPanelOpen] = useState(false);
    const [panelRow, setPanelRow] = useState<VolunteerRequestRow | null>(null);
    const [profileVolunteer, setProfileVolunteer] = useState<VolunteerQuestionnaireProfile | null>(null);
    const [panelLoading, setPanelLoading] = useState(false);
    const [panelPayload, setPanelPayload] = useState<VolunteerPanelPayload | null>(null);
    const [panelTab, setPanelTab] = useState<'detalhes' | 'chat'>('detalhes');
    const [panelScrollTarget, setPanelScrollTarget] = useState<'edit' | null>(null);
    const [viewTab, setViewTab] = useState<'lista' | 'por-area' | 'arquivados'>(() =>
        filters.arquivados ? 'arquivados' : 'lista',
    );
    const [selectedArea, setSelectedArea] = useState<string | null>(null);
    const groupByArea = viewTab === 'por-area';

    useEffect(() => {
        if (filters.arquivados) {
            setViewTab('arquivados');
        }
    }, [filters.arquivados]);
    const prevPanelSolicitationIdRef = useRef<number | null>(null);
    const panelEditSectionRef = useRef<HTMLDivElement | null>(null);

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

    const areaTags = useMemo(
        () => buildVolunteerRequestAreaTags(rows, ministries, ministryNameById),
        [rows, ministries, ministryNameById],
    );

    const selectedAreaRows = useMemo(() => {
        if (!selectedArea) return [];
        return filterVolunteerRequestRowsByArea(rows, selectedArea, ministryNameById);
    }, [rows, selectedArea, ministryNameById]);

    useEffect(() => {
        if (!groupByArea) {
            setSelectedArea(null);
            return;
        }

        if (selectedArea && areaTags.some((tag) => tag.area === selectedArea)) {
            return;
        }

        setSelectedArea(areaTags.find((tag) => tag.count > 0)?.area ?? areaTags[0]?.area ?? null);
    }, [groupByArea, areaTags, selectedArea]);

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

    const openAttachModal = (row: VolunteerRequestRow, autoSuggest = false) => {
        setAttachModalRow(row);
        setAttachModalAutoSuggest(autoSuggest);
        setAttachModalOpen(true);
    };

    const closeAttachModal = () => {
        setAttachModalOpen(false);
        setAttachModalRow(null);
        setAttachModalAutoSuggest(false);
    };

    const handleArchiveFromList = async (row: VolunteerRequestRow) => {
        if (!row.archive_url) return;
        const ok = await confirmAction({
            title: 'Arquivar pedido?',
            text: 'O pedido deixa de aparecer na lista ativa. Você pode consultá-lo em «Arquivados».',
            confirmButtonText: 'Arquivar',
            icon: 'question',
        });
        if (ok) {
            router.post(row.archive_url, {}, { preserveScroll: true });
        }
    };

    const handleUnarchiveFromList = async (row: VolunteerRequestRow) => {
        if (!row.unarchive_url) return;
        const ok = await confirmAction({
            title: 'Restaurar pedido?',
            text: 'O pedido voltará à lista ativa de pedidos de voluntário.',
            confirmButtonText: 'Restaurar',
            icon: 'question',
        });
        if (ok) {
            router.post(row.unarchive_url, {}, { preserveScroll: true });
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
            ...inertiaListModalSave,
            onSuccess: () => {
                createForm.reset();
                createForm.clearErrors();
            },
        });
    };

    const canAdd = ministries.length > 0;

    const goToPedidosView = (mode: 'lista' | 'por-area' | 'arquivados') => {
        if (mode === 'arquivados') {
            if (filters.arquivados) {
                setViewTab('arquivados');
                return;
            }
            setSelectedArea(null);
            router.get(route('ministry-lead.volunteers.pedidos'), pedidosIndexParams(true), {
                preserveState: false,
                preserveScroll: false,
                replace: true,
                onFinish: () => setViewTab('arquivados'),
            });
            return;
        }

        if (filters.arquivados) {
            setSelectedArea(null);
            router.get(route('ministry-lead.volunteers.pedidos'), pedidosIndexParams(false), {
                preserveState: false,
                preserveScroll: false,
                replace: true,
                onFinish: () => setViewTab(mode),
            });
            return;
        }

        setViewTab(mode);
        if (mode === 'lista') {
            setSelectedArea(null);
        }
    };

    const handleArchiveStaff = async () => {
        const archiveUrl = panelPayload?.archiveStaffUrl;
        if (!archiveUrl) return;
        const ok = await confirmAction({
            title: 'Arquivar pedido?',
            text: 'O pedido deixa de aparecer na lista ativa. Você pode consultá-lo em «Arquivados».',
            confirmButtonText: 'Arquivar',
            icon: 'question',
        });
        if (ok) {
            router.post(archiveUrl, {}, { preserveScroll: true });
        }
    };

    const handleUnarchiveStaff = async () => {
        const unarchiveUrl = panelPayload?.unarchiveStaffUrl;
        if (!unarchiveUrl) return;
        const ok = await confirmAction({
            title: 'Restaurar pedido?',
            text: 'O pedido voltará à lista ativa de pedidos de voluntário.',
            confirmButtonText: 'Restaurar',
            icon: 'question',
        });
        if (ok) {
            router.post(unarchiveUrl, {}, { preserveScroll: true });
        }
    };

    const closePanel = () => {
        setPanelOpen(false);
        setPanelRow(null);
        setPanelPayload(null);
        setPanelTab('detalhes');
        setPanelLoading(false);
        setPanelScrollTarget(null);
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
            ...inertiaListModalSave,
            onSuccess: () => {
                void refetchPanelPayload();
                router.reload({ only: ['volunteerRequestRows'] });
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

    /** Ao mudar de pedido com o painel aberto, voltar ao aba Detalhes (não sobrescrever abertura directa no Chat). */
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

    const stopRowClick = (e: MouseEvent | KeyboardEvent) => {
        e.stopPropagation();
    };

    const renderRequestCard = (row: VolunteerRequestRow) => (
        <Card
            key={row.id}
            role="button"
            tabIndex={0}
            aria-label={`Abrir pedido: ${row.subject}`}
            onClick={() => void openPanel(row)}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    void openPanel(row);
                }
            }}
            className="cursor-pointer touch-manipulation p-4 transition-colors hover:border-zinc-300 hover:bg-zinc-50/80 active:scale-[0.998] focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 dark:hover:border-zinc-600 dark:hover:bg-zinc-800/40 dark:focus-visible:ring-zinc-500 sm:p-5"
        >
            <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="min-w-0 flex-1 text-base font-semibold text-zinc-900 dark:text-white">{row.subject}</p>
                <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5" onClick={stopRowClick} onKeyDown={stopRowClick}>
                    <button
                        type="button"
                        onClick={() => void openPanel(row, { tab: 'chat' })}
                        title="Abrir painel no chat"
                        className="rounded-lg p-2 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-white"
                    >
                        <ChatBubbleLeftRightIcon className="h-5 w-5" aria-hidden />
                    </button>
                    {row.can_attach_volunteer && row.suggest_volunteers_url ? (
                        <button
                            type="button"
                            onClick={() => openAttachModal(row, true)}
                            title="Vincular com sugestão inteligente"
                            className="rounded-lg p-2 text-violet-600 transition hover:bg-violet-50 hover:text-violet-800 dark:text-violet-400 dark:hover:bg-violet-950/40 dark:hover:text-violet-300"
                        >
                            <SparklesIcon className="h-5 w-5" aria-hidden />
                        </button>
                    ) : null}
                    {row.can_attach_volunteer && row.attach_volunteer_url ? (
                        <button
                            type="button"
                            onClick={() => openAttachModal(row, false)}
                            title="Vincular voluntário"
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
                    {row.can_archive ? (
                        <button
                            type="button"
                            onClick={() => void handleArchiveFromList(row)}
                            title="Arquivar"
                            className="rounded-lg p-2 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-white"
                        >
                            <ArchiveBoxIcon className="h-5 w-5" aria-hidden />
                        </button>
                    ) : null}
                    {row.can_unarchive ? (
                        <button
                            type="button"
                            onClick={() => void handleUnarchiveFromList(row)}
                            title="Restaurar na lista ativa"
                            className="rounded-lg p-2 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-white"
                        >
                            <ArchiveBoxArrowDownIcon className="h-5 w-5" aria-hidden />
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
                                onClick={(e) => {
                                    stopRowClick(e);
                                    setProfileVolunteer(row.attached_volunteer_profile);
                                }}
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
        <div className="space-y-4">
            <div
                className={`flex flex-wrap items-start gap-3 ${filters.arquivados ? 'justify-between' : 'justify-end'}`}
            >
                {filters.arquivados ? (
                    <p className="max-w-3xl text-sm text-zinc-600 dark:text-zinc-400">
                        Pedidos arquivados pela equipe — não aparecem na lista ativa nem no contador do menu.
                    </p>
                ) : null}
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

            {!canAdd ? (
                <Card className="p-6 text-sm text-zinc-600 dark:text-zinc-400">
                    <p>
                        Não há departamentos nesta igreja ou não existem funções de escala. Crie departamentos e funções
                        em <strong>Escalas</strong> antes de registrar pedidos.
                    </p>
                </Card>
            ) : null}

            <Card className="mb-4 p-2">
                <div className="flex flex-wrap gap-2 rounded-xl bg-zinc-100 p-1 dark:bg-zinc-800">
                    <button
                        type="button"
                        onClick={() => goToPedidosView('lista')}
                        className={`min-w-[6rem] flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${
                            viewTab === 'lista'
                                ? 'bg-white text-zinc-900 shadow dark:bg-zinc-950 dark:text-white'
                                : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'
                        }`}
                    >
                        Lista ({filters.arquivados ? activeCount : rows.length})
                    </button>
                    <button
                        type="button"
                        onClick={() => goToPedidosView('por-area')}
                        disabled={filters.arquivados}
                        className={`min-w-[6rem] flex-1 rounded-lg px-3 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${
                            viewTab === 'por-area'
                                ? 'bg-white text-zinc-900 shadow dark:bg-zinc-950 dark:text-white'
                                : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'
                        }`}
                    >
                        Por área ({areaTags.length})
                    </button>
                    <button
                        type="button"
                        onClick={() => goToPedidosView('arquivados')}
                        className={`min-w-[6rem] flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${
                            viewTab === 'arquivados'
                                ? 'bg-white text-zinc-900 shadow dark:bg-zinc-950 dark:text-white'
                                : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'
                        }`}
                    >
                        Arquivados ({filters.arquivados ? rows.length : archivedCount})
                    </button>
                </div>

                {viewTab === 'por-area' && !filters.arquivados ? (
                    <div className="mt-3 border-t border-zinc-200 px-1 pt-3 dark:border-zinc-700">
                        <VolunteerRequestAreaTags
                            tags={areaTags}
                            selectedArea={selectedArea}
                            onSelect={setSelectedArea}
                        />
                    </div>
                ) : null}
            </Card>

            <div className="space-y-4">
                {rows.length === 0 ? (
                    <Card className="p-10 text-center text-sm text-zinc-600 dark:text-zinc-400">
                        {filters.arquivados ? (
                            <p>Nenhum pedido de voluntário arquivado.</p>
                        ) : canAdd ? (
                            <p>
                                Ainda não há pedidos registrados. Toque em <strong className="text-zinc-900 dark:text-white">+</strong>{' '}
                                para enviar o primeiro.
                            </p>
                        ) : (
                            <p>Quando existirem departamentos e funções, poderá criar pedidos aqui.</p>
                        )}
                    </Card>
                ) : (
                    groupByArea ? (
                        <div className="space-y-4">
                            {selectedArea ? (
                                <section className="space-y-3">
                                    <div className="flex items-center justify-between gap-2">
                                        <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-700 dark:text-zinc-300">
                                            {selectedArea}
                                        </h3>
                                        <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                                            {selectedAreaRows.length}
                                        </span>
                                    </div>
                                    {selectedAreaRows.length === 0 ? (
                                        <Card className="p-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
                                            Nenhum pedido nesta área.
                                        </Card>
                                    ) : (
                                        <div className="space-y-3">
                                            {selectedAreaRows.map((row) => renderRequestCard(row))}
                                        </div>
                                    )}
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
                            Registrar pedido
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
                                    ? 'Ex.: pedido por WhatsApp de fulano, contato, urgência do culto…'
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
                                                staffBubbleLabel="Secretaria / equipe"
                                                memberBubbleLabel="Requisitante"
                                                canManage={panelPayload.canManage === true}
                                                preserveStateOnPanelActions
                                                onPanelActionSuccess={refetchPanelPayload}
                                                detailsBeforeAdminFooter={
                                                    (panelRow?.can_edit && panelRow.update_url) ||
                                                    (panelRow?.can_attach_volunteer && panelRow.attach_volunteer_url) ? (
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
                                                                                Salvar alterações
                                                                            </PrimaryButton>
                                                                        </div>
                                                                    </form>
                                                                </div>
                                                            ) : null}
                                                            {panelRow?.can_attach_volunteer && panelRow.attach_volunteer_url ? (
                                                                <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/40 px-4 py-3 dark:border-emerald-900/50 dark:bg-emerald-950/20">
                                                                    <p className="text-sm text-emerald-900 dark:text-emerald-100">
                                                                        Para <strong>vincular voluntário</strong>, feche este painel e use os
                                                                        ícones na lista:{' '}
                                                                        <SparklesIcon className="inline h-4 w-4 text-violet-600" aria-hidden />{' '}
                                                                        sugestão inteligente ou{' '}
                                                                        <UserPlusIcon className="inline h-4 w-4" aria-hidden /> vincular
                                                                        manual.
                                                                    </p>
                                                                    <div className="mt-3 flex flex-wrap gap-2">
                                                                        {panelRow.suggest_volunteers_url ? (
                                                                            <SecondaryButton
                                                                                type="button"
                                                                                onClick={() => openAttachModal(panelRow, true)}
                                                                            >
                                                                                <SparklesIcon className="mr-1.5 h-4 w-4" aria-hidden />
                                                                                Sugestão inteligente
                                                                            </SecondaryButton>
                                                                        ) : null}
                                                                        <SecondaryButton
                                                                            type="button"
                                                                            onClick={() => openAttachModal(panelRow, false)}
                                                                        >
                                                                            Vincular voluntário
                                                                        </SecondaryButton>
                                                                    </div>
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
                                                staffBubbleLabel="Secretaria / equipe"
                                                memberBubbleLabel="Requisitante"
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

                            {panelPayload?.archiveStaffUrl || panelPayload?.unarchiveStaffUrl ? (
                                <div className="shrink-0 border-t border-zinc-200 px-5 py-3 dark:border-zinc-800 sm:px-6">
                                    {panelPayload.archiveStaffUrl ? (
                                        <SecondaryButton
                                            type="button"
                                            className="w-full justify-center sm:w-auto"
                                            onClick={() => void handleArchiveStaff()}
                                        >
                                            <ArchiveBoxIcon className="mr-2 h-4 w-4" aria-hidden />
                                            Arquivar pedido
                                        </SecondaryButton>
                                    ) : null}
                                    {panelPayload.unarchiveStaffUrl ? (
                                        <SecondaryButton
                                            type="button"
                                            className="w-full justify-center sm:w-auto"
                                            onClick={() => void handleUnarchiveStaff()}
                                        >
                                            Restaurar na lista ativa
                                        </SecondaryButton>
                                    ) : null}
                                </div>
                            ) : null}
                        </>
                    )}
                </div>
            </Modal>

            <VolunteerRequestAttachModal
                open={attachModalOpen}
                onClose={closeAttachModal}
                row={
                    attachModalRow?.attach_volunteer_url
                        ? {
                              id: attachModalRow.id,
                              subject: attachModalRow.subject,
                              attach_volunteer_url: attachModalRow.attach_volunteer_url,
                              suggest_volunteers_url: attachModalRow.suggest_volunteers_url,
                          }
                        : null
                }
                volunteersForAttach={volunteersForAttach}
                attachVolunteerPickerUrl={attachVolunteerPickerUrl}
                csrf={csrf}
                autoLoadSuggestions={attachModalAutoSuggest}
            />

            <VolunteerQuestionnaireProfileModal
                show={profileVolunteer !== null}
                onClose={() => setProfileVolunteer(null)}
                profile={profileVolunteer}
            />
        </div>
    );
}
