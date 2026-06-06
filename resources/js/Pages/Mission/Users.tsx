import AdminLayout from '@/Layouts/AdminLayout';
import FlashMessages from '@/Components/FlashMessages';
import MissionAdminTabs from '@/Components/Mission/MissionAdminTabs';
import MissionPhaseLeaderModal from '@/Components/Mission/MissionPhaseLeaderModal';
import PageHeader from '@/Components/PageHeader';
import Card from '@/Components/Card';
import UserListAvatar from '@/Components/UserListAvatar';
import { Head } from '@inertiajs/react';
import { ShieldCheckIcon } from '@heroicons/react/24/outline';
import { useState } from 'react';

type PhaseOption = {
    id: number;
    name: string;
};

type MissionUserRow = {
    id: number;
    name: string;
    email: string | null;
    is_phase_leader: boolean;
    mission_phase_ids: number[];
    phase_labels: string[];
};

interface Props {
    users: MissionUserRow[];
    phases: PhaseOption[];
    canManage: boolean;
    updateUrlPattern: string;
}

export default function MissionUsers({ users, phases, canManage, updateUrlPattern }: Props) {
    const [leaderModalOpen, setLeaderModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<MissionUserRow | null>(null);

    const openLeaderModal = (user: MissionUserRow) => {
        setSelectedUser(user);
        setLeaderModalOpen(true);
    };

    const closeLeaderModal = () => {
        setLeaderModalOpen(false);
        setSelectedUser(null);
    };

    return (
        <AdminLayout>
            <Head title="Missão — usuários" />
            <FlashMessages />
            <div className="space-y-6">
                <PageHeader
                    title="Missão"
                    subtitle="Usuários com acesso à Missão e líderes de fase do quadro."
                />

                <MissionAdminTabs active="usuarios" />

                <Card className="overflow-x-auto">
                    {users.length === 0 ? (
                        <p className="p-6 text-sm text-zinc-500">
                            Nenhum usuário com permissão «Ver Missão» nesta igreja.
                        </p>
                    ) : (
                        <table className="min-w-full text-sm">
                            <thead>
                                <tr className="border-b border-zinc-200 text-left dark:border-zinc-700">
                                    <th className="p-3">Usuário</th>
                                    <th className="p-3">Liderança</th>
                                    {canManage ? <th className="w-14 p-3 text-right">Ações</th> : null}
                                </tr>
                            </thead>
                            <tbody>
                                {users.map((user) => (
                                    <tr key={user.id} className="border-b border-zinc-100 dark:border-zinc-800">
                                        <td className="p-3">
                                            <div className="flex items-center gap-3">
                                                <UserListAvatar name={user.name} size="md" />
                                                <div className="min-w-0">
                                                    <div className="font-medium text-zinc-900 dark:text-white">{user.name}</div>
                                                    <div className="text-xs text-zinc-500">{user.email ?? 'Sem e-mail'}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-3">
                                            {user.is_phase_leader && user.phase_labels.length > 0 ? (
                                                <div className="flex flex-wrap gap-1.5">
                                                    {user.phase_labels.map((label) => (
                                                        <span
                                                            key={label}
                                                            className="inline-flex rounded-full bg-teal-50 px-2 py-0.5 text-xs font-medium text-teal-800 dark:bg-teal-950/50 dark:text-teal-200"
                                                        >
                                                            {label}
                                                        </span>
                                                    ))}
                                                </div>
                                            ) : (
                                                <span className="text-zinc-500">—</span>
                                            )}
                                        </td>
                                        {canManage ? (
                                            <td className="p-3 text-right">
                                                <button
                                                    type="button"
                                                    onClick={() => openLeaderModal(user)}
                                                    className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-600 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-600 dark:hover:bg-zinc-800"
                                                    title="Definir líder de fase"
                                                    aria-label={`Definir liderança de fase de ${user.name}`}
                                                >
                                                    <ShieldCheckIcon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                                                </button>
                                            </td>
                                        ) : null}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </Card>

                <MissionPhaseLeaderModal
                    show={leaderModalOpen}
                    onClose={closeLeaderModal}
                    user={selectedUser}
                    phases={phases}
                    updateUrlPattern={updateUrlPattern}
                />
            </div>
        </AdminLayout>
    );
}
