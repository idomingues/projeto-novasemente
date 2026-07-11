import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import PageHeader from '@/Components/PageHeader';
import AddButton from '@/Components/AddButton';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import Modal from '@/Components/Modal';
import InputError from '@/Components/InputError';
import { FormEventHandler, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { confirmAction } from '@/utils/confirmDialog';
import { useListModalSubmit } from '@/hooks/useListModalSubmit';
import { submitListModalPost } from '@/utils/listModalFetchSave';
import { textIncludesSearch } from '@/utils/searchText';
import { appRoleLabel } from '@/lib/appRoleLabels';
import { TrashIcon, ChevronDownIcon } from '@heroicons/react/24/outline';

interface RoleRow {
    id: number;
    name: string;
    permissions: string[];
    users_count: number;
    system_role: boolean;
}

interface PermissionRow {
    id: number;
    name: string;
}

interface Props {
    roles: RoleRow[];
    permissions: PermissionRow[];
}

const GROUP_LABELS: Record<string, string> = {
    members: 'Usuários (cadastro)',
    volunteers: 'Voluntários',
    departments: 'Departamentos',
    inventory: 'Inventário',
    users: 'Usuários',
    churches: 'Igrejas',
    news: 'News',
    events: 'Eventos',
    escalas: 'Escalas',
    roles: 'Perfis',
    music: 'Séries e músicas',
    photos: 'Fotos',
    library: 'Biblioteca',
    culto: 'Culto',
    notifications: 'Notificações',
    pastors: 'Pastores',
    pastoral_appointments: 'Agenda pastoral',
    solicitations: 'Solicitações',
    mission: 'Missão',
    programacao: 'Programação',
};

function groupTitle(group: string): string {
    return GROUP_LABELS[group] ?? group;
}

function permissionLineLabel(perm: string): string {
    const custom: Record<string, string> = {
        'music.manage': 'Gerenciar (séries, músicas e playlists)',
        'photos.manage': 'Gerenciar (álbuns de fotos)',
        'library.manage': 'Gerenciar biblioteca (PDFs e capas no app)',
        'rooms.view': 'Ver salas (lista e cadastro no menu Salas)',
        'rooms.manage': 'Gerir salas (criar, editar e remover salas)',
        'rooms.schedule':
            'Agendar salas (calendário de reservas, criar e editar os próprios agendamentos; quem gere salas pode editar todos)',
        'programacao.view': 'Ver programação semanal (cultos, classes e pôr do sol)',
        'programacao.manage': 'Gerir programação semanal (criar, editar e excluir itens)',
        'solicitations.view': 'Ver solicitações formais (batismo, visita, etc.)',
        'solicitations.manage': 'Gerir solicitações formais',
        'roles.manage': 'Gerir perfis e permissões (esta página)',
    };
    if (custom[perm]) {
        return custom[perm];
    }
    if (perm.endsWith('.view')) {
        return 'Visualizar';
    }
    if (perm.endsWith('.manage')) {
        return 'Gerenciar';
    }
    return perm;
}

function PermissionGroupAccordion({
    groupKey,
    title,
    perms,
    rolePermissions,
    forceOpen,
    onTogglePermission,
    saving,
}: {
    groupKey: string;
    title: string;
    perms: string[];
    rolePermissions: string[];
    forceOpen: boolean;
    onTogglePermission: (perm: string) => void;
    saving?: boolean;
}) {
    const activeCount = perms.filter((p) => rolePermissions.includes(p)).length;
    const [open, setOpen] = useState(() => activeCount > 0);
    const isOpen = forceOpen || open;

    return (
        <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
            <button
                type="button"
                id={`perm-group-${groupKey}`}
                onClick={() => {
                    if (!forceOpen) {
                        setOpen((value) => !value);
                    }
                }}
                className="flex w-full cursor-pointer items-center justify-between gap-2 bg-zinc-50 px-3 py-2.5 text-left text-sm font-semibold text-zinc-800 hover:bg-zinc-100 dark:bg-zinc-800/60 dark:text-zinc-200 dark:hover:bg-zinc-800"
                aria-expanded={isOpen}
                aria-controls={`perm-group-panel-${groupKey}`}
            >
                <span>{title}</span>
                <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">
                    {activeCount}/{perms.length}
                </span>
            </button>
            {isOpen ? (
                <div
                    id={`perm-group-panel-${groupKey}`}
                    className="space-y-2 border-t border-zinc-100 bg-white px-3 py-3 dark:border-zinc-800 dark:bg-zinc-900/40"
                >
                    {perms.map((perm) => {
                        const checked = rolePermissions.includes(perm);
                        return (
                            <label
                                key={perm}
                                className="flex cursor-pointer items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300"
                            >
                                <input
                                    type="checkbox"
                                    checked={checked}
                                    disabled={saving}
                                    onChange={() => onTogglePermission(perm)}
                                    className="mt-0.5 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-600"
                                />
                                <span>{permissionLineLabel(perm)}</span>
                            </label>
                        );
                    })}
                </div>
            ) : null}
        </div>
    );
}

export default function RolesIndex({ roles, permissions }: Props) {
    const csrf = (usePage().props as { csrf_token?: string }).csrf_token ?? '';
    const [createOpen, setCreateOpen] = useState(false);
    const [createSaveMessage, setCreateSaveMessage] = useState<string | null>(null);
    const [roleSearch, setRoleSearch] = useState('');
    const [permSearch, setPermSearch] = useState('');
    const [expandedRoles, setExpandedRoles] = useState<Record<string, boolean>>({});
    const [savingRoles, setSavingRoles] = useState<Record<string, boolean>>({});
    const [savedRoles, setSavedRoles] = useState<Record<string, boolean>>({});
    const saveSeqRef = useRef<Record<string, number>>({});

    const { data, setData } = useForm({
        roles: roles.map((r) => ({
            name: r.name,
            permissions: r.permissions,
        })),
    });

    const createForm = useForm({
        name: '',
    });

    const { saving: creating, save: saveCreate } = useListModalSubmit({
        reloadOnly: ['roles'],
        setError: createForm.setError,
        clearErrors: createForm.clearErrors,
    });

    useEffect(() => {
        setData(
            'roles',
            roles.map((r) => ({
                name: r.name,
                permissions: r.permissions,
            })),
        );
    }, [roles, setData]);

    const roleMetaByName = useMemo(() => {
        const m = new Map<string, RoleRow>();
        for (const r of roles) {
            m.set(r.name, r);
        }
        return m;
    }, [roles]);

    const groupedPermissions = useMemo(() => {
        const groups: Record<string, string[]> = {};
        permissions.forEach((p) => {
            const [prefix] = p.name.split('.');
            const group = prefix || 'outros';
            if (!groups[group]) {
                groups[group] = [];
            }
            groups[group].push(p.name);
        });
        Object.keys(groups).forEach((g) => {
            if (g === 'rooms') {
                const order = ['rooms.view', 'rooms.manage', 'rooms.schedule'];
                groups[g] = order.filter((name) => groups[g].includes(name));
            } else {
                groups[g].sort();
            }
        });
        return groups;
    }, [permissions]);

    const displayPermissionGroups = useMemo(() => {
        const rows: Array<{ key: string; title: string; perms: string[] }> = [];
        for (const [group, perms] of Object.entries(groupedPermissions)) {
            if (group === 'rooms') {
                const registration = perms.filter((p) => p === 'rooms.view' || p === 'rooms.manage');
                const schedule = perms.filter((p) => p === 'rooms.schedule');
                if (registration.length > 0) {
                    rows.push({ key: 'rooms-registration', title: 'Salas', perms: registration });
                }
                if (schedule.length > 0) {
                    rows.push({
                        key: 'rooms-schedule',
                        title: 'Agendamento de salas',
                        perms: schedule,
                    });
                }
            } else {
                rows.push({ key: group, title: groupTitle(group), perms });
            }
        }
        rows.sort((a, b) => a.title.localeCompare(b.title, 'pt'));
        return rows;
    }, [groupedPermissions]);

    const q = permSearch.trim();
    const roleQuery = roleSearch.trim();

    const displayedRoles = useMemo(() => {
        return data.roles
            .map((role, index) => ({ role, index }))
            .filter(({ role }) => {
                if (!roleQuery) {
                    return true;
                }
                const label = appRoleLabel(role.name);
                return textIncludesSearch(role.name, roleQuery) || textIncludesSearch(label, roleQuery);
            });
    }, [data.roles, roleQuery]);

    const highlightRoleId = useMemo(() => {
        if (typeof window === 'undefined') {
            return null;
        }
        const params = new URLSearchParams(window.location.search);
        const id = Number(params.get('id'));
        return Number.isFinite(id) && id > 0 ? id : null;
    }, [roles]);

    useEffect(() => {
        if (!highlightRoleId) {
            return;
        }
        const highlighted = roles.find((r) => r.id === highlightRoleId);
        if (highlighted) {
            setExpandedRoles((prev) => ({ ...prev, [highlighted.name]: true }));
        }
        const timer = window.setTimeout(() => {
            document.getElementById(`role-card-${highlightRoleId}`)?.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest',
            });
        }, 120);
        return () => window.clearTimeout(timer);
    }, [highlightRoleId, roles]);

    const filteredPermissionGroups = useMemo(() => {
        if (!q) {
            return displayPermissionGroups;
        }
        return displayPermissionGroups
            .map(({ key, title, perms }) => ({
                key,
                title,
                perms: perms.filter((perm) => {
                    const label = permissionLineLabel(perm);
                    return (
                        textIncludesSearch(perm, q) ||
                        textIncludesSearch(label, q) ||
                        textIncludesSearch(title, q)
                    );
                }),
            }))
            .filter((g) => g.perms.length > 0);
    }, [displayPermissionGroups, q]);

    const saveRolePermissions = useCallback(
        async (roleName: string, permissionsForRole: string[], previousPermissions: string[]) => {
            const seq = (saveSeqRef.current[roleName] ?? 0) + 1;
            saveSeqRef.current[roleName] = seq;
            setSavingRoles((prev) => ({ ...prev, [roleName]: true }));
            setSavedRoles((prev) => ({ ...prev, [roleName]: false }));

            try {
                const result = await submitListModalPost(
                    route('roles.update'),
                    {
                        roles: [{ name: roleName, permissions: permissionsForRole }],
                    },
                    csrf,
                );

                if (saveSeqRef.current[roleName] !== seq) {
                    return;
                }

                if (!result.ok) {
                    setData(
                        'roles',
                        data.roles.map((r) =>
                            r.name === roleName ? { ...r, permissions: previousPermissions } : r,
                        ),
                    );
                    window.alert(result.message ?? 'Não foi possível salvar as permissões. Tente novamente.');
                    return;
                }

                setSavedRoles((prev) => ({ ...prev, [roleName]: true }));
                window.setTimeout(() => {
                    setSavedRoles((prev) => ({ ...prev, [roleName]: false }));
                }, 2000);
            } finally {
                if (saveSeqRef.current[roleName] === seq) {
                    setSavingRoles((prev) => ({ ...prev, [roleName]: false }));
                }
            }
        },
        [csrf, data.roles, setData],
    );

    const togglePermission = (roleIndex: number, perm: string) => {
        const roleName = data.roles[roleIndex].name;
        const current = data.roles[roleIndex].permissions;
        const has = current.includes(perm);
        const nextPermissions = has ? current.filter((p) => p !== perm) : [...current, perm];

        setData({
            ...data,
            roles: data.roles.map((r, i) =>
                i === roleIndex
                    ? {
                          ...r,
                          permissions: nextPermissions,
                      }
                    : r,
            ),
        });

        void saveRolePermissions(roleName, nextPermissions, current);
    };

    const submitCreate: FormEventHandler = (e) => {
        e.preventDefault();
        void (async () => {
            const outcome = await saveCreate(
                false,
                null,
                { name: createForm.data.name },
                route('roles.store'),
                () => '',
            );
            if (!outcome.ok) {
                return;
            }
            createForm.reset();
            createForm.clearErrors();
            setCreateSaveMessage('Perfil criado. Marque as permissões na grade — cada alteração é salva na hora.');
            window.setTimeout(() => setCreateSaveMessage(null), 8000);
        })();
    };

    const toggleRoleExpanded = (roleName: string) => {
        if (q) {
            return;
        }
        setExpandedRoles((prev) => ({
            ...prev,
            [roleName]: !(prev[roleName] ?? false),
        }));
    };

    const handleDeleteRole = async (role: RoleRow) => {
        const ok = await confirmAction({
            title: 'Remover perfil?',
            text: `O perfil «${appRoleLabel(role.name)}» será apagado. Usuários não podem estar com este perfil atribuído.`,
            confirmButtonText: 'Remover',
            danger: true,
            icon: 'warning',
        });
        if (ok) {
            router.delete(route('roles.destroy', role.id));
        }
    };

    return (
        <AdminLayout>
            <Head title="Perfis de acesso" />
            <PageHeader
                title="Perfis de acesso"
                subtitle={
                    <>
                        Usuários podem ficar <strong className="font-medium text-zinc-700 dark:text-zinc-300">sem perfil</strong>{' '}
                        no app até um administrador definir o acesso em{' '}
                        <Link href={route('volunteers.index')} className="font-medium text-primary-600 underline dark:text-primary-400">
                            Voluntários
                        </Link>
                        . Aqui cria <strong className="font-medium text-zinc-700 dark:text-zinc-300">novos perfis</strong> e marca as{' '}
                        <strong className="font-medium text-zinc-700 dark:text-zinc-300">funcionalidades</strong> de cada um. O perfil{' '}
                        <strong className="font-medium text-zinc-700 dark:text-zinc-300">super administrador</strong> não é listado: tem acesso total ao sistema.
                    </>
                }
                actions={
                    <AddButton
                        variant="icon"
                        onClick={() => {
                            setCreateSaveMessage(null);
                            setCreateOpen(true);
                        }}
                        title="Novo perfil"
                    >
                        Novo perfil
                    </AddButton>
                }
            />

            <div className="mb-6 grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/40 p-4">
                    <InputLabel htmlFor="role_search_roles" value="Procurar perfil" className="!mb-1" />
                    <TextInput
                        id="role_search_roles"
                        value={roleSearch}
                        onChange={(e) => setRoleSearch(e.target.value)}
                        placeholder="Ex.: Missão, Financeiro…"
                        className="block w-full"
                    />
                </div>
                <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/40 p-4">
                    <InputLabel htmlFor="perm_search_roles" value="Procurar permissão ou área" className="!mb-1" />
                    <TextInput
                        id="perm_search_roles"
                        value={permSearch}
                        onChange={(e) => setPermSearch(e.target.value)}
                        placeholder="Ex.: notícias, escalas, salas…"
                        className="block w-full"
                    />
                </div>
            </div>

            <Modal show={createOpen} onClose={() => !creating && setCreateOpen(false)} maxWidth="md">
                <form onSubmit={submitCreate} className="p-6 space-y-4">
                    <div>
                        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Novo perfil</h2>
                        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                            Escolha um nome para o perfil (ex.: Missão, Financeiro). O card aparece nesta página — não no
                            painel Missão → gestão. Depois marque as permissões; cada check salva automaticamente.
                        </p>
                        {createSaveMessage ? (
                            <p className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-100">
                                {createSaveMessage}
                            </p>
                        ) : null}
                    </div>
                    <div>
                        <InputLabel htmlFor="new_role_name" value="Nome do perfil" />
                        <TextInput
                            id="new_role_name"
                            value={createForm.data.name}
                            onChange={(e) => createForm.setData('name', e.target.value)}
                            className="mt-1 block w-full"
                            placeholder="ex.: Financeiro"
                            autoComplete="off"
                        />
                        <InputError message={createForm.errors.name} className="mt-1" />
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <SecondaryButton type="button" disabled={creating} onClick={() => setCreateOpen(false)}>
                            Cancelar
                        </SecondaryButton>
                        <PrimaryButton type="submit" disabled={creating}>
                            Criar perfil
                        </PrimaryButton>
                    </div>
                </form>
            </Modal>

            <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                    {displayedRoles.length === 0 ? (
                        <p className="col-span-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-8 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-400">
                            Nenhum perfil corresponde à pesquisa.
                        </p>
                    ) : (
                        displayedRoles.map(({ role, index }) => {
                        const meta = roleMetaByName.get(role.name);
                        const usersCount = meta?.users_count ?? 0;
                        const systemRole = meta?.system_role ?? false;
                        const canDelete = meta && !systemRole && usersCount === 0;
                        const highlighted = meta?.id === highlightRoleId;
                        const roleExpanded = !!q || (expandedRoles[role.name] ?? false);
                        const activePermCount = role.permissions.length;
                        const roleSaving = savingRoles[role.name] ?? false;
                        const roleSaved = savedRoles[role.name] ?? false;

                        return (
                            <div
                                key={role.name}
                                id={meta ? `role-card-${meta.id}` : undefined}
                                className={`rounded-3xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900 ${
                                    highlighted ? 'ring-2 ring-emerald-500 dark:ring-emerald-400' : ''
                                }`}
                            >
                                <div className="flex items-start justify-between gap-3 p-6 sm:p-8">
                                    <button
                                        type="button"
                                        onClick={() => toggleRoleExpanded(role.name)}
                                        className="flex min-w-0 flex-1 cursor-pointer items-start justify-between gap-3 text-left"
                                        aria-expanded={roleExpanded}
                                    >
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h2 className="font-semibold text-zinc-900 dark:text-white">{appRoleLabel(role.name)}</h2>
                                                {systemRole ? (
                                                    <span className="rounded-full bg-zinc-900 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white dark:bg-white dark:text-black">
                                                        Sistema
                                                    </span>
                                                ) : null}
                                            </div>
                                            <p className="mt-0.5 font-mono text-xs text-zinc-500 dark:text-zinc-400">{role.name}</p>
                                            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                                                {usersCount === 0
                                                    ? 'Nenhum usuário com este perfil.'
                                                    : `${usersCount} usuário(es) com este perfil.`}
                                                {roleSaving ? (
                                                    <span className="text-teal-600 dark:text-teal-400"> · Salvando…</span>
                                                ) : roleSaved ? (
                                                    <span className="text-emerald-600 dark:text-emerald-400"> · Salvo</span>
                                                ) : null}
                                                {!roleExpanded ? (
                                                    <span className="text-zinc-400">
                                                        {' '}
                                                        ·{' '}
                                                        {activePermCount === 1
                                                            ? '1 permissão ativa'
                                                            : `${activePermCount} permissões ativas`}
                                                    </span>
                                                ) : null}
                                            </p>
                                        </div>
                                        <ChevronDownIcon
                                            className={`mt-0.5 h-5 w-5 shrink-0 text-zinc-400 transition-transform ${roleExpanded ? 'rotate-180' : ''}`}
                                            aria-hidden
                                        />
                                    </button>
                                    {canDelete && meta ? (
                                        <button
                                            type="button"
                                            onClick={() => void handleDeleteRole(meta)}
                                            className="inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-xs font-semibold text-red-800 hover:bg-red-100 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200 dark:hover:bg-red-950/70"
                                        >
                                            <TrashIcon className="h-3.5 w-3.5" aria-hidden />
                                            Excluir
                                        </button>
                                    ) : null}
                                </div>

                                {roleExpanded ? (
                                <div className="space-y-2 border-t border-zinc-100 px-6 pb-6 pt-4 dark:border-zinc-800 sm:px-8 sm:pb-8">
                                    {filteredPermissionGroups.length === 0 ? (
                                        <p className="py-4 text-center text-sm text-zinc-500 dark:text-zinc-400">
                                            Nenhuma permissão corresponde à pesquisa.
                                        </p>
                                    ) : (
                                        filteredPermissionGroups.map(({ key, title, perms }) => (
                                            <PermissionGroupAccordion
                                                key={key}
                                                groupKey={key}
                                                title={title}
                                                perms={perms}
                                                rolePermissions={role.permissions}
                                                forceOpen={!!q}
                                                onTogglePermission={(perm) => togglePermission(index, perm)}
                                                saving={roleSaving}
                                            />
                                        ))
                                    )}
                                </div>
                                ) : null}
                            </div>
                        );
                    })
                    )}
                </div>

                <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 p-4 text-sm text-zinc-600 dark:text-zinc-400">
                    <strong className="font-medium text-zinc-800 dark:text-zinc-200">Salas</strong> (cadastro) e{' '}
                    <strong className="font-medium text-zinc-800 dark:text-zinc-200">Agendamento de salas</strong> são blocos
                    separados: o agendamento corresponde ao menu «Agendamento de salas» na barra lateral.
                </div>
            </div>
        </AdminLayout>
    );
}
