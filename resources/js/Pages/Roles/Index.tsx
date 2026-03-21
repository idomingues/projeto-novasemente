import AdminLayout from '@/Layouts/AdminLayout';
import { Head, useForm } from '@inertiajs/react';
import PageHeader from '@/Components/PageHeader';
import Card from '@/Components/Card';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import InputLabel from '@/Components/InputLabel';
import { FormEventHandler, useMemo } from 'react';

interface RoleRow {
    id: number;
    name: string;
    permissions: string[];
}

interface PermissionRow {
    id: number;
    name: string;
}

interface Props {
    roles: RoleRow[];
    permissions: PermissionRow[];
}

export default function RolesIndex({ roles, permissions }: Props) {
    const { data, setData, post, processing } = useForm({
        roles: roles.map((r) => ({
            name: r.name,
            permissions: r.permissions,
        })),
    });

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
        Object.keys(groups).forEach((g) => groups[g].sort());
        return groups;
    }, [permissions]);

    const groupTitle = (group: string): string => {
        const labels: Record<string, string> = {
            members: 'Membros',
            volunteers: 'Voluntários',
            departments: 'Departamentos',
            rooms: 'Salas',
            inventory: 'Inventário',
            users: 'Usuários',
            churches: 'Igrejas',
            news: 'Notícias',
            events: 'Eventos',
            escalas: 'Escalas',
            support: 'Suporte',
            roles: 'Perfis',
            music: 'Acervo e músicas',
            culto: 'Culto',
            finance: 'Financeiro',
            notifications: 'Notificações',
        };
        return labels[group] ?? group;
    };

    const permissionLineLabel = (perm: string): string => {
        const custom: Record<string, string> = {
            'music.manage': 'Gerenciar (acervo, músicas e playlists)',
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
    };

    const togglePermission = (roleIndex: number, perm: string) => {
        const current = data.roles[roleIndex].permissions;
        const has = current.includes(perm);
        const updated = {
            ...data,
            roles: data.roles.map((r, i) =>
                i === roleIndex
                    ? {
                          ...r,
                          permissions: has ? current.filter((p) => p !== perm) : [...current, perm],
                      }
                    : r,
            ),
        };
        setData(updated);
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('roles.update'));
    };

    return (
        <AdminLayout>
            <Head title="Perfis de acesso" />
            <PageHeader title="Perfis de acesso">
                <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-xl">
                    Defina quais telas e funcionalidades cada perfil (papel) pode acessar no sistema.
                </p>
            </PageHeader>

            <form onSubmit={submit} className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                    {data.roles.map((role, index) => (
                        <Card key={role.name} className="space-y-4">
                            <div className="flex items-center justify-between gap-2">
                                <div>
                                    <h2 className="font-semibold text-zinc-900 dark:text-white capitalize">
                                        {role.name.replace('_', ' ')}
                                    </h2>
                                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                        Permissões para o perfil <strong>{role.name}</strong>.
                                    </p>
                                </div>
                                {(role.name === 'super_admin' || role.name === 'admin') && (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-zinc-900 text-white dark:bg-white dark:text-black uppercase tracking-wide">
                                        Administrador
                                    </span>
                                )}
                            </div>

                            <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                                {Object.entries(groupedPermissions).map(([group, perms]) => (
                                    <div key={group} className="border border-zinc-200 dark:border-zinc-800 rounded-xl p-3">
                                        <InputLabel value={groupTitle(group)} className="!mb-2" />
                                        <div className="space-y-2">
                                            {perms.map((perm) => {
                                                const checked = role.permissions.includes(perm);
                                                return (
                                                    <label
                                                        key={perm}
                                                        className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300 cursor-pointer"
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={checked}
                                                            onChange={() => togglePermission(index, perm)}
                                                            className="rounded border-zinc-300 dark:border-zinc-600 text-zinc-900 focus:ring-zinc-500"
                                                        />
                                                        <span>{permissionLineLabel(perm)}</span>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    ))}
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

