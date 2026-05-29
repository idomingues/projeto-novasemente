import { router } from '@inertiajs/react';
import { useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState, forwardRef } from 'react';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import SelectInput from '@/Components/SelectInput';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import InputError from '@/Components/InputError';
import Modal from '@/Components/Modal';
import { inertiaListModalSave } from '@/utils/inertiaListModalSave';
import Textarea from '@/Components/Textarea';
import {
    ChevronLeftIcon,
    ChevronRightIcon,
    EyeIcon,
    PencilIcon,
    PlusIcon,
    TrashIcon,
    VideoCameraIcon,
} from '@heroicons/react/24/outline';
import {
    dayjs,
    formatAgendaTimezoneLine,
    weekCalendarRangeTitle,
} from '@/utils/pastoralWeeklyMaterializedSlots';

export type ScheduleRow = {
    [key: string]: string | number;
    weekday: number;
    start: string;
    end: string;
    modality: string;
};

const WEEKDAY_OPTS: { v: number; label: string; short: string }[] = [
    { v: 1, label: 'Segunda-feira', short: 'Seg' },
    { v: 2, label: 'Terça-feira', short: 'Ter' },
    { v: 3, label: 'Quarta-feira', short: 'Qua' },
    { v: 4, label: 'Quinta-feira', short: 'Qui' },
    { v: 5, label: 'Sexta-feira', short: 'Sex' },
    { v: 6, label: 'Sábado', short: 'Sáb' },
    { v: 7, label: 'Domingo', short: 'Dom' },
];

const MODALITY_OPTS: { v: string; label: string; short: string }[] = [
    { v: 'presential', label: 'Só presencial', short: 'Presencial' },
    { v: 'online', label: 'Só online', short: 'Online' },
    { v: 'both', label: 'Presencial ou online (o membro escolhe)', short: 'Pres. ou online' },
];

function modalityShort(modality: string): string {
    return MODALITY_OPTS.find((o) => o.v === modality)?.short ?? modality;
}

/** Preferência indicada pelo membro ao pedir o horário (presencial / online). */
function memberBookingModalityLabel(m: string | null | undefined): string {
    if (m === 'presential') {
        return 'Presencial';
    }
    if (m === 'online') {
        return 'Online';
    }
    return '';
}

function slotStartEndFromRange(rangeShort: string): { start: string; end: string } {
    const sep = ' — ';
    const idx = rangeShort.indexOf(sep);
    if (idx === -1) {
        return { start: rangeShort.trim(), end: '' };
    }
    return {
        start: rangeShort.slice(0, idx).trim(),
        end: rangeShort.slice(idx + sep.length).trim(),
    };
}

/** Ícone de «online» quando o bloco é só online ou o membro pediu online (incl. em bloco «ambos»). */
function slotShowsOnlineIndicator(
    slotModality: string,
    booking: PastoralAppointmentSlotMatch | undefined,
    isBooked: boolean,
): boolean {
    if (slotModality === 'online') {
        return true;
    }
    if (isBooked && booking?.preferredModality === 'online') {
        return true;
    }
    return false;
}

type AgendaSlotModel = {
    id: number;
    dateKey: string;
    slotStartKey: string;
    value: string;
    rangeShort: string;
    modality: string;
    note?: string | null;
    bookableByMembers: boolean;
};

function PastoralAvailabilitySlotCard({
    slot,
    booking,
    timezone,
    nowTz,
    saving,
    onEdit,
    onDelete,
    onOpenBookingDetails,
    variant = 'compact',
}: {
    slot: AgendaSlotModel;
    booking?: PastoralAppointmentSlotMatch;
    timezone: string;
    nowTz: dayjs.Dayjs;
    saving: boolean;
    onEdit: () => void;
    onDelete: () => void;
    onOpenBookingDetails: (b: PastoralAppointmentSlotMatch) => void;
    variant?: 'compact' | 'comfortable';
}) {
    const booked =
        booking &&
        (booking.status === 'pending' || booking.status === 'confirmed' || booking.status === 'completed');

    const slotStartMoment = dayjs.tz(slot.slotStartKey, timezone);
    const isPastForBooking = slotStartMoment.isBefore(nowTz);

    const title = modalityShort(slot.modality);
    const { start: rangeStart, end: rangeEnd } = slotStartEndFromRange(slot.rangeShort);
    const showsOnlineIcon = slotShowsOnlineIndicator(slot.modality, booking, Boolean(booked));

    const cardClass = booked
        ? 'border-l-4 border-l-amber-500 bg-amber-50/95 dark:border-l-amber-400 dark:bg-amber-950/35'
        : isPastForBooking
          ? 'border-l-4 border-l-zinc-400 bg-zinc-100/90 dark:border-l-zinc-500 dark:bg-zinc-900/60'
          : 'border-l-4 border-l-emerald-600 bg-emerald-50/95 dark:border-l-emerald-500 dark:bg-emerald-950/30';
    const timeClass = booked
        ? 'text-amber-950 dark:text-amber-100'
        : isPastForBooking
          ? 'text-zinc-700 dark:text-zinc-300'
          : 'text-emerald-950 dark:text-emerald-100';
    const titleClass = booked
        ? 'text-amber-950 dark:text-amber-50'
        : isPastForBooking
          ? 'text-zinc-700 dark:text-zinc-300'
          : 'text-emerald-950 dark:text-emerald-50';

    const pad = variant === 'comfortable' ? 'p-3.5' : 'p-2.5';
    const startTimeClass =
        variant === 'comfortable' ? 'text-2xl font-bold tabular-nums tracking-tight' : 'text-lg font-bold tabular-nums tracking-tight';
    const endTimeClass = variant === 'comfortable' ? 'text-sm font-medium tabular-nums' : 'text-[11px] font-medium tabular-nums';
    const iconWrap = variant === 'comfortable' ? 'rounded-xl p-2' : 'rounded p-1';
    const iconSz = variant === 'comfortable' ? 'h-5 w-5' : 'h-3.5 w-3.5';
    const videoIconClass = variant === 'comfortable' ? 'h-5 w-5 shrink-0 text-sky-600 dark:text-sky-400' : 'h-4 w-4 shrink-0 text-sky-600 dark:text-sky-400';

    return (
        <div className={`rounded-xl shadow-sm ring-1 ring-black/5 dark:ring-white/10 ${pad} ${cardClass}`}>
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                    <p
                        className={`text-[10px] font-semibold uppercase tracking-wide opacity-80 ${timeClass} ${
                            variant === 'comfortable' ? 'sm:text-[11px]' : ''
                        }`}
                    >
                        Início
                    </p>
                    <p className={`${startTimeClass} leading-none ${timeClass}`}>{rangeStart}</p>
                    {rangeEnd ? (
                        <p className={`mt-1 ${endTimeClass} ${timeClass} opacity-75`}>
                            <span className="sr-only">Fim às </span>até {rangeEnd}
                        </p>
                    ) : null}
                </div>
                <div className="flex shrink-0 gap-1">
                    <button
                        type="button"
                        disabled={saving}
                        onClick={onEdit}
                        className={`${iconWrap} text-zinc-500 transition hover:bg-white/60 hover:text-zinc-900 disabled:opacity-40 dark:hover:bg-zinc-800/80 dark:hover:text-white`}
                        title="Editar"
                        aria-label="Editar"
                    >
                        <PencilIcon className={iconSz} />
                    </button>
                    <button
                        type="button"
                        disabled={saving}
                        onClick={onDelete}
                        className={`${iconWrap} text-zinc-500 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-40 dark:hover:bg-red-950/50 dark:hover:text-red-400`}
                        title="Remover"
                        aria-label="Remover"
                    >
                        <TrashIcon className={iconSz} />
                    </button>
                </div>
            </div>
            <div className={`mt-2 flex min-w-0 items-center gap-1.5 ${titleClass}`}>
                {showsOnlineIcon ? (
                    <span
                        className="inline-flex shrink-0"
                        title="Online / videoconferência"
                        aria-label="Online / videoconferência"
                    >
                        <VideoCameraIcon className={videoIconClass} aria-hidden />
                    </span>
                ) : null}
                <p
                    className={`min-w-0 truncate font-semibold leading-snug ${
                        variant === 'comfortable' ? 'text-sm sm:text-base' : 'text-[11px] sm:text-xs'
                    }`}
                >
                    {title}
                </p>
            </div>
            {!slot.bookableByMembers ? (
                <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-wide text-violet-700 dark:text-violet-300">
                    Só na sua agenda · não aparece para marcação na app
                </p>
            ) : null}
            {slot.note ? (
                <p className="mt-1.5 text-xs leading-snug text-zinc-600 dark:text-zinc-400">
                    <span className="font-medium text-zinc-700 dark:text-zinc-300">Nota:</span> {slot.note}
                </p>
            ) : null}
            {!booked && isPastForBooking ? (
                <p className="mt-2 text-[11px] font-medium leading-snug text-zinc-600 dark:text-zinc-400">
                    Início já passado — não aparece em «Agendar com pastor».
                </p>
            ) : null}
            {booked && booking ? (
                <div className="mt-2.5 space-y-2 rounded-lg border border-amber-300/70 bg-white/85 p-2 dark:border-amber-700/50 dark:bg-amber-950/35">
                    <div className="min-w-0">
                        <p
                            className={`truncate font-bold leading-tight text-amber-950 dark:text-amber-50 ${
                                variant === 'comfortable' ? 'text-base sm:text-lg' : 'text-sm'
                            }`}
                        >
                            {booking.requesterLabel}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                            <span
                                className={`inline-flex shrink-0 rounded-full bg-amber-200/90 px-2 py-0.5 font-bold text-amber-950 dark:bg-amber-800 dark:text-amber-50 ${
                                    variant === 'comfortable' ? 'text-[11px]' : 'text-[10px]'
                                }`}
                            >
                                {booking.statusLabel}
                            </span>
                            {memberBookingModalityLabel(booking.preferredModality) &&
                            booking.preferredModality !== 'online' ? (
                                <span
                                    className={`text-amber-900/90 dark:text-amber-100/90 ${
                                        variant === 'comfortable' ? 'text-xs' : 'text-[10px]'
                                    }`}
                                >
                                    {memberBookingModalityLabel(booking.preferredModality)}
                                </span>
                            ) : null}
                        </div>
                    </div>
                    <button
                        type="button"
                        disabled={saving}
                        onClick={() => onOpenBookingDetails(booking)}
                        className={`flex w-full items-center justify-center gap-1.5 rounded-lg border border-amber-400/80 bg-amber-100/90 py-1.5 font-semibold text-amber-950 transition hover:bg-amber-200/90 disabled:opacity-50 dark:border-amber-600 dark:bg-amber-900/50 dark:text-amber-50 dark:hover:bg-amber-800/60 ${
                            variant === 'comfortable' ? 'text-sm' : 'text-[11px]'
                        }`}
                    >
                        <EyeIcon className={variant === 'comfortable' ? 'h-4 w-4 shrink-0' : 'h-3.5 w-3.5 shrink-0'} />
                        {variant === 'comfortable' ? 'Assunto e observações' : 'Detalhes'}
                    </button>
                </div>
            ) : null}
        </div>
    );
}

function emptyDraft(defaults: Partial<ScheduleRow>): ScheduleRow {
    return {
        weekday: typeof defaults.weekday === 'number' ? defaults.weekday : 3,
        start: typeof defaults.start === 'string' ? defaults.start : '09:00',
        end: typeof defaults.end === 'string' ? defaults.end : '10:00',
        modality: typeof defaults.modality === 'string' ? defaults.modality : 'both',
    };
}

// (sem helper aqui) — a data default é escolhida no openAdd()

export type PastoralAppointmentSlotMatch = {
    /** Pedido na tabela `pastoral_appointments` ou «visita aos pastores» (`church_solicitations`). */
    source?: 'pastoral_appointment' | 'church_solicitation';
    appointmentId: number;
    slotStartKey: string | null;
    /** ISO8601 no fuso da agenda (lista de compromissos). */
    startAt?: string | null;
    /** Texto curto para a lista (ex.: dd/mm/aaaa · HH:mm). */
    startLabel?: string | null;
    requesterLabel: string;
    status: string;
    statusLabel: string;
    subject?: string | null;
    notes?: string | null;
    preferredModality?: string | null;
};

export type PastoralWeeklyScheduleEditorProps = {
    initialRows: ScheduleRow[];
    serverScheduleVersion: string;
    addRowDefaults?: Partial<Pick<ScheduleRow, 'weekday' | 'start' | 'end' | 'modality'>>;
    timezone: string;
    scheduleAnchorIso: string;
    pastoralAppointments?: PastoralAppointmentSlotMatch[];
    availabilities: {
        id: number;
        date: string;
        start: string;
        end: string;
        modality: string;
        note?: string | null;
        bookable_by_members?: boolean;
    }[];
    availabilityStoreUrl: string;
    availabilityUpdateUrlTemplate: string;
    availabilityDestroyUrlTemplate: string;
};

export type PastoralWeeklyScheduleEditorHandle = {
    openAdd: () => void;
};

const PastoralWeeklyScheduleEditor = forwardRef<PastoralWeeklyScheduleEditorHandle, PastoralWeeklyScheduleEditorProps>(
    function PastoralWeeklyScheduleEditor(
        {
            initialRows,
            serverScheduleVersion,
            addRowDefaults = { weekday: 3, start: '09:00', end: '10:00', modality: 'both' },
            timezone,
            scheduleAnchorIso,
            pastoralAppointments = [],
            availabilities,
            availabilityStoreUrl,
            availabilityUpdateUrlTemplate,
            availabilityDestroyUrlTemplate,
        },
        ref,
    ) {
        const [rows, setRows] = useState<ScheduleRow[]>(initialRows);
        const [saving, setSaving] = useState(false);
        const [errors, setErrors] = useState<Record<string, string>>({});
        const availabilityListRef = useRef(availabilities);
        availabilityListRef.current = availabilities;

        useEffect(() => {
            setRows(initialRows);
            // eslint-disable-next-line react-hooks/exhaustive-deps -- só após salvar no servidor
        }, [serverScheduleVersion]);

        const [weekMondayDate, setWeekMondayDate] = useState(() =>
            dayjs().tz(timezone).startOf('isoWeek').format('YYYY-MM-DD'),
        );

        useEffect(() => {
            setWeekMondayDate(dayjs().tz(timezone).startOf('isoWeek').format('YYYY-MM-DD'));
        }, [timezone]);

        const [modalOpen, setModalOpen] = useState(false);
        const [editingAvailabilityId, setEditingAvailabilityId] = useState<number | null>(null);
        const [draft, setDraft] = useState<ScheduleRow>(() => emptyDraft(addRowDefaults));
        const [draftError, setDraftError] = useState<string | null>(null);
        const [draftDate, setDraftDate] = useState<string>(() => dayjs().tz(timezone).format('YYYY-MM-DD'));
        const [draftNote, setDraftNote] = useState('');
        const [draftBookable, setDraftBookable] = useState(true);

        const [bookingDetailOpen, setBookingDetailOpen] = useState(false);
        const [bookingDetail, setBookingDetail] = useState<PastoralAppointmentSlotMatch | null>(null);
        const [bookingDetailSubtitle, setBookingDetailSubtitle] = useState('');

        const openBookingDetails = useCallback(
            (booking: PastoralAppointmentSlotMatch, slot: AgendaSlotModel) => {
                const when = dayjs.tz(slot.dateKey, timezone).locale('pt').format('dddd, D [de] MMMM');
                setBookingDetailSubtitle(`${when} · ${slot.rangeShort}`);
                setBookingDetail(booking);
                setBookingDetailOpen(true);
            },
            [timezone],
        );

        const closeBookingDetails = useCallback(() => {
            setBookingDetailOpen(false);
            setBookingDetail(null);
            setBookingDetailSubtitle('');
        }, []);

        const weekStart = useMemo(
            () => dayjs.tz(weekMondayDate, timezone).startOf('day'),
            [weekMondayDate, timezone],
        );

        const slots = useMemo(() => {
            // A partir das disponibilidades por dia (não recorrente).
            return availabilities
                .map((a) => {
                    const startKey = `${a.date} ${a.start}`;
                    const startIso = dayjs.tz(startKey, timezone).toISOString();
                    const endIso = dayjs.tz(`${a.date} ${a.end}`, timezone).toISOString();
                    const rangeShort = `${a.start} — ${a.end}`;
                    return {
                        id: a.id,
                        dateKey: a.date,
                        slotStartKey: startKey,
                        value: startIso,
                        endIso,
                        rangeShort,
                        modality: a.modality ?? 'both',
                        note: a.note ?? null,
                        bookableByMembers: a.bookable_by_members !== false,
                    };
                })
                .sort((x, y) => (x.value < y.value ? -1 : 1));
        }, [availabilities, timezone]);

        const slotsByDate = useMemo(() => {
            const m = new Map<string, typeof slots>();
            for (const s of slots) {
                const list = m.get(s.dateKey);
                if (list) list.push(s);
                else m.set(s.dateKey, [s]);
            }
            return m;
        }, [slots]);

        const bookingBySlotKey = useMemo(() => {
            const m = new Map<string, PastoralAppointmentSlotMatch>();
            for (const a of pastoralAppointments) {
                if (a.slotStartKey) {
                    m.set(a.slotStartKey, a);
                }
            }
            return m;
        }, [pastoralAppointments]);

        const putAvailability = useCallback(
            (
                url: string,
                payload: {
                    date: string;
                    start: string;
                    end: string;
                    modality: string;
                    note: string | null;
                    bookable_by_members: boolean;
                },
            ) => {
                setSaving(true);
                setErrors({});
                router.put(url, payload, {
                    ...inertiaListModalSave,
                    onFinish: () => setSaving(false),
                    onError: (errs) => setErrors(errs as Record<string, string>),
                });
            },
            [],
        );

        const postAvailability = useCallback(
            (payload: {
                date: string;
                start: string;
                end: string;
                modality: string;
                note: string | null;
                bookable_by_members: boolean;
            }) => {
                setSaving(true);
                setErrors({});
                router.post(availabilityStoreUrl, payload, {
                    ...inertiaListModalSave,
                    onFinish: () => setSaving(false),
                    onError: (errs) => setErrors(errs as Record<string, string>),
                });
            },
            [availabilityStoreUrl],
        );

        const deleteAvailability = useCallback(
            (id: number) => {
                const url = availabilityDestroyUrlTemplate.replace('__AVAILABILITY__', String(id));
                setSaving(true);
                setErrors({});
                router.delete(url, {
                    preserveScroll: true,
                    onFinish: () => setSaving(false),
                    onError: (errs) => setErrors(errs as Record<string, string>),
                });
            },
            [availabilityDestroyUrlTemplate],
        );

        const openAdd = useCallback(() => {
            if (saving) return;
            setEditingAvailabilityId(null);
            setDraft(emptyDraft(addRowDefaults));
            const ws = dayjs.tz(weekMondayDate, timezone).startOf('day');
            const today = dayjs().tz(timezone);
            const isSameWeek = today.startOf('isoWeek').isSame(ws, 'day');
            setDraftDate((isSameWeek ? today : ws).format('YYYY-MM-DD'));
            setDraftNote('');
            setDraftBookable(true);
            setDraftError(null);
            setModalOpen(true);
        }, [addRowDefaults, saving, timezone, weekMondayDate]);

        const openAddForDay = useCallback(
            (dateKey: string) => {
                if (saving) return;
                setEditingAvailabilityId(null);
                setDraft(emptyDraft(addRowDefaults));
                setDraftDate(dateKey);
                setDraftNote('');
                setDraftBookable(true);
                setDraftError(null);
                setModalOpen(true);
            },
            [addRowDefaults, saving],
        );

        useImperativeHandle(ref, () => ({ openAdd }), [openAdd]);

        const openEditAvailability = (id: number) => {
            if (saving) return;
            const a = availabilityListRef.current.find((x) => x.id === id);
            if (!a) return;
            setEditingAvailabilityId(id);
            setDraft({
                weekday: 1,
                start: a.start,
                end: a.end,
                modality: a.modality ?? 'both',
            });
            setDraftDate(a.date);
            setDraftNote(typeof a.note === 'string' ? a.note : '');
            setDraftBookable(a.bookable_by_members !== false);
            setDraftError(null);
            setModalOpen(true);
        };

        const closeModal = () => {
            setModalOpen(false);
            setDraftError(null);
        };

        const applyDraft = () => {
            const startMin = timeToMinutes(String(draft.start));
            const endMin = timeToMinutes(String(draft.end));
            if (endMin <= startMin) {
                setDraftError('A hora de fim tem de ser depois da hora de início.');
                return;
            }
            setDraftError(null);
            const noteTrim = draftNote.trim();
            const payload = {
                date: String(draftDate),
                start: String(draft.start),
                end: String(draft.end),
                modality: String(draft.modality ?? 'both'),
                note: noteTrim === '' ? null : noteTrim,
                bookable_by_members: draftBookable,
            };

            if (editingAvailabilityId !== null) {
                const url = availabilityUpdateUrlTemplate.replace('__AVAILABILITY__', String(editingAvailabilityId));
                putAvailability(url, payload);
            } else {
                postAvailability(payload);
            }
        };

        const weeklyScheduleError =
            errors.weekly_schedule || errors.date || errors.start || errors.end || errors.modality || errors.note;
        const rowError = (_idx: number) => undefined;

        const weekTitle = weekCalendarRangeTitle(weekStart, timezone);
        const tzLine = formatAgendaTimezoneLine(timezone);
        const today = dayjs().tz(timezone).format('YYYY-MM-DD');
        const nowTz = dayjs().tz(timezone);

        const goPrevWeek = () => {
            setWeekMondayDate((d) => dayjs.tz(d, timezone).subtract(7, 'day').format('YYYY-MM-DD'));
        };

        const goNextWeek = () => {
            setWeekMondayDate((d) => dayjs.tz(d, timezone).add(7, 'day').format('YYYY-MM-DD'));
        };

        const goThisWeek = () => {
            setWeekMondayDate(dayjs().tz(timezone).startOf('isoWeek').format('YYYY-MM-DD'));
        };

        const dayColumns = useMemo(() => {
            return Array.from({ length: 7 }, (_, i) => {
                const d = weekStart.add(i, 'day').locale('pt');
                const dateKey = d.format('YYYY-MM-DD');
                const dow = d.isoWeekday();
                const short = (WEEKDAY_OPTS.find((o) => o.v === dow)?.short ?? '').toUpperCase();
                const weekdayLabel = WEEKDAY_OPTS.find((o) => o.v === dow)?.label ?? '';
                const dateHuman = d.format('D [de] MMMM');
                const isToday = dateKey === today;
                const isSunday = dow === 7;
                const dayNum = d.format('D');
                return { dateKey, short, dayNum, isToday, isSunday, weekdayLabel, dateHuman };
            });
        }, [weekStart, today]);

        return (
            <>
                <div className="w-full space-y-5 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-none sm:p-6 lg:p-8">
                    <div className="flex flex-col gap-4 border-b border-zinc-200 pb-4 dark:border-zinc-700 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0 flex-1 space-y-1">
                            <h2 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-white">{weekTitle}</h2>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">{tzLine}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                            <button
                                type="button"
                                onClick={goPrevWeek}
                                className="rounded-xl border border-zinc-200 bg-white p-2.5 text-zinc-700 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                                aria-label="Semana anterior"
                            >
                                <ChevronLeftIcon className="h-5 w-5" />
                            </button>
                            <button
                                type="button"
                                onClick={goThisWeek}
                                className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-800 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
                            >
                                Hoje
                            </button>
                            <button
                                type="button"
                                onClick={goNextWeek}
                                className="rounded-xl border border-zinc-200 bg-white p-2.5 text-zinc-700 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                                aria-label="Semana seguinte"
                            >
                                <ChevronRightIcon className="h-5 w-5" />
                            </button>
                        </div>
                    </div>

                    {saving ? (
                        <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400" aria-live="polite">
                            A salvar…
                        </p>
                    ) : null}

                    <InputError message={weeklyScheduleError} className="mt-1" />

                    {availabilities.length === 0 ? (
                        <p className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50/80 px-3 py-2.5 text-center text-xs text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-400">
                            Ainda não há blocos nesta semana. Use o botão <span className="font-semibold text-zinc-900 dark:text-white">+</span>{' '}
                            no topo ou o <span className="font-semibold">+</span>{' '}
                            <span className="md:hidden">à direita de cada dia</span>
                            <span className="hidden md:inline">em cada coluna</span>.
                        </p>
                    ) : null}

                    <div className="space-y-4 md:hidden">
                        <p className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                            Lista da semana (segunda a domingo). Toque num horário para editar ou remover.
                        </p>
                        {dayColumns.map(({ dateKey, short, weekdayLabel, dateHuman, isToday, isSunday }) => {
                            const columnSlots = slotsByDate.get(dateKey) ?? [];
                            return (
                                <section
                                    key={dateKey}
                                    className={`overflow-hidden rounded-2xl border bg-white dark:bg-zinc-900/40 ${
                                        isToday
                                            ? 'border-emerald-400/70 shadow-md shadow-emerald-900/10 ring-1 ring-emerald-500/15 dark:border-emerald-500/40'
                                            : 'border-zinc-200 dark:border-zinc-700'
                                    }`}
                                >
                                    <div className="flex items-start justify-between gap-3 border-b border-zinc-100 bg-zinc-50/90 px-4 py-3.5 dark:border-zinc-800 dark:bg-zinc-900/80">
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                                                    {short}
                                                </p>
                                                {isToday ? (
                                                    <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200">
                                                        Hoje
                                                    </span>
                                                ) : null}
                                            </div>
                                            <p
                                                className={`mt-0.5 text-base font-bold leading-tight ${
                                                    isToday
                                                        ? 'text-emerald-600 dark:text-emerald-400'
                                                        : isSunday
                                                          ? 'text-red-600 dark:text-red-400'
                                                          : 'text-zinc-900 dark:text-white'
                                                }`}
                                            >
                                                {weekdayLabel}
                                            </p>
                                            <p className="text-sm font-medium capitalize text-zinc-600 dark:text-zinc-300">{dateHuman}</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => openAddForDay(dateKey)}
                                            disabled={saving}
                                            title="Adicionar neste dia"
                                            aria-label={`Adicionar disponibilidade em ${dateKey}`}
                                            className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-white text-emerald-600 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50 active:scale-95 disabled:pointer-events-none disabled:opacity-40 dark:border-zinc-600 dark:bg-zinc-800 dark:text-emerald-400 dark:hover:border-emerald-500/50 dark:hover:bg-emerald-950/40"
                                        >
                                            <PlusIcon className="h-5 w-5" strokeWidth={2} aria-hidden />
                                        </button>
                                    </div>
                                    <div className="space-y-2.5 p-3.5">
                                        {columnSlots.length === 0 ? (
                                            <p className="rounded-xl bg-zinc-50 py-6 text-center text-sm text-zinc-500 dark:bg-zinc-800/50 dark:text-zinc-400">
                                                Sem horários neste dia
                                            </p>
                                        ) : (
                                            columnSlots.map((slot) => {
                                                const booking = bookingBySlotKey.get(slot.slotStartKey);
                                                return (
                                                    <PastoralAvailabilitySlotCard
                                                        key={slot.value}
                                                        slot={slot}
                                                        booking={booking}
                                                        timezone={timezone}
                                                        nowTz={nowTz}
                                                        saving={saving}
                                                        onEdit={() => openEditAvailability(slot.id)}
                                                        onDelete={() => deleteAvailability(slot.id)}
                                                        onOpenBookingDetails={(b) => openBookingDetails(b, slot)}
                                                        variant="comfortable"
                                                    />
                                                );
                                            })
                                        )}
                                    </div>
                                </section>
                            );
                        })}
                    </div>

                    <div className="-mx-1 hidden overflow-x-auto pb-1 md:block">
                        <div className="grid min-w-[720px] grid-cols-7 gap-2 md:gap-3">
                            {dayColumns.map(({ dateKey, short, dayNum, isToday, isSunday }) => {
                                const columnSlots = slotsByDate.get(dateKey) ?? [];
                                return (
                                    <div
                                        key={dateKey}
                                        className="flex min-h-[12rem] flex-col rounded-xl border border-zinc-200 bg-zinc-50/60 dark:border-zinc-700 dark:bg-zinc-950/50"
                                    >
                                        <div className="border-b border-zinc-200 px-2 py-2 text-center dark:border-zinc-700">
                                            <p className="text-[11px] font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                                                {short}
                                            </p>
                                            <p
                                                className={`text-lg font-bold tabular-nums ${
                                                    isToday
                                                        ? 'text-emerald-600 dark:text-emerald-400'
                                                        : isSunday
                                                          ? 'text-red-600 dark:text-red-400'
                                                          : 'text-zinc-900 dark:text-white'
                                                }`}
                                            >
                                                {dayNum}
                                            </p>
                                        </div>
                                        <div className="flex min-h-0 flex-1 flex-col gap-2 p-2">
                                            <div className="flex min-h-[3rem] flex-1 flex-col gap-2">
                                                {columnSlots.map((slot) => {
                                                    const booking = bookingBySlotKey.get(slot.slotStartKey);
                                                    return (
                                                        <PastoralAvailabilitySlotCard
                                                            key={slot.value}
                                                            slot={slot}
                                                            booking={booking}
                                                            timezone={timezone}
                                                            nowTz={nowTz}
                                                            saving={saving}
                                                            onEdit={() => openEditAvailability(slot.id)}
                                                            onDelete={() => deleteAvailability(slot.id)}
                                                            onOpenBookingDetails={(b) => openBookingDetails(b, slot)}
                                                            variant="compact"
                                                        />
                                                    );
                                                })}
                                            </div>
                                            <div className="mt-auto flex shrink-0 justify-end pt-0.5">
                                                <button
                                                    type="button"
                                                    onClick={() => openAddForDay(dateKey)}
                                                    disabled={saving}
                                                    title="Adicionar neste dia"
                                                    aria-label={`Adicionar disponibilidade em ${dateKey}`}
                                                    className="rounded-md p-1 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-600 disabled:pointer-events-none disabled:opacity-40 dark:text-zinc-500 dark:hover:bg-zinc-800/80 dark:hover:text-zinc-200"
                                                >
                                                    <PlusIcon className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <Modal
                    show={modalOpen}
                    onClose={closeModal}
                    maxWidth="md"
                    footer={
                        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                            <SecondaryButton type="button" onClick={closeModal} disabled={saving}>
                                Cancelar
                            </SecondaryButton>
                            <PrimaryButton type="button" onClick={applyDraft} disabled={saving}>
                                {editingAvailabilityId === null ? 'Adicionar' : 'Salvar alteração'}
                            </PrimaryButton>
                        </div>
                    }
                >
                    <div className="p-6 pt-12 sm:p-8 sm:pt-10">
                        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
                            {editingAvailabilityId === null ? 'Nova disponibilidade' : 'Editar disponibilidade'}
                        </h2>
                        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                            Indique a <span className="font-medium text-zinc-700 dark:text-zinc-200">data</span> e o{' '}
                            <span className="font-medium text-zinc-700 dark:text-zinc-200">horário de início e fim</span> que quiser
                            (qualquer combinação válida — útil após um contato informal). Só os blocos com início futuro e com
                            «disponível na app» ligado aparecem para os membros marcarem. Ao confirmar, a agenda guarda-se
                            automaticamente.
                        </p>

                        <div className="mt-6 space-y-4">
                            <div>
                                <InputLabel htmlFor="pastoral_draft_date" value="Data" />
                                <TextInput
                                    id="pastoral_draft_date"
                                    type="date"
                                    className="mt-1 block w-full"
                                    value={String(draftDate)}
                                    disabled={saving}
                                    onChange={(e) => setDraftDate(e.target.value)}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <InputLabel htmlFor="pastoral_draft_start" value="Início" />
                                    <TextInput
                                        id="pastoral_draft_start"
                                        type="time"
                                        step={60}
                                        className="mt-1 block w-full"
                                        value={String(draft.start)}
                                        disabled={saving}
                                        onChange={(e) => setDraft((d) => ({ ...d, start: e.target.value }))}
                                    />
                                </div>
                                <div>
                                    <InputLabel htmlFor="pastoral_draft_end" value="Fim" />
                                    <TextInput
                                        id="pastoral_draft_end"
                                        type="time"
                                        step={60}
                                        className="mt-1 block w-full"
                                        value={String(draft.end)}
                                        disabled={saving}
                                        onChange={(e) => setDraft((d) => ({ ...d, end: e.target.value }))}
                                    />
                                </div>
                            </div>
                            <div>
                                <InputLabel htmlFor="pastoral_draft_modality" value="Modalidade" />
                                <SelectInput
                                    id="pastoral_draft_modality"
                                    className="mt-1"
                                    value={String(draft.modality)}
                                    disabled={saving}
                                    onChange={(e) => setDraft((d) => ({ ...d, modality: e.target.value }))}
                                >
                                    {MODALITY_OPTS.map((o) => (
                                        <option key={o.v} value={o.v}>
                                            {o.label}
                                        </option>
                                    ))}
                                </SelectInput>
                            </div>
                            <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-3 dark:border-zinc-700 dark:bg-zinc-800/40">
                                <label className="flex cursor-pointer items-start gap-3">
                                    <input
                                        id="pastoral_draft_bookable"
                                        type="checkbox"
                                        className="mt-1 h-4 w-4 shrink-0 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500 dark:border-zinc-600 dark:bg-zinc-900"
                                        checked={draftBookable}
                                        disabled={saving}
                                        onChange={(e) => setDraftBookable(e.target.checked)}
                                    />
                                    <span className="text-sm leading-snug text-zinc-700 dark:text-zinc-200">
                                        <span className="font-semibold text-zinc-900 dark:text-white">Disponível na app</span> para os
                                        membros escolherem este horário ao pedir marcação. Desligue para um registro só na sua agenda
                                        (ex.: compromisso já combinado por fora).
                                    </span>
                                </label>
                            </div>
                            <div>
                                <InputLabel htmlFor="pastoral_draft_note" value="Nome e observações (opcional)" />
                                <p className="mt-0.5 text-xs leading-snug text-zinc-500 dark:text-zinc-400">
                                    Para horários só na sua agenda, pode anotar o <span className="font-medium">nome</span> da pessoa e
                                    outras <span className="font-medium">observações</span> — só vê aqui, os membros não veem este
                                    texto.
                                </p>
                                <Textarea
                                    id="pastoral_draft_note"
                                    rows={4}
                                    className="mt-2"
                                    value={draftNote}
                                    disabled={saving}
                                    onChange={(e) => setDraftNote(e.target.value)}
                                    placeholder="Ex.: João Silva — acompanhamento após culto"
                                />
                            </div>
                            {draftError ? <p className="text-sm text-red-600 dark:text-red-400">{draftError}</p> : null}
                        </div>
                    </div>
                </Modal>

                <Modal
                    show={bookingDetailOpen}
                    onClose={closeBookingDetails}
                    maxWidth="lg"
                    footer={
                        <div className="flex justify-end">
                            <SecondaryButton type="button" onClick={closeBookingDetails}>
                                Fechar
                            </SecondaryButton>
                        </div>
                    }
                >
                    <div className="p-6 pt-12 sm:p-8 sm:pt-10">
                        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Dados da marcação</h2>
                        {bookingDetailSubtitle ? (
                            <p className="mt-1 text-sm capitalize text-zinc-600 dark:text-zinc-300">{bookingDetailSubtitle}</p>
                        ) : null}
                        {bookingDetail ? (
                            <>
                                <dl className="mt-6 space-y-5 text-zinc-900 dark:text-zinc-100">
                                    <div>
                                        <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                                            Nome
                                        </dt>
                                        <dd className="mt-1.5 text-xl font-bold leading-snug text-zinc-950 dark:text-white">
                                            {bookingDetail.requesterLabel}
                                        </dd>
                                    </div>
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <div>
                                            <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                                                Estado
                                            </dt>
                                            <dd className="mt-1.5">
                                                <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-950 dark:bg-amber-900/60 dark:text-amber-100">
                                                    {bookingDetail.statusLabel}
                                                </span>
                                            </dd>
                                        </div>
                                        {memberBookingModalityLabel(bookingDetail.preferredModality) ? (
                                            <div>
                                                <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                                                    Preferência do membro
                                                </dt>
                                                <dd className="mt-1.5 text-sm font-medium text-zinc-800 dark:text-zinc-200">
                                                    {memberBookingModalityLabel(bookingDetail.preferredModality)}
                                                </dd>
                                            </div>
                                        ) : null}
                                    </div>
                                    {bookingDetail.subject ? (
                                        <div>
                                            <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                                                Assunto
                                            </dt>
                                            <dd className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-zinc-800 dark:text-zinc-200">
                                                {bookingDetail.subject}
                                            </dd>
                                        </div>
                                    ) : null}
                                    <div>
                                        <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                                            Observações / mensagem
                                        </dt>
                                        <dd className="mt-1.5">
                                            {bookingDetail.notes ? (
                                                <div className="max-h-72 overflow-y-auto whitespace-pre-wrap break-words rounded-xl border border-zinc-200 bg-zinc-50/80 p-3 text-sm leading-relaxed text-zinc-800 dark:border-zinc-600 dark:bg-zinc-800/50 dark:text-zinc-200">
                                                    {bookingDetail.notes}
                                                </div>
                                            ) : (
                                                <p className="text-sm italic text-zinc-500 dark:text-zinc-400">
                                                    O membro não deixou mensagem neste pedido.
                                                </p>
                                            )}
                                        </dd>
                                    </div>
                                </dl>
                                <p className="mt-6 text-xs text-zinc-400 dark:text-zinc-500">
                                    {bookingDetail.source === 'church_solicitation'
                                        ? `Pedido na app (visita aos pastores) n.º ${Math.abs(bookingDetail.appointmentId)}`
                                        : `Identificador interno do pedido: ${bookingDetail.appointmentId}`}
                                </p>
                            </>
                        ) : null}
                    </div>
                </Modal>
            </>
        );
    },
);

PastoralWeeklyScheduleEditor.displayName = 'PastoralWeeklyScheduleEditor';

export default PastoralWeeklyScheduleEditor;

function timeToMinutes(t: string): number {
    const [h, m] = t.split(':').map((x) => parseInt(x, 10));
    if (Number.isNaN(h) || Number.isNaN(m)) return 0;
    return h * 60 + m;
}
