import AdminLayout from '@/Layouts/AdminLayout';
import FlashMessages from '@/Components/FlashMessages';
import Modal from '@/Components/Modal';
import InputLabel from '@/Components/InputLabel';
import InputError from '@/Components/InputError';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import SelectInput from '@/Components/SelectInput';
import TextInput from '@/Components/TextInput';
import VolunteerCenterRosterPanel from '@/Components/Volunteers/VolunteerCenterRosterPanel';
import VolunteerCenterScopePanel from '@/Components/Volunteers/VolunteerCenterScopePanel';
import { titleBarAddLabelClass } from '@/Components/AddButton';
import { getMinistryIcon, getMinistryIconByKey } from '@/lib/ministryIcons';
import RecordDetailHeader from '@/Components/RecordDetail/RecordDetailHeader';
import RecordDetailSections from '@/Components/RecordDetail/RecordDetailSections';
import VolunteerDeleteConfirmBlock from '@/Components/Volunteers/VolunteerDeleteConfirmBlock';
import VolunteerPasswordChangeForm from '@/Components/Volunteers/VolunteerPasswordChangeForm';
import MinistryLeaderStatusSection, {
    type MinistryLeaderStatusSectionData,
} from '@/Components/Volunteers/MinistryLeaderStatusSection';
import VolunteerServeMinistriesPicker from '@/Components/Volunteers/VolunteerServeMinistriesPicker';
import VolunteerUsuarioAppTabPanel from '@/Components/Volunteers/VolunteerUsuarioAppTabPanel';
import VolunteerPipelineDetailTabBar from '@/Components/Volunteers/VolunteerPipelineDetailTabBar';
import VolunteerPipelineNotesPanel from '@/Components/Volunteers/VolunteerPipelineNotesPanel';
import VolunteerEncaminharModal from '@/Components/Volunteers/VolunteerEncaminharModal';
import VolunteerInviteShareModal from '@/Components/Volunteers/VolunteerInviteShareModal';
import VolunteerMinistryInviteSendModal, {
    type VolunteerMinistryInviteSendPayload,
} from '@/Components/Volunteers/VolunteerMinistryInviteSendModal';
import VolunteerAppInviteButton, {
    volunteerEncaminharButtonClass,
    volunteerModalActionPillBaseClass,
    volunteerSalvarFaseButtonClass,
} from '@/Components/Volunteers/VolunteerAppInviteButton';
import { leaderMinistryIdsFromVolunteer } from '@/utils/volunteerMinistryLeadership';
import { confirmAction } from '@/utils/confirmDialog';
import { askEncaminharWhenLinkingDepartments } from '@/utils/volunteerDepartmentSyncSave';
import { inertiaListModalSave } from '@/utils/inertiaListModalSave';
import {
    applyVolunteerModalFormErrors,
    parseVolunteerModalFromUrl,
    submitVolunteerModalPatch,
    submitVolunteerModalPost,
    syncVolunteerModalUrl,
    type VolunteerModalUrlTab,
} from '@/utils/volunteerPipelineModalSave';
import { volunteerDetailSections, volunteerRecordHeaderSubtitle, type VolunteerDetailData } from '@/utils/volunteerDetailRows';
import { centerVolunteersQuery, type CenterGroupBy, type CenterVinculo } from '@/utils/centerVolunteersQuery';
import type { VolunteerRosterBoardFilters, VolunteerRosterListRow } from '@/utils/volunteerRosterList';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { PencilSquareIcon, PlusIcon, ArrowRightCircleIcon, EnvelopeIcon } from '@heroicons/react/24/outline';
import { useCallback, useEffect, useMemo, useRef, useState, type FormEventHandler } from 'react';
import { useResizablePaneWidth } from '@/hooks/useResizablePaneWidth';

const compactInputClass =
    '!h-8 !min-h-8 !rounded-lg !px-2.5 !py-1 !text-sm shadow-none sm:!text-sm';

const DEPT_PANE_STORAGE_KEY = 'ns-volunteer-mgmt-dept-pane-width';
const DEPT_PANE_DEFAULT = 200;
const DEPT_PANE_MIN = 140;
const DEPT_PANE_MAX = 420;

type DepartmentRow = {
    id: number;
    name: string;
    icon: string | null;
    leaders: string[];
    volunteerCount: number;
    forwardedCount: number;
};

type PhaseRow = {
    key: string;
    label: string;
    volunteerCount: number;
};

type SelectedPhase = {
    key: string;
    label: string;
};

type SelectedMinistry = {
    id: number;
    name: string;
    icon: string | null;
    leaders: string[];
};

interface PaginatedVolunteers {
    data: VolunteerRosterListRow[];
    links: { url: string | null; label: string; active: boolean }[];
    total?: number;
    from?: number | null;
    to?: number | null;
}

type Props = {
    groupBy: CenterGroupBy;
    departments: DepartmentRow[];
    phases: PhaseRow[];
    withoutDepartmentCount: number;
    allVolunteersCount: number;
    selectedMinistryId: number | null;
    selectedPhaseKey: string | null;
    selectedMinistry: SelectedMinistry | null;
    selectedPhase: SelectedPhase | null;
    centerVinculo: CenterVinculo;
    volunteers: PaginatedVolunteers;
    boardFilters: VolunteerRosterBoardFilters;
    ministries: { id: number; name: string }[];
    encaminharMinistryIds: number[] | null;
    pedidosUrl: string;
    canPipelineMutate: boolean;
    canVolunteerManage: boolean;
    canViewVolunteerNotes?: boolean;
    canManageVolunteerRequests?: boolean;
    volunteersAdminUrl: string;
};

type DetailTab = VolunteerModalUrlTab;

type PendingMinistryInvite = VolunteerMinistryInviteSendPayload & {
    invitationId: number;
    ministryId: number;
};

type DetailJson = {
    volunteer: VolunteerDetailData;
    pipeline?: { stageId: number | null; stageName: string | null; adminWorkflowStageId: number | null };
    stages: Array<{ id: number; name: string; sort_order: number }>;
    statusHistoryByMinistry?: MinistryLeaderStatusSectionData[];
    notes: Array<{ id: number; body: string; authorName: string; createdAt: string; destroyUrl?: string | null }>;
    ministryOptions?: Array<{ id: number; name: string; attached: boolean; canEdit: boolean }>;
    forwardedMinistryIds?: number[];
    pendingMinistryInvites?: PendingMinistryInvite[];
    updateStageUrl: string;
    storeNoteUrl: string;
    syncMinistriesUrl: string | null;
    destroyVolunteerUrl: string | null;
    archiveVolunteerUrl: string | null;
    unarchiveVolunteerUrl: string | null;
    updatePasswordUrl: string | null;
    passwordFormMode?: 'create' | 'update' | null;
    updateVolunteerUrl?: string | null;
    appRoles?: Array<{ id: number; name: string }>;
};

function normalizeSearch(s: string): string {
    return s
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
}

export default function ManagementCenter({
    groupBy,
    departments,
    phases,
    withoutDepartmentCount,
    allVolunteersCount,
    selectedMinistryId,
    selectedPhaseKey,
    selectedMinistry,
    selectedPhase,
    centerVinculo,
    volunteers,
    boardFilters,
    ministries,
    encaminharMinistryIds,
    pedidosUrl,
    canPipelineMutate,
    canVolunteerManage,
    canViewVolunteerNotes = true,
    canManageVolunteerRequests = false,
    volunteersAdminUrl,
}: Props) {
    const [sidebarSearch, setSidebarSearch] = useState('');
    const [scopeModalOpen, setScopeModalOpen] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [detailLoading, setDetailLoading] = useState(false);
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [detailTab, setDetailTab] = useState<DetailTab>('ficha');
    const [detail, setDetail] = useState<DetailJson | null>(null);
    const [modalSaveMessage, setModalSaveMessage] = useState<string | null>(null);
    const [stageSaving, setStageSaving] = useState(false);
    const [ministriesSaving, setMinistriesSaving] = useState(false);
    const [invitingVolunteerId, setInvitingVolunteerId] = useState<number | null>(null);
    const [inviteShareOpen, setInviteShareOpen] = useState(false);
    const [inviteShare, setInviteShare] = useState<{ link: string; name: string } | null>(null);
    const [encaminharOpen, setEncaminharOpen] = useState(false);
    const [encaminharSelectedIds, setEncaminharSelectedIds] = useState<number[]>([]);
    const [ministryInviteSend, setMinistryInviteSend] = useState<VolunteerMinistryInviteSendPayload | null>(null);
    const [ministryInvitePickOpen, setMinistryInvitePickOpen] = useState(false);
    const isPhaseGroup = groupBy === 'fase';
    const boardFiltersRef = useRef(boardFilters);
    boardFiltersRef.current = boardFilters;
    const centerVinculoRef = useRef(centerVinculo);
    centerVinculoRef.current = centerVinculo;
    const page = usePage();
    const pageUrl = page.url;
    const csrf = (page.props as { csrf_token?: string }).csrf_token ?? '';
    const flash = (page.props as {
        flash?: {
            invitation_link?: string | null;
            invitation_for_name?: string | null;
        };
    }).flash;
    const authProps = page.props as { auth?: { openVolunteerRequestsCount?: number } };
    const openVolunteerRequestsCount =
        typeof authProps.auth?.openVolunteerRequestsCount === 'number' ? authProps.auth.openVolunteerRequestsCount : 0;

    useEffect(() => {
        const link = flash?.invitation_link;
        const name = flash?.invitation_for_name;
        if (typeof link === 'string' && link.length > 0) {
            setInviteShare({ link, name: typeof name === 'string' ? name : '' });
            setInviteShareOpen(true);
        }
    }, [flash?.invitation_link, flash?.invitation_for_name]);

    const stageMoveForm = useForm({ stage_id: '' as string | number });
    const ministriesForm = useForm<{ ministry_ids: number[]; leader_ministry_ids: number[] }>({
        ministry_ids: [],
        leader_ministry_ids: [],
    });

    const { width: departmentPaneWidth, resetWidth: resetDepartmentPaneWidth, onSeparatorMouseDown } =
        useResizablePaneWidth({
            storageKey: DEPT_PANE_STORAGE_KEY,
            defaultWidth: DEPT_PANE_DEFAULT,
            minWidth: DEPT_PANE_MIN,
            maxWidth: DEPT_PANE_MAX,
        });

    const navigate = useCallback(
        (options: {
            group: CenterGroupBy;
            ministerio?: number | 'none' | 'all';
            fase?: string | 'all';
            search?: string;
            vinculo?: CenterVinculo;
        }) => {
            // Ao trocar para "Fase", o padrão esperado é ver todas as pessoas da igreja.
            // Se deixarmos `ministry_ids` preso no querystring, o usuário fica vendo um recorte pequeno (ex.: só um depto)
            // e os totais parecem “errados”.
            const effectiveBoardFilters =
                options.group === 'fase'
                    ? { ...boardFiltersRef.current, ministry_ids: '' }
                    : boardFiltersRef.current;
            const mid: number | null =
                options.group === 'departamento'
                    ? options.ministerio === 'all'
                        ? null
                        : options.ministerio === 'none'
                          ? 0
                          : (options.ministerio ?? selectedMinistryId ?? null)
                    : null;
            const vinculo =
                options.vinculo ??
                (options.group === 'departamento' ? centerVinculoRef.current : 'vinculados');
            const params = centerVolunteersQuery(
                options.group,
                mid,
                options.group === 'fase'
                    ? options.fase === 'all'
                        ? null
                        : (options.fase ?? selectedPhaseKey)
                    : null,
                effectiveBoardFilters,
                options.search ?? boardFiltersRef.current.search ?? '',
                vinculo,
            );
            router.get(route('ministry-lead.volunteers.central'), params, {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            });
        },
        [selectedPhaseKey, selectedMinistryId],
    );

    const onCenterVinculoChange = useCallback(
        (vinculo: CenterVinculo) => {
            navigate({ group: 'departamento', vinculo });
        },
        [navigate],
    );

    const selectDepartment = (id: number | 'none') => {
        navigate({ group: 'departamento', ministerio: id });
        setScopeModalOpen(false);
    };

    const selectPhase = (key: string) => {
        navigate({ group: 'fase', fase: key });
        setScopeModalOpen(false);
    };

    const switchGroupBy = (next: CenterGroupBy) => {
        if (next === groupBy) return;
        setSidebarSearch('');
        if (next === 'fase') {
            navigate({ group: 'fase' });
            return;
        }
        navigate({ group: 'departamento' });
    };

    const filteredDepartments = useMemo(() => {
        const q = normalizeSearch(sidebarSearch);
        if (!q) return departments;
        return departments.filter((d) => {
            if (normalizeSearch(d.name).includes(q)) return true;
            return d.leaders.some((leader) => normalizeSearch(leader).includes(q));
        });
    }, [departments, sidebarSearch]);

    const filteredPhases = useMemo(() => {
        const q = normalizeSearch(sidebarSearch);
        if (!q) return phases;
        const phaseAliases = (key: string): string[] => {
            // Ajuda na busca: o usuário pode pensar em “fase principal” ou “status do convite/depto”.
            // Alguns textos podem coincidir (ex.: “Em treinamento”) e outros são sinônimos (ex.: “Aceito” ~ “Vinculado”).
            if (key === 'attached') return ['vinculado', 'aceito'];
            if (key === 'invite_pending') return ['convite pendente', 'pendente', 'aguardando resposta', 'convite não enviado'];
            if (key === 'sem_departamento') return ['sem departamento', 'sem depto', 'sem departamento'];
            if (key === 'training') return ['em treinamento', 'treinamento'];
            if (key === 'ready') return ['pronto', 'disponível'];
            if (key === 'active') return ['atuante', 'ativo'];
            if (key === 'reviewing') return ['em análise', 'análise'];
            if (key === 'denied') return ['recusado', 'negado'];
            return [];
        };

        return phases.filter((p) => {
            const hay = normalizeSearch([p.label, p.key, ...phaseAliases(p.key)].join(' '));
            return hay.includes(q);
        });
    }, [phases, sidebarSearch]);

    const showWithoutDepartment = useMemo(() => {
        if (isPhaseGroup || withoutDepartmentCount <= 0) return false;
        const q = normalizeSearch(sidebarSearch);
        if (!q) return true;
        return q.includes('sem') || q.includes('depto') || 'sem departamento'.includes(q);
    }, [isPhaseGroup, withoutDepartmentCount, sidebarSearch]);

    const applyDetailJson = useCallback(
        (j: DetailJson) => {
            setDetail(j);
            const explicitSid = j.pipeline?.adminWorkflowStageId;
            const pipelineSid =
                j.pipeline?.stageId != null && j.stages?.some((s) => s.id === j.pipeline?.stageId)
                    ? j.pipeline.stageId
                    : null;
            const sid = explicitSid ?? pipelineSid;
            stageMoveForm.setData('stage_id', sid != null ? String(sid) : '');
            const attachedIds = (j.ministryOptions ?? []).filter((o) => o.attached).map((o) => o.id);
            ministriesForm.setData({
                ministry_ids: attachedIds,
                leader_ministry_ids: leaderMinistryIdsFromVolunteer(j.volunteer as VolunteerDetailData),
            });
        },
        [ministriesForm, stageMoveForm],
    );

    const refreshVolunteerDetail = useCallback(
        async (id: number): Promise<DetailJson | null> => {
            try {
                const url = route('ministry-lead.volunteers.pipeline.detail', id);
                const r = await fetch(url, {
                    headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest', 'X-CSRF-TOKEN': csrf },
                    credentials: 'same-origin',
                    cache: 'no-store',
                });
                if (!r.ok) {
                    return null;
                }
                const j = (await r.json()) as DetailJson;
                applyDetailJson(j);
                return j;
            } catch {
                // Mantém o conteúdo atual do modal em caso de falha na atualização.
                return null;
            }
        },
        [applyDetailJson, csrf],
    );

    const closeVolunteerModal = useCallback(() => {
        setModalOpen(false);
        setDetail(null);
        setSelectedId(null);
        setModalSaveMessage(null);
        syncVolunteerModalUrl(null, null);
    }, []);

    const showModalSaveMessage = useCallback((message: string) => {
        setModalSaveMessage(message);
        window.setTimeout(() => setModalSaveMessage(null), 5000);
    }, []);

    const openVolunteer = async (id: number, tab: DetailTab = 'ficha', options?: { silent?: boolean }) => {
        setSelectedId(id);
        setModalOpen(true);
        setDetailTab(tab);
        syncVolunteerModalUrl(id, tab);
        if (!options?.silent) {
            setDetail(null);
            setDetailLoading(true);
        }
        try {
            const url = route('ministry-lead.volunteers.pipeline.detail', id);
            const r = await fetch(url, {
                headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest', 'X-CSRF-TOKEN': csrf },
                credentials: 'same-origin',
                cache: 'no-store',
            });
            if (!r.ok) {
                setDetail(null);
                return;
            }
            const j = (await r.json()) as DetailJson;
            applyDetailJson(j);
        } catch {
            setDetail(null);
        } finally {
            setDetailLoading(false);
        }
    };

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const parsed = parseVolunteerModalFromUrl(window.location.search);
        if (!parsed) {
            return;
        }
        if (!modalOpen || selectedId !== parsed.id) {
            void openVolunteer(parsed.id, parsed.tab);
            return;
        }
        if (detailTab !== parsed.tab) {
            setDetailTab(parsed.tab);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pageUrl]);

    const submitStageMove: React.FormEventHandler = async (e) => {
        e.preventDefault();
        if (!detail || stageSaving) return;
        stageMoveForm.clearErrors();
        setStageSaving(true);
        try {
            const result = await submitVolunteerModalPatch(
                detail.updateStageUrl,
                { stage_id: stageMoveForm.data.stage_id },
                csrf,
            );
            if (!result.ok) {
                applyVolunteerModalFormErrors(result.errors, (field, message) =>
                    stageMoveForm.setError(field as 'stage_id', message),
                );
                return;
            }
            showModalSaveMessage('Fase principal atualizada.');
            if (selectedId) await refreshVolunteerDetail(selectedId);
        } finally {
            setStageSaving(false);
        }
    };

    const submitMinistries: React.FormEventHandler = async (e) => {
        e.preventDefault();
        if (!detail?.syncMinistriesUrl || ministriesSaving) return;
        const previousAttachedIds = (detail.ministryOptions ?? []).filter((o) => o.attached).map((o) => o.id);
        const encaminhar = await askEncaminharWhenLinkingDepartments(
            previousAttachedIds,
            ministriesForm.data.ministry_ids,
            detail.ministryOptions ?? [],
        );
        if (encaminhar === null) return;
        ministriesForm.clearErrors();
        setMinistriesSaving(true);
        try {
            const payload: Record<string, unknown> = {
                ministry_ids: ministriesForm.data.ministry_ids,
                encaminhar,
            };
            if (canVolunteerManage) {
                payload.leader_ministry_ids = ministriesForm.data.leader_ministry_ids;
            }
            const result = await submitVolunteerModalPatch(detail.syncMinistriesUrl, payload, csrf);
            if (!result.ok) {
                applyVolunteerModalFormErrors(result.errors, (field, message) =>
                    ministriesForm.setError(field as 'ministry_ids' | 'leader_ministry_ids', message),
                );
                return;
            }
            showModalSaveMessage(
                encaminhar
                    ? 'Departamentos atualizados e encaminhamento registrado. Envie o convite por e-mail ou WhatsApp.'
                    : 'Departamentos atualizados.',
            );
            if (selectedId) {
                const j = await refreshVolunteerDetail(selectedId);
                if (encaminhar) {
                    const invites = j?.pendingMinistryInvites ?? [];
                    if (invites.length === 1) {
                        setMinistryInviteSend(invites[0]);
                    } else if (invites.length > 1) {
                        setMinistryInvitePickOpen(true);
                    }
                }
            }
        } finally {
            setMinistriesSaving(false);
        }
    };

    const selectDetailTab = (tab: DetailTab) => {
        if (tab === 'notas' && !canViewVolunteerNotes) {
            tab = 'ficha';
        }
        setDetailTab(tab);
        if (selectedId) {
            syncVolunteerModalUrl(selectedId, tab);
        }
    };

    const volunteerMinistryCheckboxOptions = useMemo(
        () =>
            (detail?.ministryOptions ?? []).map((o) => ({
                id: o.id,
                name: o.name,
                disabled: !o.canEdit,
                trailing: !o.canEdit && ministriesForm.data.ministry_ids.includes(o.id) ? 'Só consulta' : null,
            })),
        [detail?.ministryOptions, ministriesForm.data.ministry_ids],
    );

    const encaminharAvailableMinistries = useMemo(() => {
        if (encaminharMinistryIds == null) {
            return ministries;
        }
        const allowed = new Set(encaminharMinistryIds);
        return ministries.filter((m) => allowed.has(m.id));
    }, [ministries, encaminharMinistryIds]);

    const detailForwardedMinistryIds = useMemo(
        () => new Set(detail?.forwardedMinistryIds ?? []),
        [detail?.forwardedMinistryIds],
    );

    const detailVolunteerName =
        (detail?.volunteer?.name as string | null)?.trim() ||
        (detail?.volunteer as VolunteerDetailData | undefined)?.user?.name?.trim() ||
        'Voluntário';

    const canInviteAppFromDetail =
        canVolunteerManage &&
        detail?.volunteer != null &&
        !(String((detail.volunteer as VolunteerDetailData).email ?? '').trim());

    const openEncaminharFromDetail = () => {
        if (!detail?.volunteer) return;
        setEncaminharSelectedIds([]);
        setEncaminharOpen(true);
    };

    const pendingMinistryInvites = detail?.pendingMinistryInvites ?? [];

    const openMinistryInviteSend = () => {
        if (pendingMinistryInvites.length === 0) return;
        if (pendingMinistryInvites.length === 1) {
            setMinistryInviteSend(pendingMinistryInvites[0]);
            return;
        }
        setMinistryInvitePickOpen(true);
    };

    const ministryInviteSendButtonClass = `${volunteerModalActionPillBaseClass} border-teal-600/80 bg-teal-50 text-teal-900 hover:bg-teal-100 dark:border-teal-500/70 dark:bg-teal-950/40 dark:text-teal-100 dark:hover:bg-teal-900/50`;

    const submitEncaminharFromDetail: FormEventHandler = (e) => {
        e.preventDefault();
        if (!selectedId || encaminharSelectedIds.length === 0) return;
        const ministryIdsJustForwarded = [...encaminharSelectedIds];
        const volunteerId = selectedId;
        router.post(
            route('ministry-lead.volunteers.ministry-invite.store', volunteerId),
            { ministry_ids: ministryIdsJustForwarded, channels: [] },
            {
                ...inertiaListModalSave,
                onSuccess: () => {
                    setEncaminharSelectedIds([]);
                    setEncaminharOpen(false);
                    showModalSaveMessage('Voluntário encaminhado. Envie o convite por e-mail ou WhatsApp.');
                    void (async () => {
                        const j = await refreshVolunteerDetail(volunteerId);
                        const invites = (j?.pendingMinistryInvites ?? []).filter((invite) =>
                            ministryIdsJustForwarded.includes(invite.ministryId),
                        );
                        if (invites.length === 1) {
                            setMinistryInviteSend(invites[0]);
                        } else if (invites.length > 1) {
                            setMinistryInvitePickOpen(true);
                        }
                    })();
                },
            },
        );
    };

    const sendAppInviteFromDetail = () => {
        if (!selectedId) return;
        setInvitingVolunteerId(selectedId);
        router.post(
            route('volunteers.invite', selectedId),
            {},
            {
                preserveScroll: true,
                onFinish: () => setInvitingVolunteerId(null),
            },
        );
    };

    const selectedTitle = isPhaseGroup
        ? (selectedPhase?.label ?? 'Fase')
        : selectedMinistryId === 0
          ? 'Sem departamento'
          : (selectedMinistry?.name ?? 'Departamento');

    const HeaderIcon = isPhaseGroup
        ? UserGroupIconFallback
        : selectedMinistryId && selectedMinistryId > 0 && selectedMinistry
          ? selectedMinistry.icon
              ? getMinistryIconByKey(selectedMinistry.icon)
              : getMinistryIcon(selectedMinistry.name)
          : UserGroupIconFallback;

    const volunteersTotal = typeof volunteers.total === 'number' ? volunteers.total : volunteers.data.length;
    const allDepartmentsTotal = allVolunteersCount;
    const allPhasesTotal = useMemo(
        () => (phases ?? []).reduce((sum, p) => sum + (p.volunteerCount ?? 0), 0),
        [phases],
    );
    const selectedDepartment = useMemo(
        () =>
            selectedMinistryId != null && selectedMinistryId > 0
                ? departments.find((d) => d.id === selectedMinistryId)
                : undefined,
        [departments, selectedMinistryId],
    );

    const vinculadosCount = selectedDepartment?.volunteerCount ?? null;
    const encaminhadosCount = selectedDepartment?.forwardedCount ?? null;

    const selectedGroupTotal = useMemo(() => {
        if (isPhaseGroup) {
            if (selectedPhaseKey == null) return allPhasesTotal;
            return phases.find((p) => p.key === selectedPhaseKey)?.volunteerCount ?? volunteersTotal;
        }
        if (selectedMinistryId == null) return volunteersTotal;
        if (selectedMinistryId === 0) return withoutDepartmentCount ?? 0;
        if (selectedDepartment) {
            if (centerVinculo === 'encaminhados') {
                return selectedDepartment.forwardedCount ?? volunteersTotal;
            }
            return selectedDepartment.volunteerCount ?? volunteersTotal;
        }
        return volunteersTotal;
    }, [
        allPhasesTotal,
        centerVinculo,
        isPhaseGroup,
        phases,
        selectedDepartment,
        selectedMinistryId,
        selectedPhaseKey,
        volunteersTotal,
        withoutDepartmentCount,
    ]);

    const scopeFilterTooltip = useMemo(() => {
        if (isPhaseGroup) {
            if (selectedPhaseKey) {
                const phase = phases.find((p) => p.key === selectedPhaseKey);
                return `Recorte: ${phase?.label ?? selectedPhaseKey}`;
            }

            return 'Recorte: Fase — Todos';
        }
        if (selectedMinistryId === 0) {
            return 'Recorte: Sem departamento';
        }
        if (selectedMinistryId != null && selectedMinistry) {
            return `Recorte: ${selectedMinistry.name}`;
        }
        if (selectedMinistryId != null) {
            const department = departments.find((d) => d.id === selectedMinistryId);
            if (department) {
                return `Recorte: ${department.name}`;
            }
        }

        return 'Recorte: Departamento — Todos';
    }, [departments, isPhaseGroup, phases, selectedMinistry, selectedMinistryId, selectedPhaseKey]);

    const scopeFilterActive =
        isPhaseGroup || selectedMinistryId !== null || selectedPhaseKey !== null;

    const scopePanelProps = {
        groupBy,
        onGroupByChange: switchGroupBy,
        sidebarSearch,
        onSidebarSearchChange: setSidebarSearch,
        departments,
        phases,
        filteredDepartments,
        filteredPhases,
        selectedMinistryId,
        selectedPhaseKey,
        allDepartmentsTotal,
        allPhasesTotal,
        withoutDepartmentCount,
        showWithoutDepartment,
        onSelectAllDepartments: () => {
            navigate({ group: 'departamento', ministerio: 'all' });
            setScopeModalOpen(false);
        },
        onSelectDepartment: selectDepartment,
        onSelectAllPhases: () => {
            navigate({ group: 'fase', fase: 'all' });
            setScopeModalOpen(false);
        },
        onSelectPhase: selectPhase,
        compactInputClass,
    };

    return (
        <AdminLayout wideLayout compactChrome modalOverlayOpen={modalOpen}>
            <Head title="Gestão de voluntários" />
            <FlashMessages />

            <div className="flex min-h-0 flex-1 flex-col">
                <div className="flex shrink-0 items-center justify-between gap-2 pb-2">
                    <div className="min-w-0">
                        <h1 className="truncate text-lg font-semibold text-zinc-900 dark:text-white">
                            Gestão de voluntários
                        </h1>
                    </div>

                    <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
                        {canManageVolunteerRequests ? (
                            <Link href={pedidosUrl} className="cursor-pointer" title="Abrir pedidos de voluntariado">
                                <span className="relative inline-flex">
                                    <SecondaryButton
                                        type="button"
                                        title="Abrir pedidos de voluntariado"
                                        className="!h-8 !px-2.5 !py-1 !text-xs"
                                    >
                                        Pedidos
                                    </SecondaryButton>
                                    {openVolunteerRequestsCount > 0 ? (
                                        <span className="absolute -right-1.5 -top-1.5 inline-flex min-h-[1.25rem] min-w-[1.25rem] items-center justify-center rounded-full bg-amber-500 px-1.5 text-[10px] font-bold text-white">
                                            {openVolunteerRequestsCount > 99 ? '99+' : openVolunteerRequestsCount}
                                        </span>
                                    ) : null}
                                </span>
                            </Link>
                        ) : null}
                        {canVolunteerManage ? (
                            <Link
                                href={`${volunteersAdminUrl}?modal=create`}
                                className={titleBarAddLabelClass}
                                title="Novo voluntário"
                                aria-label="Novo voluntário"
                            >
                                <PlusIcon className="h-5 w-5" strokeWidth={2.25} />
                                Novo
                            </Link>
                        ) : null}
                    </div>
                </div>

                <div className="flex min-h-0 flex-1 flex-col gap-2 md:flex-row md:items-stretch">
                    <aside
                        className="hidden min-h-0 w-full shrink-0 flex-col md:flex md:max-h-none md:max-w-[min(100%,var(--dept-pane-w))] md:w-[var(--dept-pane-w)]"
                        style={{ ['--dept-pane-w' as string]: `${departmentPaneWidth}px` }}
                    >
                        <VolunteerCenterScopePanel {...scopePanelProps} density="compact" />
                    </aside>

                    <div
                        role="separator"
                        aria-orientation="vertical"
                        aria-valuenow={departmentPaneWidth}
                        aria-valuemin={DEPT_PANE_MIN}
                        aria-valuemax={DEPT_PANE_MAX}
                        title="Arraste para ajustar a largura. Duplo clique para restaurar."
                        onMouseDown={onSeparatorMouseDown}
                        onDoubleClick={resetDepartmentPaneWidth}
                        className="group relative hidden w-2 shrink-0 cursor-col-resize md:block"
                    >
                        <span className="absolute inset-y-2 left-1/2 w-px -translate-x-1/2 rounded-full bg-zinc-200 transition group-hover:w-0.5 group-hover:bg-emerald-500 group-active:bg-emerald-600 dark:bg-zinc-700 dark:group-hover:bg-emerald-400" />
                    </div>

                    <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
                        <div className="flex min-h-0 flex-1 flex-col px-2.5 pb-2">
                            <VolunteerCenterRosterPanel
                                groupBy={groupBy}
                                selectedMinistryId={selectedMinistryId}
                                selectedPhaseKey={selectedPhaseKey}
                                centerVinculo={centerVinculo}
                                vinculadosCount={vinculadosCount}
                                encaminhadosCount={encaminhadosCount}
                                onCenterVinculoChange={onCenterVinculoChange}
                                volunteers={volunteers}
                                boardFilters={boardFilters}
                                ministries={ministries}
                                encaminharMinistryIds={encaminharMinistryIds}
                                canVolunteerManage={canVolunteerManage}
                                canPipelineMutate={canPipelineMutate}
                                onOpenVolunteer={(id) => void openVolunteer(id)}
                                scopeFilter={{
                                    tooltip: scopeFilterTooltip,
                                    active: scopeFilterActive,
                                    onOpen: () => setScopeModalOpen(true),
                                }}
                                listHeader={{
                                    title: selectedTitle,
                                    subtitle: `${selectedGroupTotal} voluntário${selectedGroupTotal === 1 ? '' : 's'}`,
                                    icon: <HeaderIcon className="h-4 w-4" />,
                                }}
                            />
                        </div>
                    </section>
                </div>
            </div>

            <Modal show={scopeModalOpen} onClose={() => setScopeModalOpen(false)} maxWidth="md">
                <div className="max-h-[min(90dvh,720px)] overflow-y-auto px-5 pb-6 pt-14 sm:px-6 sm:pt-16">
                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Departamento ou fase</h2>
                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                        Escolha o recorte da lista. Toque em uma opção para aplicar na hora.
                    </p>
                    <div className="mt-4">
                        <VolunteerCenterScopePanel {...scopePanelProps} density="comfortable" />
                    </div>
                </div>
            </Modal>

            <Modal show={modalOpen} onClose={closeVolunteerModal} maxWidth="4xl" disableBodyScroll>
                <div className="flex max-h-[min(100dvh-1rem,880px)] min-h-0 w-full flex-col overflow-hidden sm:max-h-[min(90dvh,860px)]">
                    {detailLoading ? (
                        <div className="p-6">
                            <p className="text-sm text-zinc-500">Carregando…</p>
                        </div>
                    ) : detail?.volunteer ? (
                        <>
                            <div className="shrink-0 space-y-4 border-b border-zinc-200 p-4 dark:border-zinc-700">
                                <RecordDetailHeader
                                    title={
                                        (detail.volunteer.name as string | null)?.trim() ||
                                        (detail.volunteer as VolunteerDetailData).user?.name?.trim() ||
                                        'Voluntário'
                                    }
                                    subtitle={volunteerRecordHeaderSubtitle(detail.volunteer as VolunteerDetailData)}
                                    photoUrl={
                                        (detail.volunteer as VolunteerDetailData).photo_url ??
                                        (detail.volunteer.user as { photo_url?: string | null } | null)?.photo_url ??
                                        null
                                    }
                                />

                                <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-3 dark:border-zinc-700 dark:bg-zinc-900/40">
                                    {canPipelineMutate ? (
                                        <form
                                            onSubmit={submitStageMove}
                                            className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end"
                                        >
                                            <div className="min-w-0 flex-1 sm:max-w-xs">
                                                <InputLabel value={canVolunteerManage ? 'Fase principal' : 'Fase / pasta'} />
                                                <SelectInput
                                                    className="mt-1 w-full min-w-0"
                                                    value={stageMoveForm.data.stage_id}
                                                    onChange={(e) => stageMoveForm.setData('stage_id', e.target.value)}
                                                >
                                                    {canVolunteerManage ? <option value="">—</option> : null}
                                                    {(detail.stages ?? []).map((s) => (
                                                        <option key={s.id} value={String(s.id)}>
                                                            {s.name}
                                                        </option>
                                                    ))}
                                                </SelectInput>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <button
                                                    type="submit"
                                                    title={
                                                        canVolunteerManage
                                                            ? 'Salvar fase principal do voluntário'
                                                            : 'Salvar fase do voluntário'
                                                    }
                                                    disabled={stageSaving}
                                                    className={volunteerSalvarFaseButtonClass}
                                                >
                                                    {stageSaving
                                                        ? 'Salvando…'
                                                        : canVolunteerManage
                                                          ? 'Salvar fase principal'
                                                          : 'Salvar fase'}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={openEncaminharFromDetail}
                                                    className={volunteerEncaminharButtonClass}
                                                    title="Escolher departamentos para encaminhar este voluntário"
                                                >
                                                    <ArrowRightCircleIcon className="h-4 w-4 shrink-0" aria-hidden />
                                                    Encaminhar
                                                </button>
                                                {pendingMinistryInvites.length > 0 ? (
                                                    <button
                                                        type="button"
                                                        onClick={openMinistryInviteSend}
                                                        className={ministryInviteSendButtonClass}
                                                        title="Enviar convite oficial por e-mail ou WhatsApp (texto Nova Semente)"
                                                    >
                                                        <EnvelopeIcon className="h-4 w-4 shrink-0" aria-hidden />
                                                        Enviar convite
                                                    </button>
                                                ) : null}
                                                {canInviteAppFromDetail ? (
                                                    <VolunteerAppInviteButton
                                                        disabled={invitingVolunteerId === selectedId}
                                                        onClick={sendAppInviteFromDetail}
                                                    />
                                                ) : null}
                                            </div>
                                            <InputError message={stageMoveForm.errors.stage_id} />
                                        </form>
                                    ) : (
                                        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                                            <div className="text-sm text-zinc-600 dark:text-zinc-300">
                                                <div className="text-xs font-medium text-zinc-500">
                                                    {canVolunteerManage ? 'Fase principal' : 'Fase / pasta'}
                                                </div>
                                                <div className="mt-1 font-medium text-zinc-900 dark:text-white">
                                                    {stageMoveForm.data.stage_id
                                                        ? (detail.stages.find(
                                                              (s) => String(s.id) === String(stageMoveForm.data.stage_id),
                                                          )?.name ?? '—')
                                                        : '—'}
                                                </div>
                                            </div>
                                            {pendingMinistryInvites.length > 0 ? (
                                                <button
                                                    type="button"
                                                    onClick={openMinistryInviteSend}
                                                    className={ministryInviteSendButtonClass}
                                                    title="Enviar convite oficial por e-mail ou WhatsApp (texto Nova Semente)"
                                                >
                                                    <EnvelopeIcon className="h-4 w-4 shrink-0" aria-hidden />
                                                    Enviar convite
                                                </button>
                                            ) : null}
                                        </div>
                                    )}
                                </div>

                                {modalSaveMessage ? (
                                    <p
                                        className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-100"
                                        role="status"
                                    >
                                        {modalSaveMessage}
                                    </p>
                                ) : null}

                                <VolunteerPipelineDetailTabBar
                                    detailTab={detailTab}
                                    onSelectTab={selectDetailTab}
                                    canVolunteerManage={canVolunteerManage}
                                    showUsuarioAppTab={Boolean(detail.updateVolunteerUrl)}
                                    canViewVolunteerNotes={canViewVolunteerNotes}
                                    notesCount={detail.notes?.length ?? 0}
                                />
                            </div>

                            <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain p-4">
                                {detailTab === 'ficha' ? (
                                    <div className="space-y-4">
                                        <RecordDetailSections
                                            sections={volunteerDetailSections(detail.volunteer as VolunteerDetailData)}
                                        />

                                        {detail.updateVolunteerUrl ? null : detail.updatePasswordUrl ? (
                                            <VolunteerPasswordChangeForm
                                                key={(detail.volunteer as VolunteerDetailData).id}
                                                submitUrl={detail.updatePasswordUrl}
                                                mode={detail.passwordFormMode === 'create' ? 'create' : 'update'}
                                                onSuccess={() => {
                                                    if (selectedId) void refreshVolunteerDetail(selectedId);
                                                }}
                                            />
                                        ) : null}

                                        {detail.archiveVolunteerUrl || detail.unarchiveVolunteerUrl ? (
                                            <div className="flex flex-wrap gap-2">
                                                {detail.archiveVolunteerUrl ? (
                                                    <SecondaryButton
                                                        type="button"
                                                        title="Arquivar este voluntário da lista ativa"
                                                        onClick={async () => {
                                                            const ok = await confirmAction({
                                                                title: 'Arquivar voluntário?',
                                                                text: 'O cadastro deixa de aparecer na lista ativa desta igreja. Você pode restaurá-lo em «Arquivados».',
                                                                confirmButtonText: 'Arquivar',
                                                                icon: 'question',
                                                            });
                                                            if (ok) {
                                                                const result = await submitVolunteerModalPost(
                                                                    detail.archiveVolunteerUrl!,
                                                                    {},
                                                                    csrf,
                                                                );
                                                                if (result.ok) {
                                                                    showModalSaveMessage('Voluntário arquivado.');
                                                                    if (selectedId) await refreshVolunteerDetail(selectedId);
                                                                }
                                                            }
                                                        }}
                                                    >
                                                        Arquivar voluntário
                                                    </SecondaryButton>
                                                ) : null}
                                                {detail.unarchiveVolunteerUrl ? (
                                                    <SecondaryButton
                                                        type="button"
                                                        title="Restaurar este voluntário para a lista ativa"
                                                        onClick={async () => {
                                                            const ok = await confirmAction({
                                                                title: 'Restaurar voluntário?',
                                                                text: 'O cadastro voltará à lista ativa de voluntários.',
                                                                confirmButtonText: 'Restaurar',
                                                                icon: 'question',
                                                            });
                                                            if (ok) {
                                                                const result = await submitVolunteerModalPost(
                                                                    detail.unarchiveVolunteerUrl!,
                                                                    {},
                                                                    csrf,
                                                                );
                                                                if (result.ok) {
                                                                    showModalSaveMessage('Voluntário restaurado na lista ativa.');
                                                                    if (selectedId) await refreshVolunteerDetail(selectedId);
                                                                }
                                                            }
                                                        }}
                                                    >
                                                        Restaurar na lista ativa
                                                    </SecondaryButton>
                                                ) : null}
                                            </div>
                                        ) : null}

                                        {detail.destroyVolunteerUrl ? (
                                            <VolunteerDeleteConfirmBlock
                                                className="mt-6"
                                                destroyUrl={detail.destroyVolunteerUrl}
                                                volunteerName={detail.volunteer.name ?? 'Voluntário'}
                                                volunteerEmail={(detail.volunteer as VolunteerDetailData).email}
                                                linkedUser={detail.volunteer.user as { id?: number; email?: string | null } | null}
                                                onSuccess={() => {
                                                    setModalOpen(false);
                                                    setDetail(null);
                                                    setSelectedId(null);
                                                    router.visit(route('ministry-lead.volunteers.central'), { preserveScroll: true });
                                                }}
                                            />
                                        ) : null}
                                    </div>
                                ) : detailTab === 'usuario' && detail.updateVolunteerUrl ? (
                                    <VolunteerUsuarioAppTabPanel
                                        volunteer={detail.volunteer as VolunteerDetailData}
                                        appRoles={detail.appRoles ?? []}
                                        submitUrl={detail.updateVolunteerUrl}
                                        volunteersAdminUrl={volunteersAdminUrl}
                                        onSuccess={() => {
                                            showModalSaveMessage('Usuário APP salvo.');
                                            if (selectedId) void refreshVolunteerDetail(selectedId);
                                        }}
                                        idPrefix="mgmt-vol-app"
                                    />
                                ) : detailTab === 'historico' ? (
                                    <div className="space-y-4">
                                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                            Altere o status do líder em cada departamento e consulte o histórico. A fase principal do
                                            voluntário (Interessado, Encaminhado, Finalizado) fica no topo desta ficha.
                                        </p>
                                        {(detail.statusHistoryByMinistry ?? []).length === 0 ? (
                                            <p className="text-sm text-zinc-500">
                                                Nenhum departamento vinculado ou encaminhamento registrado ainda.
                                            </p>
                                        ) : (
                                            (detail.statusHistoryByMinistry ?? []).map((section) => (
                                                <MinistryLeaderStatusSection
                                                    key={section.ministryId}
                                                    section={section}
                                                    onSaved={() => {
                                                        showModalSaveMessage('Status atualizado.');
                                                        if (selectedId) void refreshVolunteerDetail(selectedId);
                                                    }}
                                                />
                                            ))
                                        )}
                                    </div>
                                ) : detailTab === 'departamentos' ? (
                                    <form onSubmit={submitMinistries} className="space-y-4">
                                        <VolunteerServeMinistriesPicker
                                            volunteer={detail.volunteer as VolunteerDetailData}
                                            canVolunteerManage={canVolunteerManage}
                                            options={volunteerMinistryCheckboxOptions}
                                            ministryIds={ministriesForm.data.ministry_ids}
                                            leaderMinistryIds={ministriesForm.data.leader_ministry_ids}
                                            onMinistryIdsChange={(ids) =>
                                                ministriesForm.setData('ministry_ids', ids)
                                            }
                                            onLeaderMinistryIdsChange={(ids) =>
                                                ministriesForm.setData('leader_ministry_ids', ids)
                                            }
                                            error={ministriesForm.errors.ministry_ids}
                                        />
                                        {detail.syncMinistriesUrl && canPipelineMutate ? (
                                            <PrimaryButton
                                                type="submit"
                                                title="Salvar os departamentos vinculados a este voluntário"
                                                disabled={ministriesSaving}
                                            >
                                                {ministriesSaving ? 'Salvando…' : 'Salvar departamentos'}
                                            </PrimaryButton>
                                        ) : (
                                            <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                                Apenas consulta: não tem permissão para alterar departamentos.
                                            </p>
                                        )}
                                    </form>
                                ) : (
                                    <VolunteerPipelineNotesPanel
                                        notes={detail.notes}
                                        canAddNote={canPipelineMutate}
                                        storeNoteUrl={detail.storeNoteUrl}
                                        csrf={csrf}
                                        onNotesChange={(notes) =>
                                            setDetail((prev) => (prev ? { ...prev, notes } : prev))
                                        }
                                        onSuccessMessage={showModalSaveMessage}
                                        onRefresh={
                                            selectedId
                                                ? async () => {
                                                      await refreshVolunteerDetail(selectedId);
                                                  }
                                                : undefined
                                        }
                                    />
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

            <VolunteerEncaminharModal
                show={encaminharOpen}
                volunteerName={detailVolunteerName}
                ministries={encaminharAvailableMinistries}
                blockedMinistryIds={detailForwardedMinistryIds}
                selectedIds={encaminharSelectedIds}
                onChangeSelectedIds={setEncaminharSelectedIds}
                onClose={() => {
                    setEncaminharOpen(false);
                    setEncaminharSelectedIds([]);
                }}
                onSubmit={submitEncaminharFromDetail}
            />

            <VolunteerInviteShareModal
                show={inviteShareOpen && !!inviteShare}
                link={inviteShare?.link ?? ''}
                inviteeName={inviteShare?.name}
                onClose={() => {
                    setInviteShareOpen(false);
                    setInviteShare(null);
                }}
            />

            <VolunteerMinistryInviteSendModal
                show={!!ministryInviteSend}
                payload={ministryInviteSend}
                onClose={() => setMinistryInviteSend(null)}
            />

            <Modal show={ministryInvitePickOpen} onClose={() => setMinistryInvitePickOpen(false)} maxWidth="md">
                <div className="space-y-4 p-6">
                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Enviar convite</h2>
                    <p className="text-sm text-zinc-600 dark:text-zinc-300">
                        Este voluntário tem convite pendente em mais de um departamento. Escolha qual mensagem enviar.
                    </p>
                    <ul className="space-y-2">
                        {pendingMinistryInvites.map((invite) => (
                            <li key={invite.invitationId}>
                                <button
                                    type="button"
                                    className="flex w-full cursor-pointer items-center justify-between rounded-xl border border-zinc-200 bg-white px-4 py-3 text-left text-sm font-medium text-zinc-800 transition hover:border-teal-300 hover:bg-teal-50/60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:border-teal-700 dark:hover:bg-teal-950/30"
                                    onClick={() => {
                                        setMinistryInvitePickOpen(false);
                                        setMinistryInviteSend(invite);
                                    }}
                                >
                                    <span>{invite.ministryName ?? 'Departamento'}</span>
                                    <EnvelopeIcon className="h-4 w-4 shrink-0 text-teal-700 dark:text-teal-300" aria-hidden />
                                </button>
                            </li>
                        ))}
                    </ul>
                    <div className="flex justify-end">
                        <SecondaryButton type="button" onClick={() => setMinistryInvitePickOpen(false)}>
                            Cancelar
                        </SecondaryButton>
                    </div>
                </div>
            </Modal>
        </AdminLayout>
    );
}

function UserGroupIconFallback({ className }: { className?: string }) {
    const Icon = getMinistryIcon('Grupo');
    return <Icon className={className} />;
}
