import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link, router, useForm } from '@inertiajs/react';
import PageHeader from '@/Components/PageHeader';
import AddButton from '@/Components/AddButton';
import Card from '@/Components/Card';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import Modal from '@/Components/Modal';
import InputError from '@/Components/InputError';
import { FormEventHandler, useMemo, useState } from 'react';
import { confirmAction } from '@/utils/confirmDialog';
import { textIncludesSearch } from '@/utils/searchText';
import { appRoleLabel } from '@/lib/appRoleLabels';
import { TrashIcon } from '@heroicons/react/24/outline';

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
};

function groupTitle(group: string): string {
    return GROUP_LABELS[group] ?? group;
}

function permissionLineLabel(perm: string): string {
    const custom: Record<string, string> = {
        'music.manage': 'Gerenciar (acervo, músicas e playlists)',
        'photos.manage': 'Gerenciar (álbuns de fotos)',
        'library.manage': 'Gerenciar biblioteca (PDFs e capas no app)',
        'rooms.view': 'Ver salas (lista e cadastro no menu Salas)',
        'rooms.manage': 'Gerir salas (criar, editar e remover salas)',
        'rooms.schedule':
            'Agendar salas (calendário de reservas, criar e editar os próprios agendamentos; quem gere salas pode editar todos)',
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

export default function RolesIndex({ roles, permissions }: Props) {
    const [createOpen, setCreateOpen] = useState(false);
    const [permSearch, setPermSearch] = useState('');

    const { data, setData, post, processing } = useForm({
        roles: roles.map((r) => ({
            name: r.name,
            permissions: r.permissions,
        })),
    });

    const createForm = useForm({
        name: '',
    });

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

    const togglePermission = (roleIndex: number, perm: string) => {
        const current = data.roles[roleIndex].permissions;
        const has = current.includes(perm);
        setData({
            ...data,
            roles: data.roles.map((r, i) =>
                i === roleIndex
                    ? {
                          ...r,
                          permissions: has ? current.filter((p) => p !== perm) : [...current, perm],
                      }
                    : r,
            ),
        });
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('roles.update'));
    };

    const submitCreate: FormEventHandler = (e) => {
        e.preventDefault();
        createForm.post(route('roles.store'), {
            preserveScroll: true,
            onSuccess: () => {
                setCreateOpen(false);
                createForm.reset();
            },
        });
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
                    <AddButton variant="icon" onClick={() => setCreateOpen(true)} title="Novo perfil">
                        Novo perfil
                    </AddButton>
                }
            />

            <div className="mb-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/40 p-4">
                <InputLabel htmlFor="perm_search_roles" value="Procurar permissão ou área" className="!mb-1" />
                <TextInput
                    id="perm_search_roles"
                    value={permSearch}
                    onChange={(e) => setPermSearch(e.target.value)}
                    placeholder="Ex.: notícias, escalas, salas…"
                    className="block w-full max-w-md"
                />
            </div>

            <Modal show={createOpen} onClose={() => !createForm.processing && setCreateOpen(false)} maxWidth="md">
                <form onSubmit={submitCreate} className="p-6 space-y-4">
                    <div>
                        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Novo perfil</h2>
                        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                            Identificador interno: letras minúsculas, números e sublinhado (ex.:{' '}
                            <code className="text-xs">coordenador_eventos</code>). Depois escolha as permissões na grade e
                            salve.
                        </p>
                    </div>
                    <div>
                        <InputLabel htmlFor="new_role_name" value="Nome do perfil" />
                        <TextInput
                            id="new_role_name"
                            value={createForm.data.name}
                            onChange={(e) => createForm.setData('name', e.target.value)}
                            className="mt-1 block w-full"
                            placeholder="ex.: coordenador_eventos"
                            autoComplete="off"
                        />
                        <InputError message={createForm.errors.name} className="mt-1" />
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <SecondaryButton type="button" disabled={createForm.processing} onClick={() => setCreateOpen(false)}>
                            Cancelar
                        </SecondaryButton>
                        <PrimaryButton type="submit" disabled={createForm.processing}>
                            Criar perfil
                        </PrimaryButton>
                    </div>
                </form>
            </Modal>

            <form onSubmit={submit} className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                    {data.roles.map((role, index) => {
                        const meta = roleMetaByName.get(role.name);
                        const usersCount = meta?.users_count ?? 0;
                        const systemRole = meta?.system_role ?? false;
                        const canDelete = meta && !systemRole && usersCount === 0;

                        return (
                            <Card key={role.name} className="space-y-4">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                        <h2 className="font-semibold text-zinc-900 dark:text-white">{appRoleLabel(role.name)}</h2>
                                        <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono mt-0.5">{role.name}</p>
                                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                                            {usersCount === 0
                                                ? 'Nenhum usuário com este perfil.'
                                                : `${usersCount} usuário(es) com este perfil.`}
                                        </p>
                                    </div>
                                    <div className="flex shrink-0 flex-col items-end gap-2">
                                        {systemRole && (
                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-zinc-900 text-white dark:bg-white dark:text-black uppercase tracking-wide">
                                                Sistema
                                            </span>
                                        )}
                                        {canDelete && meta ? (
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteRole(meta)}
                                                className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-xs font-semibold text-red-800 hover:bg-red-100 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200 dark:hover:bg-red-950/70"
                                            >
                                                <TrashIcon className="h-3.5 w-3.5" aria-hidden />
                                                Excluir
                                            </button>
                                        ) : null}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    {filteredPermissionGroups.length === 0 ? (
                                        <p className="text-sm text-zinc-500 dark:text-zinc-400 py-4 text-center">
                                            Nenhuma permissão corresponde à pesquisa.
                                        </p>
                                    ) : (
                                        filteredPermissionGroups.map(({ key, title, perms }) => (
                                            <details
                                                key={key}
                                                open={!!q}
                                                className="group border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden"
                                            >
                                                <summary className="cursor-pointer list-none px-3 py-2.5 text-sm font-semibold text-zinc-800 dark:text-zinc-200 bg-zinc-50 dark:bg-zinc-800/60 hover:bg-zinc-100 dark:hover:bg-zinc-800 [&::-webkit-details-marker]:hidden flex items-center justify-between gap-2">
                                                    <span>{title}</span>
                                                    <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">
                                                        {perms.filter((p) => role.permissions.includes(p)).length}/{perms.length}
                                                    </span>
                                                </summary>
                                                <div className="px-3 py-3 space-y-2 border-t border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900/40">
                                                    {perms.map((perm) => {
                                                        const checked = role.permissions.includes(perm);
                                                        return (
                                                            <label
                                                                key={perm}
                                                                className="flex items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300 cursor-pointer"
                                                            >
                                                                <input
                                                                    type="checkbox"
                                                                    checked={checked}
                                                                    onChange={() => togglePermission(index, perm)}
                                                                    className="mt-0.5 rounded border-zinc-300 dark:border-zinc-600 text-zinc-900 focus:ring-zinc-500"
                                                                />
                                                                <span>{permissionLineLabel(perm)}</span>
                                                            </label>
                                                        );
                                                    })}
                                                </div>
                                            </details>
                                        ))
                                    )}
                                </div>
                            </Card>
                        );
                    })}
                </div>

                <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 p-4 text-sm text-zinc-600 dark:text-zinc-400">
                    <strong className="font-medium text-zinc-800 dark:text-zinc-200">Salas</strong> (cadastro) e{' '}
                    <strong className="font-medium text-zinc-800 dark:text-zinc-200">Agendamento de salas</strong> são blocos
                    separados: o agendamento corresponde ao menu «Agendamento de salas» na barra lateral.
                </div>

                <div className="flex justify-end gap-2">
                    <SecondaryButton type="button" onClick={() => window.history.back()}>
                        Cancelar
                    </SecondaryButton>
                    <PrimaryButton type="submit" disabled={processing}>
                        Salvar perfis
                    </PrimaryButton>
                </div>
            </form>
        </AdminLayout>
    );
}
