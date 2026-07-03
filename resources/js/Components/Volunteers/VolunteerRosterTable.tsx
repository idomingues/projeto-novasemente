import UserListAvatar from '@/Components/UserListAvatar';
import VolunteerAppInviteButton from '@/Components/Volunteers/VolunteerAppInviteButton';
import VolunteerMinistryDepartmentColumn from '@/Components/Volunteers/VolunteerMinistryDepartmentColumn';
import { volunteerEncaminharButtonClass } from '@/Components/Volunteers/VolunteerAppInviteButton';
import { volunteerMinistryPhasesInList } from '@/utils/volunteerMinistryPhasesInList';
import { formatShortDate, listEmpty, type VolunteerRosterListRow } from '@/utils/volunteerRosterList';
import { router } from '@inertiajs/react';
import Dropdown from '@/Components/Dropdown';
import { EllipsisVerticalIcon } from '@heroicons/react/24/outline';

type Props = {
    volunteers: VolunteerRosterListRow[];
    canVolunteerManage: boolean;
    canPipelineMutate: boolean;
    invitingVolunteerId: number | null;
    onInvitingChange: (id: number | null) => void;
    onOpenVolunteer: (id: number) => void;
    onEncaminhar: (volunteer: VolunteerRosterListRow) => void;
    compact?: boolean;
};

function VolunteerRosterSignalDot({
    label,
    title,
    toneClass,
}: {
    label: string;
    title?: string;
    toneClass: string;
}) {
    return (
        <span
            role="img"
            aria-label={label}
            title={title ?? label}
            className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-white dark:ring-zinc-950 ${toneClass}`}
        />
    );
}

export default function VolunteerRosterTable({
    volunteers,
    canVolunteerManage,
    canPipelineMutate,
    invitingVolunteerId,
    onInvitingChange,
    onOpenVolunteer,
    onEncaminhar,
    compact = false,
}: Props) {
    const textSize = compact ? 'text-xs' : 'text-sm';
    const headClass = compact
        ? 'text-[10px] uppercase tracking-wide text-zinc-500 dark:text-zinc-400'
        : 'text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400';
    const cellY = compact ? 'py-1.5' : 'py-2';

    const closeAnyDropdown = () => {
        const el = document.querySelector('[data-dropdown-backdrop="true"]') as HTMLElement | null;
        el?.click();
    };

    return (
        <div className="overflow-x-auto">
            <table className={`min-w-full text-left ${textSize}`}>
                <thead className={`sticky top-0 z-10 bg-zinc-50 dark:bg-zinc-950 ${headClass}`}>
                    <tr className="border-b border-zinc-200 dark:border-zinc-700">
                        <th className="w-10 pb-2 pr-2 font-semibold">
                            <span className="sr-only">Foto</span>
                        </th>
                        <th className="pb-2 pr-3 font-semibold">Nome</th>
                        <th className="pb-2 pr-3 font-semibold">{canVolunteerManage ? 'Fase principal' : 'Fase'}</th>
                        <th className="pb-2 pr-3 font-semibold">Convite</th>
                        <th className="pb-2 pr-3 font-semibold">Fase depto</th>
                        <th className="pb-2 pr-3 font-semibold">Cadastro</th>
                        <th className="pb-2 pr-3 font-semibold">Interesses</th>
                        <th className="pb-2 text-right font-semibold">Ações</th>
                    </tr>
                </thead>
                <tbody>
                    {volunteers.map((v) => (
                        <tr
                            key={v.id}
                            className={`cursor-pointer border-b border-zinc-100 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900/50 ${v.pendingInvite ? 'bg-amber-50/40 dark:bg-amber-950/10' : ''}`}
                            onClick={() => onOpenVolunteer(v.id)}
                        >
                            <td className={`${cellY} pr-2`}>
                                <UserListAvatar name={v.name} photoUrl={v.photoUrl} size="sm" previewOnClick={false} />
                            </td>
                            <td className={`${cellY} pr-3 font-medium text-zinc-900 dark:text-white`}>
                                <div className="flex flex-wrap items-center gap-1.5">
                                    {v.hasLeaderNotes ? (
                                        <VolunteerRosterSignalDot
                                            label="Voluntário com anotação interna"
                                            title="Voluntário com anotação interna"
                                            toneClass="bg-amber-500 dark:bg-amber-400"
                                        />
                                    ) : null}
                                    {v.recentlyUpdated ? (
                                        <VolunteerRosterSignalDot
                                            label="Cadastro atualizado recentemente"
                                            title={`Cadastro atualizado em ${formatShortDate(v.updatedAt ?? null)}`}
                                            toneClass="bg-emerald-500 dark:bg-emerald-400"
                                        />
                                    ) : null}
                                    <span>{v.name}</span>
                                    {v.hasUserAccount ? (
                                        <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-800 dark:bg-sky-950/50 dark:text-sky-200">
                                            Com conta
                                        </span>
                                    ) : null}
                                </div>
                            </td>
                            <td className={`${cellY} pr-3 text-zinc-700 dark:text-zinc-200`}>
                                {canVolunteerManage ? listEmpty(v.adminWorkflowStageName) : v.stageName}
                            </td>
                            <td className={`max-w-[220px] ${cellY} pr-3 text-xs`}>
                                <VolunteerMinistryDepartmentColumn
                                    phases={volunteerMinistryPhasesInList(v)}
                                    valueKey="inviteLabel"
                                />
                            </td>
                            <td className={`max-w-[220px] ${cellY} pr-3 text-xs`}>
                                <VolunteerMinistryDepartmentColumn
                                    phases={volunteerMinistryPhasesInList(v)}
                                    valueKey="departmentStatusLabel"
                                />
                            </td>
                            <td className={`whitespace-nowrap ${cellY} pr-3 text-zinc-600 dark:text-zinc-400`}>
                                {formatShortDate(v.createdAt)}
                            </td>
                            <td className={`max-w-[200px] ${cellY} pr-3 text-xs text-zinc-500`}>{listEmpty(v.interestPreview)}</td>
                            <td className={`cursor-default ${cellY} text-right`} onClick={(ev) => ev.stopPropagation()}>
                                <Dropdown>
                                    <Dropdown.Trigger>
                                        <button
                                            type="button"
                                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 cursor-pointer"
                                            title="Ações"
                                            aria-label="Ações"
                                        >
                                            <EllipsisVerticalIcon className="h-5 w-5" aria-hidden />
                                        </button>
                                    </Dropdown.Trigger>

                                    <Dropdown.Content width="48" align="right">
                                        <div className="py-1">
                                            {canVolunteerManage && !v.email?.trim() ? (
                                                <button
                                                    type="button"
                                                    disabled={invitingVolunteerId === v.id}
                                                    onClick={(ev) => {
                                                        ev.preventDefault();
                                                        ev.stopPropagation();
                                                        onInvitingChange(v.id);
                                                        router.post(route('volunteers.invite', v.id), {}, {
                                                            preserveScroll: true,
                                                            onFinish: () => onInvitingChange(null),
                                                        });
                                                    }}
                                                    className="block w-full px-4 py-2 text-start text-sm leading-5 text-zinc-700 dark:text-zinc-300 transition duration-150 ease-in-out hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white focus:bg-zinc-100 dark:focus:bg-zinc-800 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
                                                >
                                                    Enviar convite do app
                                                </button>
                                            ) : null}

                                            {canPipelineMutate ? (
                                                <button
                                                    type="button"
                                                    onClick={(ev) => {
                                                        ev.preventDefault();
                                                        ev.stopPropagation();
                                                        closeAnyDropdown();
                                                        onEncaminhar(v);
                                                    }}
                                                    className="block w-full px-4 py-2 text-start text-sm leading-5 text-zinc-700 dark:text-zinc-300 transition duration-150 ease-in-out hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white focus:bg-zinc-100 dark:focus:bg-zinc-800 focus:outline-none cursor-pointer"
                                                >
                                                    Encaminhar
                                                </button>
                                            ) : null}
                                        </div>
                                    </Dropdown.Content>
                                </Dropdown>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {volunteers.length === 0 ? (
                <div className="px-3 py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
                    Nenhum voluntário encontrado.
                </div>
            ) : null}
        </div>
    );
}
