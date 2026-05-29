import AdminLayout from '@/Layouts/AdminLayout';
import Card from '@/Components/Card';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import Modal from '@/Components/Modal';
import PageHeader from '@/Components/PageHeader';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import TextInput from '@/Components/TextInput';
import SelectInput from '@/Components/SelectInput';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon, PencilSquareIcon, TrashIcon } from '@heroicons/react/24/outline';
import { FormEventHandler, useMemo, useState } from 'react';
import { confirmAction } from '@/utils/confirmDialog';
import { inertiaListModalSave } from '@/utils/inertiaListModalSave';

interface RoomOpt {
    id: number;
    name: string;
    floor: string | null;
    location: string | null;
}

interface BookingRow {
    id: number;
    title: string;
    notes: string | null;
    starts_at: string;
    ends_at: string;
    room: { id: number; name: string; floor: string | null };
    user: { id: number; name: string };
    is_mine: boolean;
}

interface Props {
    view: 'day' | 'week' | 'month';
    anchorDate: string;
    rangeStart: string;
    rangeEnd: string;
    bookings: BookingRow[];
    rooms: RoomOpt[];
    /** Filtro por sala (query `room`); null = todas as salas no período. */
    roomFilter: number | null;
    /** Contagem de agendamentos no período atual, por id de sala. */
    bookingCountsByRoom: Record<string, number>;
    /** Total de agendamentos no período (todas as salas). */
    totalBookingsInRange: number;
    canSchedule: boolean;
    canManageRooms: boolean;
}

const FLOOR_LABEL: Record<string, string> = {
    terreo: 'Térreo',
    mezanino: 'Mezanino',
    primeiro: 'Primeiro',
    segundo: 'Segundo',
    terceiro: 'Terceiro',
};

function pad(n: number): string {
    return n < 10 ? `0${n}` : String(n);
}

function toDatetimeLocal(iso: string): string {
    const d = new Date(iso);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromDatetimeLocal(s: string): string {
    const d = new Date(s);
    return d.toISOString();
}

export default function Schedule({
    view,
    anchorDate,
    rangeStart,
    rangeEnd,
    bookings,
    rooms,
    roomFilter,
    bookingCountsByRoom,
    totalBookingsInRange,
    canSchedule,
    canManageRooms,
}: Props) {
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<BookingRow | null>(null);

    const { data, setData, post, put, processing, errors, clearErrors, transform, reset } = useForm({
        room_id: '' as number | '',
        title: '',
        notes: '',
        starts_at: '',
        ends_at: '',
    });

    /** `roomId`: null = link “Todas”; número = essa sala; omitido = manter filtro atual. */
    const buildIndexParams = (options: { view?: typeof view; date?: string; roomId?: number | null } = {}) => {
        const p: Record<string, string | number> = {
            view: options.view ?? view,
            date: options.date ?? anchorDate,
        };
        const room = options.roomId !== undefined ? options.roomId : roomFilter;
        if (room != null) {
            p.room = room;
        }
        return p;
    };

    const filterQuerySuffix = () => {
        const p = buildIndexParams();
        const sp = new URLSearchParams();
        sp.set('view', String(p.view));
        sp.set('date', String(p.date));
        if ('room' in p) {
            sp.set('room', String(p.room));
        }
        const q = sp.toString();
        return q ? `?${q}` : '';
    };

    const openCreate = () => {
        setEditing(null);
        const start = new Date(anchorDate + 'T09:00:00');
        const end = new Date(anchorDate + 'T10:00:00');
        let defaultRoom: number | '' = '';
        if (roomFilter != null && rooms.some((r) => r.id === roomFilter)) {
            defaultRoom = roomFilter;
        } else if (rooms.length > 0) {
            defaultRoom = rooms[0]!.id;
        }
        setData({
            room_id: defaultRoom === '' ? '' : defaultRoom,
            title: '',
            notes: '',
            starts_at: toDatetimeLocal(start.toISOString()),
            ends_at: toDatetimeLocal(end.toISOString()),
        });
        clearErrors();
        setModalOpen(true);
    };

    const openEdit = (b: BookingRow) => {
        if (!canSchedule && !canManageRooms) {
            return;
        }
        if (!canManageRooms && !b.is_mine) {
            return;
        }
        setEditing(b);
        setData({
            room_id: b.room.id,
            title: b.title,
            notes: b.notes ?? '',
            starts_at: toDatetimeLocal(b.starts_at),
            ends_at: toDatetimeLocal(b.ends_at),
        });
        clearErrors();
        setModalOpen(true);
    };

    const closeModal = () => {
        setModalOpen(false);
        setEditing(null);
        reset();
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        transform((d) => ({
            room_id: d.room_id,
            title: d.title,
            notes: d.notes ? d.notes : null,
            starts_at: fromDatetimeLocal(d.starts_at),
            ends_at: fromDatetimeLocal(d.ends_at),
        }));
        if (editing) {
            put(`${route('room-bookings.update', editing.id)}${filterQuerySuffix()}`, {
                ...inertiaListModalSave,
            });
        } else {
            post(`${route('room-bookings.store')}${filterQuerySuffix()}`, {
                ...inertiaListModalSave,
            });
        }
    };

    const deleteBooking = async (b: BookingRow) => {
        const ok = await confirmAction({
            title: 'Remover agendamento?',
            text: 'Esta ação não pode ser desfeita.',
            confirmButtonText: 'Remover',
            danger: true,
            icon: 'warning',
        });
        if (!ok) {
            return;
        }
        router.delete(`${route('room-bookings.destroy', b.id)}${filterQuerySuffix()}`, { preserveScroll: true });
    };

    const navigate = (nextDate: string, nextView: typeof view) => {
        router.get(route('room-bookings.index'), buildIndexParams({ view: nextView, date: nextDate }), { preserveScroll: true });
    };

    const prevNext = useMemo(() => {
        const d = new Date(anchorDate + 'T12:00:00');
        let prev: Date;
        let next: Date;
        if (view === 'day') {
            prev = new Date(d);
            prev.setDate(prev.getDate() - 1);
            next = new Date(d);
            next.setDate(next.getDate() + 1);
        } else if (view === 'week') {
            prev = new Date(d);
            prev.setDate(prev.getDate() - 7);
            next = new Date(d);
            next.setDate(next.getDate() + 7);
        } else {
            prev = new Date(d.getFullYear(), d.getMonth() - 1, 1);
            next = new Date(d.getFullYear(), d.getMonth() + 1, 1);
        }
        const f = (x: Date) => `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`;
        return { prev: f(prev), next: f(next) };
    }, [anchorDate, view]);

    const groupedByDay = useMemo(() => {
        const map = new Map<string, BookingRow[]>();
        bookings.forEach((b) => {
            const day = b.starts_at.slice(0, 10);
            if (!map.has(day)) {
                map.set(day, []);
            }
            map.get(day)!.push(b);
        });
        [...map.values()].forEach((arr) => arr.sort((a, c) => a.starts_at.localeCompare(c.starts_at)));
        return map;
    }, [bookings]);

    const monthGrid = useMemo(() => {
        if (view !== 'month') {
            return [];
        }
        const d = new Date(anchorDate + 'T12:00:00');
        const y = d.getFullYear();
        const m = d.getMonth();
        const first = new Date(y, m, 1);
        const last = new Date(y, m + 1, 0);
        const startPad = (first.getDay() + 6) % 7;
        const days: { date: string; inMonth: boolean; count: number }[] = [];
        const start = new Date(first);
        start.setDate(start.getDate() - startPad);
        for (let i = 0; i < 42; i++) {
            const cur = new Date(start);
            cur.setDate(start.getDate() + i);
            const ds = `${cur.getFullYear()}-${pad(cur.getMonth() + 1)}-${pad(cur.getDate())}`;
            const inMonth = cur.getMonth() === m;
            const count = groupedByDay.get(ds)?.length ?? 0;
            days.push({ date: ds, inMonth, count });
        }
        return days;
    }, [view, anchorDate, groupedByDay]);

    const rangeLabel = useMemo(() => {
        const rs = new Date(rangeStart);
        const re = new Date(rangeEnd);
        if (view === 'day') {
            return rs.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
        }
        if (view === 'week') {
            return `${rs.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} — ${re.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}`;
        }
        return rs.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    }, [view, rangeStart, rangeEnd]);

    return (
        <AdminLayout>
            <Head title="Agendamento de salas" />
            <PageHeader
                title="Agendamento de salas"
                subtitle="Filtre por sala ou veja todas no período. O responsável é o usuário que cria o agendamento."
            />

            <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                    {(['day', 'week', 'month'] as const).map((v) => (
                        <Link
                            key={v}
                            href={route('room-bookings.index', buildIndexParams({ view: v }))}
                            preserveScroll
                            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                                view === v
                                    ? 'bg-zinc-900 text-white dark:bg-white dark:text-black'
                                    : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200'
                            }`}
                        >
                            {v === 'day' ? 'Dia' : v === 'week' ? 'Semana' : 'Mês'}
                        </Link>
                    ))}
                </div>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => navigate(prevNext.prev, view)}
                        className="rounded-full border border-zinc-200 p-2 dark:border-zinc-700"
                        aria-label="Anterior"
                    >
                        <ChevronLeftIcon className="h-5 w-5" />
                    </button>
                    <span className="min-w-[10rem] text-center text-sm font-medium capitalize text-zinc-800 dark:text-zinc-100">{rangeLabel}</span>
                    <button
                        type="button"
                        onClick={() => navigate(prevNext.next, view)}
                        className="rounded-full border border-zinc-200 p-2 dark:border-zinc-700"
                        aria-label="Seguinte"
                    >
                        <ChevronRightIcon className="h-5 w-5" />
                    </button>
                    {canSchedule && (
                        <PrimaryButton type="button" onClick={openCreate} className="inline-flex items-center gap-2">
                            <PlusIcon className="h-4 w-4" />
                            Novo agendamento
                        </PrimaryButton>
                    )}
                </div>
            </div>

            {rooms.length > 0 && (
                <div className="mt-4">
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Sala</p>
                    <div className="flex flex-wrap gap-2">
                        <Link
                            href={route('room-bookings.index', buildIndexParams({ roomId: null }))}
                            preserveScroll
                            className={`inline-flex min-h-[2.75rem] max-w-[11rem] flex-col justify-center rounded-2xl border px-3 py-2 text-left text-sm transition-colors ${
                                roomFilter === null
                                    ? 'border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-black'
                                    : 'border-zinc-200 bg-white text-zinc-800 hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:border-zinc-600'
                            }`}
                        >
                            <span className="font-semibold leading-tight">Todas</span>
                            <span className={`text-xs ${roomFilter === null ? 'text-zinc-300 dark:text-zinc-600' : 'text-zinc-500 dark:text-zinc-400'}`}>
                                {totalBookingsInRange} no período
                            </span>
                        </Link>
                        {rooms.map((r) => {
                            const count = bookingCountsByRoom[String(r.id)] ?? 0;
                            const active = roomFilter === r.id;
                            return (
                                <Link
                                    key={r.id}
                                    href={route('room-bookings.index', buildIndexParams({ roomId: r.id }))}
                                    preserveScroll
                                    title={r.location ?? undefined}
                                    className={`inline-flex min-h-[2.75rem] max-w-[11rem] flex-col justify-center rounded-2xl border px-3 py-2 text-left text-sm transition-colors ${
                                        active
                                            ? 'border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-black'
                                            : 'border-zinc-200 bg-white text-zinc-800 hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:border-zinc-600'
                                    }`}
                                >
                                    <span className="line-clamp-2 font-semibold leading-tight">{r.name}</span>
                                    <span className={`text-xs ${active ? 'text-zinc-300 dark:text-zinc-600' : 'text-zinc-500 dark:text-zinc-400'}`}>
                                        {r.floor ? `${FLOOR_LABEL[r.floor] ?? r.floor} · ` : ''}
                                        {count} no período
                                    </span>
                                </Link>
                            );
                        })}
                    </div>
                </div>
            )}

            <div className="mt-6">
                {view === 'month' ? (
                    <Card className="overflow-hidden p-4">
                        <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold uppercase text-zinc-500">
                            {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map((d) => (
                                <div key={d} className="py-2">
                                    {d}
                                </div>
                            ))}
                        </div>
                        <div className="grid grid-cols-7 gap-1">
                            {monthGrid.map((cell) => (
                                <Link
                                    key={cell.date}
                                    href={route('room-bookings.index', buildIndexParams({ view: 'day', date: cell.date }))}
                                    preserveScroll
                                    className={`min-h-[4rem] rounded-xl border p-2 text-left text-sm transition-colors ${
                                        cell.inMonth
                                            ? 'border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800'
                                            : 'border-transparent bg-zinc-50/50 text-zinc-400 dark:bg-zinc-950/50'
                                    }`}
                                >
                                    <div className="font-medium">{Number(cell.date.slice(8, 10))}</div>
                                    {cell.count > 0 && (
                                        <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">{cell.count} reserva(s)</div>
                                    )}
                                </Link>
                            ))}
                        </div>
                    </Card>
                ) : (
                    <div className="space-y-6">
                        {Array.from(groupedByDay.entries())
                            .sort(([a], [b]) => a.localeCompare(b))
                            .map(([day, rows]) => (
                                <Card key={day} className="p-4">
                                    <h3 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-white">
                                        {new Date(day + 'T12:00:00').toLocaleDateString('pt-BR', {
                                            weekday: 'long',
                                            day: '2-digit',
                                            month: 'long',
                                        })}
                                    </h3>
                                    <ul className="space-y-2">
                                        {rows.map((b) => (
                                            <li
                                                key={b.id}
                                                className="flex flex-wrap items-start justify-between gap-2 rounded-xl border border-zinc-100 bg-zinc-50/80 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900/40"
                                            >
                                                <div className="min-w-0">
                                                    <p className="font-medium text-zinc-900 dark:text-white">{b.title}</p>
                                                    <p className="text-xs text-zinc-500">
                                                        {b.room.name}
                                                        {b.room.floor ? ` · ${FLOOR_LABEL[b.room.floor] ?? b.room.floor}` : ''}
                                                    </p>
                                                    <p className="text-sm text-zinc-600 dark:text-zinc-300">
                                                        {new Date(b.starts_at).toLocaleString('pt-BR', {
                                                            day: '2-digit',
                                                            month: '2-digit',
                                                            hour: '2-digit',
                                                            minute: '2-digit',
                                                        })}
                                                        {' — '}
                                                        {new Date(b.ends_at).toLocaleString('pt-BR', {
                                                            hour: '2-digit',
                                                            minute: '2-digit',
                                                        })}
                                                    </p>
                                                    <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
                                                        <span className="font-medium text-zinc-700 dark:text-zinc-300">Responsável:</span>{' '}
                                                        {b.user.name}
                                                    </p>
                                                </div>
                                                {(canManageRooms || (canSchedule && b.is_mine)) && (
                                                    <div className="flex shrink-0 gap-1">
                                                        <button
                                                            type="button"
                                                            onClick={() => openEdit(b)}
                                                            className="rounded-lg p-2 text-zinc-600 hover:bg-zinc-200 dark:hover:bg-zinc-800"
                                                            aria-label="Editar"
                                                        >
                                                            <PencilSquareIcon className="h-5 w-5" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => deleteBooking(b)}
                                                            className="rounded-lg p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                                                            aria-label="Remover"
                                                        >
                                                            <TrashIcon className="h-5 w-5" />
                                                        </button>
                                                    </div>
                                                )}
                                            </li>
                                        ))}
                                    </ul>
                                </Card>
                            ))}
                        {groupedByDay.size === 0 && (
                            <Card className="p-8 text-center text-sm text-zinc-500">Nenhum agendamento neste período.</Card>
                        )}
                    </div>
                )}
            </div>

            <Modal show={modalOpen} onClose={closeModal} maxWidth="lg">
                <form onSubmit={submit} className="p-6">
                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">{editing ? 'Editar agendamento' : 'Novo agendamento'}</h2>
                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                        {editing ? (
                            <>
                                <span className="font-medium text-zinc-600 dark:text-zinc-300">Responsável:</span> {editing.user.name}
                            </>
                        ) : (
                            'O responsável será o seu nome de usuário (quem cria o agendamento).'
                        )}
                    </p>
                    <div className="mt-4 space-y-4">
                        <div>
                            <InputLabel value="Sala" />
                            <SelectInput
                                value={data.room_id === '' ? '' : String(data.room_id)}
                                onChange={(e) => setData('room_id', e.target.value === '' ? '' : Number(e.target.value))}
                                className="mt-1"
                                required
                            >
                                <option value="">Selecione…</option>
                                {rooms.map((r) => (
                                    <option key={r.id} value={r.id}>
                                        {r.name}
                                        {r.floor ? ` (${FLOOR_LABEL[r.floor] ?? r.floor})` : ''}
                                    </option>
                                ))}
                            </SelectInput>
                            <InputError message={errors.room_id} className="mt-1" />
                        </div>
                        <div>
                            <InputLabel htmlFor="title" value="Título / motivo" />
                            <TextInput
                                id="title"
                                value={data.title}
                                className="mt-1 block w-full"
                                onChange={(e) => setData('title', e.target.value)}
                                required
                            />
                            <InputError message={errors.title} className="mt-1" />
                        </div>
                        <div>
                            <InputLabel htmlFor="notes" value="Notas (opcional)" />
                            <textarea
                                id="notes"
                                value={data.notes}
                                onChange={(e) => setData('notes', e.target.value)}
                                rows={2}
                                className="mt-1 block w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                            />
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                                <InputLabel htmlFor="starts_at" value="Início" />
                                <input
                                    id="starts_at"
                                    type="datetime-local"
                                    value={data.starts_at}
                                    onChange={(e) => setData('starts_at', e.target.value)}
                                    className="mt-1 block w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                                    required
                                />
                                <InputError message={errors.starts_at} className="mt-1" />
                            </div>
                            <div>
                                <InputLabel htmlFor="ends_at" value="Fim" />
                                <input
                                    id="ends_at"
                                    type="datetime-local"
                                    value={data.ends_at}
                                    onChange={(e) => setData('ends_at', e.target.value)}
                                    className="mt-1 block w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                                    required
                                />
                                <InputError message={errors.ends_at} className="mt-1" />
                            </div>
                        </div>
                    </div>
                    <div className="mt-6 flex justify-end gap-2">
                        <SecondaryButton type="button" onClick={closeModal}>
                            Cancelar
                        </SecondaryButton>
                        <PrimaryButton type="submit" disabled={processing}>
                            Salvar
                        </PrimaryButton>
                    </div>
                </form>
            </Modal>
        </AdminLayout>
    );
}
