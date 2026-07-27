import Modal from '@/Components/Modal';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import SearchableSelect, { type SearchableOption } from '@/Components/SearchableSelect';
import SelectInput from '@/Components/SelectInput';
import UserListAvatar from '@/Components/UserListAvatar';
import { appRoleLabel } from '@/lib/appRoleLabels';
import { confirmAction } from '@/utils/confirmDialog';
import {
    reloadListModalProps,
    submitListModalDelete,
    submitListModalPatch,
    submitListModalPost,
} from '@/utils/listModalFetchSave';
import { textIncludesSearch } from '@/utils/searchText';
import { ArrowsRightLeftIcon, TrashIcon, UserPlusIcon } from '@heroicons/react/24/outline';
import { useEffect, useMemo, useRef, useState } from 'react';

export interface RoleUserRow {
    id: number;
    name: string;
    email: string;
    photo_url?: string | null;
}

export interface CandidateUserRow extends RoleUserRow {
    role_name: string;
}

export interface MoveTarget {
    name: string;
    label: string;
}

interface Props {
    show: boolean;
    onClose: () => void;
    roleId: number;
    roleName: string;
    users: RoleUserRow[];
    candidateUsers: CandidateUserRow[];
    moveTargets: MoveTarget[];
    csrf: string;
}

const RELOAD_ONLY = ['roles', 'candidateUsers', 'moveTargets'];

export default function RoleUsersModal({
    show,
    onClose,
    roleId,
    roleName,
    users,
    candidateUsers,
    moveTargets,
    csrf,
}: Props) {
    const roleLabel = appRoleLabel(roleName);
    const [listFilter, setListFilter] = useState('');
    const [userIdToAdd, setUserIdToAdd] = useState<number | string | ''>('');
    const [busy, setBusy] = useState(false);
    const [editingUserId, setEditingUserId] = useState<number | null>(null);
    const [nextRoleName, setNextRoleName] = useState('');
    /** Impede o Dialog (Headless) fechar ao perder foco no SweetAlert / reload Inertia. */
    const stayOpenRef = useRef(false);

    useEffect(() => {
        if (!show) {
            setListFilter('');
            setUserIdToAdd('');
            setEditingUserId(null);
            setNextRoleName('');
            setBusy(false);
            stayOpenRef.current = false;
        }
    }, [show]);

    useEffect(() => {
        setEditingUserId(null);
        setNextRoleName('');
    }, [roleId]);

    const requestClose = () => {
        if (stayOpenRef.current || busy) {
            return;
        }
        onClose();
    };

    const addOptions: SearchableOption[] = useMemo(() => {
        const onRole = new Set(users.map((u) => u.id));
        return candidateUsers
            .filter((u) => !onRole.has(u.id))
            .map((u) => {
                const current =
                    u.role_name && u.role_name !== roleName
                        ? ` · hoje: ${appRoleLabel(u.role_name)}`
                        : u.role_name === ''
                          ? ' · sem perfil'
                          : '';
                return {
                    id: u.id,
                    name: `${u.name} (${u.email})${current}`,
                };
            });
    }, [candidateUsers, roleName, users]);

    const filteredUsers = useMemo(() => {
        const q = listFilter.trim();
        if (!q) {
            return users;
        }
        return users.filter(
            (u) => textIncludesSearch(u.name, q) || textIncludesSearch(u.email, q),
        );
    }, [listFilter, users]);

    const otherTargets = useMemo(
        () => moveTargets.filter((t) => t.name !== roleName),
        [moveTargets, roleName],
    );

    const selectedCandidate = useMemo(
        () => candidateUsers.find((u) => String(u.id) === String(userIdToAdd)),
        [candidateUsers, userIdToAdd],
    );

    const runConfirmedAction = async (
        confirmOpts: Parameters<typeof confirmAction>[0],
        action: () => Promise<{ ok: boolean; message?: string }>,
        onOk?: () => void,
    ) => {
        stayOpenRef.current = true;
        try {
            const confirmed = await confirmAction(confirmOpts);
            if (!confirmed) {
                return;
            }

            setBusy(true);
            try {
                const result = await action();
                if (!result.ok) {
                    window.alert(result.message ?? 'Não foi possível concluir a ação. Tente novamente.');
                    return;
                }
                await reloadListModalProps(RELOAD_ONLY);
                onOk?.();
            } finally {
                setBusy(false);
            }
        } finally {
            stayOpenRef.current = false;
        }
    };

    const handleAttach = async () => {
        if (userIdToAdd === '' || busy) {
            return;
        }

        const candidate = selectedCandidate;
        if (!candidate) {
            return;
        }

        const previous =
            candidate.role_name && candidate.role_name !== roleName
                ? ` Hoje está em «${appRoleLabel(candidate.role_name)}» — esse perfil será substituído.`
                : candidate.role_name === ''
                  ? ' A pessoa ainda não tem perfil de painel.'
                  : '';

        await runConfirmedAction(
            {
                title: 'Incluir no perfil?',
                text: `«${candidate.name}» passará a usar o perfil «${roleLabel}».${previous}`,
                confirmButtonText: 'Incluir',
                icon: 'question',
            },
            () =>
                submitListModalPost(
                    route('roles.users.attach', roleId),
                    { user_id: Number(userIdToAdd) },
                    csrf,
                ),
            () => setUserIdToAdd(''),
        );
    };

    const handleDetach = async (user: RoleUserRow) => {
        if (busy) {
            return;
        }

        await runConfirmedAction(
            {
                title: 'Remover deste perfil?',
                text: `«${user.name}» sairá de «${roleLabel}» e ficará como Usuário (app), sem acesso de painel por este perfil.`,
                confirmButtonText: 'Remover',
                danger: true,
                icon: 'warning',
            },
            () => submitListModalDelete(route('roles.users.detach', { role: roleId, user: user.id }), csrf),
        );
    };

    const startEdit = (user: RoleUserRow) => {
        setEditingUserId(user.id);
        setNextRoleName(otherTargets[0]?.name ?? '');
    };

    const handleMove = async (user: RoleUserRow) => {
        if (busy || nextRoleName === roleName) {
            return;
        }

        const nextLabel =
            nextRoleName === ''
                ? 'Sem perfil'
                : otherTargets.find((t) => t.name === nextRoleName)?.label ?? appRoleLabel(nextRoleName);

        await runConfirmedAction(
            {
                title: 'Alterar perfil?',
                text: `«${user.name}» passará de «${roleLabel}» para «${nextLabel}».`,
                confirmButtonText: 'Alterar',
                icon: 'question',
            },
            () =>
                submitListModalPatch(
                    route('roles.users.update', { role: roleId, user: user.id }),
                    { role_name: nextRoleName },
                    csrf,
                ),
            () => {
                setEditingUserId(null);
                setNextRoleName('');
            },
        );
    };

    return (
        <Modal show={show} onClose={requestClose} closeable={!busy} maxWidth="lg">
            <div className="flex max-h-[min(90vh,720px)] flex-col">
                <div className="border-b border-zinc-100 px-6 py-5 dark:border-zinc-800">
                    <p className="text-xs font-semibold uppercase tracking-wide text-teal-700 dark:text-teal-300">
                        Usuários do perfil
                    </p>
                    <h2 className="mt-1 text-lg font-semibold text-zinc-900 dark:text-white">{roleLabel}</h2>
                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                        {users.length === 0
                            ? 'Ninguém com este perfil ainda. Inclua alguém abaixo.'
                            : users.length === 1
                              ? '1 pessoa com este perfil.'
                              : `${users.length} pessoas com este perfil.`}
                    </p>
                </div>

                <div className="space-y-3 border-b border-zinc-100 bg-zinc-50/80 px-6 py-4 dark:border-zinc-800 dark:bg-zinc-900/40">
                    <div className="flex items-center gap-2 text-sm font-medium text-zinc-800 dark:text-zinc-100">
                        <UserPlusIcon className="h-4 w-4 text-teal-700 dark:text-teal-300" aria-hidden />
                        Incluir usuário
                    </div>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                        <div className="min-w-0 flex-1">
                            <SearchableSelect
                                id={`role-users-add-${roleId}`}
                                label="Buscar pessoa"
                                value={userIdToAdd}
                                onChange={setUserIdToAdd}
                                options={addOptions}
                                placeholder="Nome ou e-mail…"
                                emptyOption="—"
                            />
                        </div>
                        <PrimaryButton
                            type="button"
                            disabled={busy || userIdToAdd === ''}
                            onClick={() => void handleAttach()}
                            className="shrink-0"
                        >
                            Incluir
                        </PrimaryButton>
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        Cada pessoa tem um único perfil. Ao incluir, o perfil anterior (se houver) é substituído.
                    </p>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
                    {users.length > 0 ? (
                        <div className="mb-3">
                            <label htmlFor={`role-users-filter-${roleId}`} className="sr-only">
                                Filtrar na lista
                            </label>
                            <input
                                id={`role-users-filter-${roleId}`}
                                type="search"
                                value={listFilter}
                                onChange={(e) => setListFilter(e.target.value)}
                                placeholder="Filtrar na lista…"
                                className="block w-full cursor-text rounded-xl border-zinc-200 bg-white text-sm shadow-sm focus:border-teal-500 focus:ring-teal-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                            />
                        </div>
                    ) : null}

                    {filteredUsers.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-zinc-200 px-4 py-10 text-center dark:border-zinc-700">
                            <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                {users.length === 0
                                    ? 'Este perfil ainda não tem usuários.'
                                    : 'Nenhum usuário corresponde ao filtro.'}
                            </p>
                        </div>
                    ) : (
                        <ul className="space-y-2">
                            {filteredUsers.map((user) => {
                                const editing = editingUserId === user.id;
                                return (
                                    <li
                                        key={user.id}
                                        className="rounded-2xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950/40"
                                    >
                                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                            <div className="flex min-w-0 items-center gap-3">
                                                <UserListAvatar
                                                    name={user.name}
                                                    photoUrl={user.photo_url}
                                                    size="md"
                                                    previewOnClick
                                                />
                                                <div className="min-w-0">
                                                    <p className="truncate font-medium text-zinc-900 dark:text-white">
                                                        {user.name}
                                                    </p>
                                                    <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                                                        {user.email}
                                                    </p>
                                                </div>
                                            </div>
                                            {!editing ? (
                                                <div className="flex flex-wrap gap-2 sm:justify-end">
                                                    <button
                                                        type="button"
                                                        disabled={busy || otherTargets.length === 0}
                                                        onClick={() => startEdit(user)}
                                                        className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                                                    >
                                                        <ArrowsRightLeftIcon className="h-3.5 w-3.5" aria-hidden />
                                                        Alterar
                                                    </button>
                                                    <button
                                                        type="button"
                                                        disabled={busy}
                                                        onClick={() => void handleDetach(user)}
                                                        className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-800 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200 dark:hover:bg-red-950/70"
                                                    >
                                                        <TrashIcon className="h-3.5 w-3.5" aria-hidden />
                                                        Remover
                                                    </button>
                                                </div>
                                            ) : null}
                                        </div>

                                        {editing ? (
                                            <div className="mt-3 space-y-3 rounded-xl border border-teal-200 bg-teal-50/70 p-3 dark:border-teal-900/50 dark:bg-teal-950/30">
                                                <label
                                                    htmlFor={`role-move-${user.id}`}
                                                    className="block text-xs font-semibold text-teal-900 dark:text-teal-100"
                                                >
                                                    Novo perfil
                                                </label>
                                                <SelectInput
                                                    id={`role-move-${user.id}`}
                                                    value={nextRoleName}
                                                    onChange={(e) => setNextRoleName(e.target.value)}
                                                    className="mt-1 cursor-pointer border-zinc-200 focus:border-teal-500 focus:ring-teal-500/30 dark:border-zinc-700"
                                                >
                                                    {otherTargets.map((t) => (
                                                        <option
                                                            key={t.name === '' ? '__sem_perfil__' : t.name}
                                                            value={t.name}
                                                        >
                                                            {t.label}
                                                        </option>
                                                    ))}
                                                </SelectInput>
                                                <div className="flex flex-wrap justify-end gap-2">
                                                    <SecondaryButton
                                                        type="button"
                                                        disabled={busy}
                                                        onClick={() => {
                                                            setEditingUserId(null);
                                                            setNextRoleName('');
                                                        }}
                                                    >
                                                        Cancelar
                                                    </SecondaryButton>
                                                    <PrimaryButton
                                                        type="button"
                                                        disabled={busy}
                                                        onClick={() => void handleMove(user)}
                                                    >
                                                        Confirmar alteração
                                                    </PrimaryButton>
                                                </div>
                                            </div>
                                        ) : null}
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
            </div>
        </Modal>
    );
}
