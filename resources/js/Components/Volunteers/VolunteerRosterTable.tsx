import UserListAvatar from '@/Components/UserListAvatar';
import VolunteerMinistryDepartmentColumn from '@/Components/Volunteers/VolunteerMinistryDepartmentColumn';
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

function VolunteerRosterNameMarks({ volunteer }: { volunteer: VolunteerRosterListRow }) {
    return (
        <>
            {volunteer.hasLeaderNotes ? (
                <VolunteerRosterSignalDot
                    label="Voluntário com anotação interna"
                    title="Voluntário com anotação interna"
                    toneClass="bg-amber-500 dark:bg-amber-400"
                />
            ) : null}
            {volunteer.recentlyUpdated ? (
                <VolunteerRosterSignalDot
                    label="Cadastro atualizado recentemente"
                    title={`Cadastro atualizado em ${formatShortDate(volunteer.updatedAt ?? null)}`}
                    toneClass="bg-emerald-500 dark:bg-emerald-400"
                />
            ) : null}
        </>
    );
}

function VolunteerRosterRowActions({
    volunteer,
    canVolunteerManage,
    canPipelineMutate,
    invitingVolunteerId,
    onInvitingChange,
    onEncaminhar,
}: {
    volunteer: VolunteerRosterListRow;
    canVolunteerManage: boolean;
    canPipelineMutate: boolean;
    invitingVolunteerId: number | null;
    onInvitingChange: (id: number | null) => void;
    onEncaminhar: (volunteer: VolunteerRosterListRow) => void;
}) {
    const closeAnyDropdown = () => {
        const el = document.querySelector('[data-dropdown-backdrop="true"]') as HTMLElement | null;
        el?.click();
    };

    return (
        <Dropdown>
            <Dropdown.Trigger>
                <button
                    type="button"
                    className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                    title={`Abrir ações de ${volunteer.name ?? 'voluntário'}`}
                    aria-label={`Abrir ações de ${volunteer.name ?? 'voluntário'}`}
                >
                    <EllipsisVerticalIcon className="h-5 w-5" aria-hidden />
                </button>
            </Dropdown.Trigger>

            <Dropdown.Content width="48" align="right" portal>
                <div className="py-1">
                    {canVolunteerManage && !volunteer.email?.trim() ? (
                        <button
                            type="button"
                            disabled={invitingVolunteerId === volunteer.id}
                            onClick={(ev) => {
                                ev.preventDefault();
                                ev.stopPropagation();
                                onInvitingChange(volunteer.id);
                                router.post(
                                    route('volunteers.invite', volunteer.id),
                                    {},
                                    {
                                        preserveScroll: true,
                                        onFinish: () => onInvitingChange(null),
                                    },
                                );
                            }}
                            title="Enviar convite para criar acesso ao app"
                            className="block w-full cursor-pointer px-4 py-2 text-start text-sm leading-5 text-zinc-700 transition duration-150 ease-in-out hover:bg-zinc-100 hover:text-zinc-900 focus:bg-zinc-100 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white dark:focus:bg-zinc-800"
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
                                onEncaminhar(volunteer);
                            }}
                            title="Escolher departamentos para encaminhar este voluntário"
                            className="block w-full cursor-pointer px-4 py-2 text-start text-sm leading-5 text-zinc-700 transition duration-150 ease-in-out hover:bg-zinc-100 hover:text-zinc-900 focus:bg-zinc-100 focus:outline-none dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white dark:focus:bg-zinc-800"
                        >
                            Encaminhar
                        </button>
                    ) : null}
                </div>
            </Dropdown.Content>
        </Dropdown>
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
    const emptyState = (
        <div className="px-3 py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
            Nenhum voluntário encontrado.
        </div>
    );

    if (volunteers.length === 0) {
        return emptyState;
    }

    return (
        <div className="overflow-x-auto overscroll-x-contain">
            <table className={`w-full min-w-[640px] table-fixed text-left ${textSize}`}>
                <colgroup>
                    <col className="w-28" />
                    <col />
                    <col />
                    <col />
                    <col className="w-24" />
                    <col />
                    <col className="w-10" />
                </colgroup>
                <thead className={`bg-zinc-50 dark:bg-zinc-950 ${headClass}`}>
                        <tr className="border-b border-zinc-200 dark:border-zinc-700">
                            <th className="w-28 max-w-28 pb-2 pr-2 font-semibold">Nome</th>
                            <th className="pb-2 pr-3 font-semibold">{canVolunteerManage ? 'Fase principal' : 'Fase'}</th>
                            <th className="pb-2 pr-3 font-semibold">Convite</th>
                            <th className="pb-2 pr-3 font-semibold">Fase depto</th>
                            <th className="pb-2 pr-3 font-semibold">Cadastro</th>
                            <th className="pb-2 pr-3 font-semibold">Interesses</th>
                            <th className="w-10 pb-2 pl-2 text-right font-semibold">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {volunteers.map((v) => (
                            <tr
                                key={v.id}
                                className={`group cursor-pointer border-b border-zinc-100 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800 ${v.pendingInvite ? 'bg-amber-50/40 dark:bg-amber-950/10' : ''}`}
                                onClick={() => onOpenVolunteer(v.id)}
                                title={`Abrir ficha de ${v.name ?? 'voluntário'}`}
                            >
                                <td className={`w-28 max-w-28 ${cellY} pr-2 font-medium text-zinc-900 dark:text-white`}>
                                    <div className="flex max-w-full items-start gap-1.5">
                                        <UserListAvatar name={v.name} photoUrl={v.photoUrl} size="sm" previewOnClick={false} />
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-start gap-1">
                                                <VolunteerRosterNameMarks volunteer={v} />
                                                <span className="line-clamp-2 min-w-0 break-words leading-tight" title={v.name ?? undefined}>
                                                    {v.name}
                                                </span>
                                            </div>
                                            {v.hasUserAccount ? (
                                                <span className="mt-0.5 inline-block rounded-full bg-sky-100 px-1.5 py-px text-[9px] font-semibold uppercase tracking-wide text-sky-800 dark:bg-sky-950/50 dark:text-sky-200">
                                                    Com conta
                                                </span>
                                            ) : null}
                                        </div>
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
                                <td
                                    className={`cursor-default ${cellY} pl-2 text-right`}
                                    onClick={(ev) => ev.stopPropagation()}
                                >
                                    <VolunteerRosterRowActions
                                        volunteer={v}
                                        canVolunteerManage={canVolunteerManage}
                                        canPipelineMutate={canPipelineMutate}
                                        invitingVolunteerId={invitingVolunteerId}
                                        onInvitingChange={onInvitingChange}
                                        onEncaminhar={onEncaminhar}
                                    />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
        </div>
    );
}
