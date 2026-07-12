import AdminLayout from '@/Layouts/AdminLayout';
import { Head, useForm, router, usePage } from '@inertiajs/react';
import {
    PencilIcon,
    TrashIcon,
    CalendarDaysIcon,
    ListBulletIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    MapPinIcon,
    ClockIcon,
    BanknotesIcon,
    PhotoIcon,
    TicketIcon,
    PowerIcon,
} from '@heroicons/react/24/outline';
import AddButton from '@/Components/AddButton';
import PageHeader from '@/Components/PageHeader';
import Card from '@/Components/Card';
import Modal from '@/Components/Modal';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import Textarea from '@/Components/Textarea';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import ListCardActionRow from '@/Components/ListCard/ListCardActionRow';
import ListCardIconActionButton from '@/Components/ListCard/ListCardIconActionButton';
import InputError from '@/Components/InputError';
import SelectInput from '@/Components/SelectInput';
import NewsPostCover from '@/Components/News/NewsPostCover';
import { EVENT_COVER_SPECS } from '@/constants/mediaCoverSpecs';
import { useState, FormEventHandler, useMemo } from 'react';
import { confirmAction } from '@/utils/confirmDialog';
import { inertiaListModalSave } from '@/utils/inertiaListModalSave';
import { GALLERY_IMAGE_ACCEPT } from '@/utils/mobilePhotoPick';

/** Cores sugeridas (hex) — complementam o código livre e o seletor nativo. */
const EVENT_COLOR_PRESETS = [
    '#2563EB',
    '#059669',
    '#DC2626',
    '#D97706',
    '#7C3AED',
    '#DB2777',
    '#0891B2',
    '#4F46E5',
    '#16A34A',
    '#EA580C',
    '#64748B',
    '#18181B',
] as const;

function normalizeHexColor(v: string | undefined | null): string {
    const t = (v ?? '').trim();
    if (!t) return '';
    const withHash = t.startsWith('#') ? t : `#${t}`;
    return withHash.toUpperCase();
}

function colorPickerSafeValue(hex: string): string {
    const n = normalizeHexColor(hex);
    return /^#[0-9A-F]{6}$/i.test(n) ? n : '#2563EB';
}

interface EventItem {
    id: number;
    title: string;
    description: string | null;
    starts_at: string;
    ends_at: string | null;
    published_at?: string | null;
    all_day: boolean;
    location: string | null;
    price: string | null;
    purchase_url: string | null;
    video_type: 'youtube' | 'instagram' | null;
    video_url: string | null;
    youtube_embed_url?: string | null;
    image_url: string | null;
    is_active: boolean;
    color: string | null;
}

type EventVideoType = '' | 'youtube' | 'instagram';

interface Props {
    events: EventItem[];
    eventsForMonth: EventItem[];
    month: number;
    year: number;
    canManage: boolean;
}

const WEEKDAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
const MONTH_NAMES = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

function imageSrc(url: string | null, appUrl: string): string {
    if (!url) return '';
    if (url.startsWith('/')) return `${appUrl}${url}`;
    return url;
}

/** Valor para input datetime-local no fuso do navegador (evita toISOString em UTC). */
function toDatetimeLocalString(d: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toDateInputValue(d: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const EVENT_TZ = 'America/Sao_Paulo';
const tzOpts = { timeZone: EVENT_TZ };

function formatTime(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', ...tzOpts });
}

function formatDate(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleDateString('pt-BR', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        ...tzOpts,
    });
}

function formatDateTime(iso: string, allDay: boolean): string {
    const d = new Date(iso);
    if (allDay) {
        return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', ...tzOpts });
    }
    return d.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        ...tzOpts,
    });
}

export default function Index({ events, eventsForMonth, month, year, canManage }: Props) {
    const appUrl = (usePage().props as { appUrl?: string }).appUrl ?? '';
    const [viewMode, setViewMode] = useState<'calendar' | 'list'>('list');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [activatingId, setActivatingId] = useState<number | null>(null);

    const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm({
        title: '',
        description: '',
        starts_at: '',
        ends_at: '',
        published_at: '',
        all_day: false,
        location: '',
        price: '',
        purchase_url: '',
        video_type: '' as EventVideoType,
        video_url: '',
        image_url: '',
        image_file: null as File | null,
        color: '',
    });

    const openCreateModal = () => {
        setIsEditing(false);
        setEditingId(null);
        const now = new Date();
        const start = new Date(now);
        start.setMinutes(0, 0, 0);
        setData({
            title: '',
            description: '',
            starts_at: toDatetimeLocalString(start),
            ends_at: '',
            published_at: '',
            all_day: false,
            location: '',
            price: '',
            purchase_url: '',
            video_type: '',
            video_url: '',
            image_url: '',
            color: '',
        });
        setData('image_file', null);
        clearErrors();
        setIsModalOpen(true);
    };

    const openEditModal = (ev: EventItem) => {
        setIsEditing(true);
        setEditingId(ev.id);
        const start = new Date(ev.starts_at);
        const end = ev.ends_at ? new Date(ev.ends_at) : null;
        setData({
            title: ev.title,
            description: ev.description ?? '',
            starts_at: ev.all_day ? toDateInputValue(start) : toDatetimeLocalString(start),
            ends_at: end
                ? ev.all_day
                    ? toDateInputValue(end)
                    : toDatetimeLocalString(end)
                : '',
            published_at: ev.published_at ? ev.published_at.substring(0, 16) : '',
            all_day: ev.all_day,
            location: ev.location ?? '',
            price: ev.price ?? '',
            purchase_url: ev.purchase_url ?? '',
            video_type: (ev.video_type ?? '') as EventVideoType,
            video_url: ev.video_url ?? '',
            image_url: ev.image_url ?? '',
            color: ev.color ?? '',
        });
        setData('image_file', null);
        clearErrors();
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        reset();
        setData('image_file', null);
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        if (isEditing && editingId) {
            put(route('events.update', editingId), { ...inertiaListModalSave, forceFormData: true });
        } else {
            post(route('events.store'), { ...inertiaListModalSave, forceFormData: true });
        }
    };

    const handleDelete = async (id: number) => {
        const ok = await confirmAction({
            title: 'Remover evento?',
            text: 'Esta ação não pode ser desfeita.',
            confirmButtonText: 'Remover',
            danger: true,
            icon: 'warning',
        });
        if (ok) {
            router.delete(route('events.destroy', id));
        }
    };

    const setActive = async (ev: EventItem, isActive: boolean) => {
        const action = isActive ? 'ativar' : 'desativar';
        const ok = await confirmAction({
            title: `${isActive ? 'Ativar' : 'Desativar'} evento?`,
            text: isActive
                ? 'O evento voltará a aparecer na lista pública do app.'
                : 'O evento vai sumir do app (lista pública) e do início, mas continua visível no painel.',
            confirmButtonText: isActive ? 'Ativar' : 'Desativar',
            danger: !isActive,
            icon: 'warning',
        });
        if (!ok) return;
        setActivatingId(ev.id);
        router.patch(
            route('events.active', ev.id),
            { is_active: isActive },
            {
                preserveScroll: true,
                onFinish: () => setActivatingId(null),
            },
        );
    };

    const goPrevMonth = () => {
        let m = month - 1;
        let y = year;
        if (m < 1) {
            m = 12;
            y -= 1;
        }
        router.get(route('events.index'), { month: m, year: y }, { preserveState: true });
    };

    const goNextMonth = () => {
        let m = month + 1;
        let y = year;
        if (m > 12) {
            m = 1;
            y += 1;
        }
        router.get(route('events.index'), { month: m, year: y }, { preserveState: true });
    };

    const calendarGrid = useMemo(() => {
        const first = new Date(year, month - 1, 1);
        const last = new Date(year, month, 0);
        const firstWeekday = (first.getDay() + 6) % 7;
        const daysInMonth = last.getDate();
        const leading = Array(firstWeekday).fill(null);
        const days = [...leading, ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
        const rows: (number | null)[][] = [];
        for (let i = 0; i < days.length; i += 7) {
            rows.push(days.slice(i, i + 7));
        }
        while (rows[rows.length - 1]?.length < 7) {
            rows[rows.length - 1].push(null);
        }
        return rows;
    }, [month, year]);

    const eventsByDay = useMemo(() => {
        const map: Record<string, EventItem[]> = {};
        eventsForMonth.forEach((ev) => {
            const day = new Date(ev.starts_at).getDate();
            const key = String(day);
            if (!map[key]) map[key] = [];
            map[key].push(ev);
        });
        return map;
    }, [eventsForMonth]);

    return (
        <AdminLayout>
            <Head title="Eventos" />
            <PageHeader
                title="Eventos"
                actions={
                    canManage ? (
                        <AddButton variant="icon" onClick={openCreateModal} title="Novo evento">
                            Novo evento
                        </AddButton>
                    ) : undefined
                }
            >
                <div className="flex flex-wrap items-center gap-2">
                    <div className="flex overflow-hidden rounded-lg border border-gray-300 dark:border-gray-600">
                        <button
                            type="button"
                            onClick={() => setViewMode('calendar')}
                            className={`flex items-center gap-1 px-3 py-2 text-sm font-medium ${
                                viewMode === 'calendar'
                                    ? 'bg-primary-600 text-white'
                                    : 'bg-white text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700'
                            }`}
                        >
                            <CalendarDaysIcon className="w-4 h-4" />
                            Calendário
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode('list')}
                            className={`flex items-center gap-1 px-3 py-2 text-sm font-medium ${
                                viewMode === 'list'
                                    ? 'bg-primary-600 text-white'
                                    : 'bg-white text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700'
                            }`}
                        >
                            <ListBulletIcon className="w-4 h-4" />
                            Lista
                        </button>
                    </div>
                </div>
            </PageHeader>

            {viewMode === 'calendar' && (
                <Card className="p-4 sm:p-6">
                    <div className="flex items-center justify-between mb-4">
                        <button
                            type="button"
                            onClick={goPrevMonth}
                            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                            aria-label="Mês anterior"
                        >
                            <ChevronLeftIcon className="w-6 h-6" />
                        </button>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {MONTH_NAMES[month - 1]} {year}
                        </h2>
                        <button
                            type="button"
                            onClick={goNextMonth}
                            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                            aria-label="Próximo mês"
                        >
                            <ChevronRightIcon className="w-6 h-6" />
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse min-w-[280px]">
                            <thead>
                                <tr>
                                    {WEEKDAYS.map((day) => (
                                        <th
                                            key={day}
                                            className="border border-gray-200 dark:border-gray-600 p-1 text-center text-xs font-medium text-gray-600 dark:text-gray-400"
                                        >
                                            {day}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {calendarGrid.map((row, rowIdx) => (
                                    <tr key={rowIdx}>
                                        {row.map((day, colIdx) => {
                                            const dayEvents = day ? eventsByDay[String(day)] ?? [] : [];
                                            const isToday =
                                                day &&
                                                year === new Date().getFullYear() &&
                                                month === new Date().getMonth() + 1 &&
                                                day === new Date().getDate();
                                            return (
                                                <td
                                                    key={colIdx}
                                                    className="border border-gray-200 dark:border-gray-600 align-top p-1 min-h-[80px] sm:min-h-[100px]"
                                                >
                                                    {day ? (
                                                        <div
                                                            className={`min-h-[70px] sm:min-h-[90px] rounded p-1 ${
                                                                isToday
                                                                    ? 'bg-primary-100 dark:bg-primary-900/30 ring-1 ring-primary-500'
                                                                    : 'bg-white dark:bg-gray-800/50'
                                                            }`}
                                                        >
                                                            <span
                                                                className={`text-sm font-medium ${
                                                                    isToday
                                                                        ? 'text-primary-700 dark:text-primary-300'
                                                                        : 'text-gray-700 dark:text-gray-300'
                                                                }`}
                                                            >
                                                                {day}
                                                            </span>
                                                            <div className="mt-1 space-y-0.5">
                                                                {dayEvents.slice(0, 2).map((ev) => (
                                                                    <button
                                                                        key={ev.id}
                                                                        type="button"
                                                                        onClick={() => canManage && openEditModal(ev)}
                                                className={`block w-full text-left text-xs truncate rounded px-1 py-0.5 ${
                                                                            ev.color
                                                                                ? ''
                                                                                : 'bg-primary-100 dark:bg-primary-900/50 text-primary-800 dark:text-primary-200'
                                                                        }`}
                                                                        style={
                                                                            ev.color
                                                                                ? {
                                                                                      backgroundColor: ev.color + '30',
                                                                                      color: ev.color,
                                                                                  }
                                                                                : undefined
                                                                        }
                                                                        title={ev.title}
                                                                    >
                                                {ev.all_day ? ev.title : `${formatTime(ev.starts_at)} ${ev.title}`}
                                                {!ev.is_active ? ' (inativo)' : ''}
                                                                    </button>
                                                                ))}
                                                                {dayEvents.length > 2 && (
                                                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                                                        +{dayEvents.length - 2}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ) : null}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            {viewMode === 'list' && (
                <div className="space-y-3">
                    {events.length === 0 ? (
                        <Card className="p-8 text-center text-gray-500 dark:text-gray-400">
                            Nenhum evento cadastrado.
                        </Card>
                    ) : (
                        events.map((ev) => (
                            <Card key={ev.id} className="w-full min-w-0 overflow-hidden p-4">
                                <div className="flex min-w-0 gap-3">
                                    <div
                                        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg text-lg font-bold text-white"
                                        style={{
                                            backgroundColor: ev.color || 'var(--primary-600, #2563eb)',
                                        }}
                                    >
                                        {new Date(ev.starts_at).getDate()}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-2">
                                            <h3 className="min-w-0 break-words font-semibold text-gray-900 dark:text-white sm:flex-1">
                                                {ev.title}
                                                {!ev.is_active && (
                                                    <span className="ml-2 inline-flex align-middle items-center rounded-full bg-zinc-200 px-2 py-0.5 text-[11px] font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                                                        Inativo
                                                    </span>
                                                )}
                                            </h3>
                                            {canManage && (
                                                <ListCardActionRow className="-ml-1 self-end sm:-mr-1 sm:-mt-1 sm:ml-0 sm:self-auto">
                                                    <ListCardIconActionButton
                                                        label={ev.is_active ? 'Desativar' : 'Ativar'}
                                                        icon={<PowerIcon className="h-5 w-5" />}
                                                        onClick={() => setActive(ev, !ev.is_active)}
                                                        disabled={activatingId === ev.id}
                                                    />
                                                    <ListCardIconActionButton
                                                        label="Editar"
                                                        icon={<PencilIcon className="h-5 w-5" />}
                                                        onClick={() => openEditModal(ev)}
                                                    />
                                                    <ListCardIconActionButton
                                                        label="Excluir"
                                                        icon={<TrashIcon className="h-5 w-5" />}
                                                        tone="danger"
                                                        onClick={() => handleDelete(ev.id)}
                                                    />
                                                </ListCardActionRow>
                                            )}
                                        </div>
                                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-600 dark:text-gray-400">
                                            <span className="flex min-w-0 items-center gap-1">
                                                <ClockIcon className="h-4 w-4 shrink-0" />
                                                <span className="min-w-0 break-words">
                                                    {formatDateTime(ev.starts_at, ev.all_day)}
                                                    {ev.ends_at && !ev.all_day && ` – ${formatTime(ev.ends_at)}`}
                                                </span>
                                            </span>
                                            {ev.location && (
                                                <span className="flex min-w-0 items-center gap-1">
                                                    <MapPinIcon className="h-4 w-4 shrink-0" />
                                                    <span className="min-w-0 truncate">{ev.location}</span>
                                                </span>
                                            )}
                                            {ev.price && (
                                                <span className="flex items-center gap-1">
                                                    <BanknotesIcon className="h-4 w-4 shrink-0" />
                                                    {ev.price}
                                                </span>
                                            )}
                                            {ev.purchase_url && (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-primary-100 px-2 py-0.5 text-xs font-semibold text-primary-800 dark:bg-primary-900/50 dark:text-primary-200">
                                                    <TicketIcon className="h-3.5 w-3.5" />
                                                    Compra / inscrição
                                                </span>
                                            )}
                                        </div>
                                        {ev.description && (
                                            <p className="mt-1 line-clamp-2 break-words text-sm text-gray-600 dark:text-gray-400">
                                                {ev.description}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </Card>
                        ))
                    )}
                </div>
            )}

            <Modal show={isModalOpen} onClose={closeModal} maxWidth="md">
                <form onSubmit={submit} className="min-w-0 max-w-full overflow-x-hidden p-6">
                    <h2 className="mb-4 pr-10 text-lg font-semibold text-gray-900 dark:text-white">
                        {isEditing ? 'Editar evento' : 'Novo evento'}
                    </h2>
                    <div className="min-w-0 space-y-4">
                        <div className="min-w-0">
                            <InputLabel htmlFor="title">Título *</InputLabel>
                            <TextInput
                                id="title"
                                value={data.title}
                                onChange={(e) => setData('title', e.target.value)}
                                className="mt-1 block w-full min-w-0 max-w-full"
                                required
                            />
                            <InputError message={errors.title} />
                        </div>
                        <div className="min-w-0">
                            <InputLabel htmlFor="published_at" value="Data de publicação (vazio = publicar agora)" />
                            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                                Se escolher uma data no futuro, o evento só vai aparecer no app a partir dessa data.
                                Para esconder sem apagar, use <strong>Ativar/Desativar</strong> na lista.
                            </p>
                            <TextInput
                                id="published_at"
                                type="datetime-local"
                                value={data.published_at}
                                onChange={(e) => setData('published_at', e.target.value)}
                                className="mt-1 block w-full min-w-0 max-w-full"
                            />
                            <InputError message={errors.published_at} />
                        </div>
                        <div className="min-w-0">
                            <InputLabel htmlFor="description">Descrição</InputLabel>
                            <Textarea
                                id="description"
                                value={data.description}
                                onChange={(e) => setData('description', e.target.value)}
                                className="mt-1 block w-full min-w-0 max-w-full"
                                rows={3}
                            />
                            <InputError message={errors.description} />
                        </div>
                        <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
                            <div className="min-w-0">
                                <InputLabel htmlFor="starts_at">Início *</InputLabel>
                                <TextInput
                                    id="starts_at"
                                    type={data.all_day ? 'date' : 'datetime-local'}
                                    value={data.all_day ? data.starts_at.slice(0, 10) : data.starts_at}
                                    onChange={(e) => setData('starts_at', e.target.value)}
                                    className="mt-1 block w-full min-w-0 max-w-full"
                                    required
                                />
                                <InputError message={errors.starts_at} />
                            </div>
                            <div className="min-w-0">
                                <InputLabel htmlFor="ends_at">Fim (opcional)</InputLabel>
                                <TextInput
                                    id="ends_at"
                                    type={data.all_day ? 'date' : 'datetime-local'}
                                    value={
                                        data.ends_at
                                            ? data.all_day
                                                ? data.ends_at.slice(0, 10)
                                                : data.ends_at
                                            : ''
                                    }
                                    onChange={(e) => setData('ends_at', e.target.value)}
                                    className="mt-1 block w-full min-w-0 max-w-full"
                                />
                                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                    Deixe em branco se o evento não tiver horário de término.
                                </p>
                                <InputError message={errors.ends_at} />
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="all_day"
                                checked={data.all_day}
                                onChange={(e) => setData('all_day', e.target.checked)}
                                className="rounded border-gray-300 dark:border-gray-600"
                            />
                            <InputLabel htmlFor="all_day" className="!mb-0">Evento o dia todo</InputLabel>
                        </div>
                        <div>
                            <InputLabel htmlFor="location">Local</InputLabel>
                            <TextInput
                                id="location"
                                value={data.location}
                                onChange={(e) => setData('location', e.target.value)}
                                className="mt-1 block w-full"
                            />
                            <InputError message={errors.location} />
                        </div>
                        <div>
                            <InputLabel htmlFor="price">Valor e condições (texto livre, opcional)</InputLabel>
                            <Textarea
                                id="price"
                                name="price"
                                value={data.price}
                                onChange={(e) => setData('price', e.target.value)}
                                className="mt-1 block w-full"
                                rows={3}
                                placeholder="Ex.: R$ 50 + 1 kg de alimento · Meia entrada R$ 25 · Grátis"
                            />
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                Aparece só no detalhe do evento no app (não no card da lista pública).
                            </p>
                            <InputError message={errors.price} />
                        </div>
                        <div className="rounded-xl border-2 border-primary-500/35 bg-primary-50/80 p-4 shadow-sm dark:border-primary-500/40 dark:bg-primary-950/30">
                            <div className="mb-2 flex items-center gap-2 text-primary-900 dark:text-primary-100">
                                <TicketIcon className="h-5 w-5 shrink-0" />
                                <span className="text-sm font-bold uppercase tracking-wide">Link para compra</span>
                            </div>
                            <p className="mb-3 text-xs text-primary-950/80 dark:text-primary-100/80">
                                Destaque no app: botão que leva à página de ingressos, inscrição ou pagamento (cole o URL
                                completo, incluindo https://).
                            </p>
                            <InputLabel htmlFor="purchase_url" className="text-primary-950 dark:text-primary-50">
                                URL de compra ou inscrição
                            </InputLabel>
                            <TextInput
                                id="purchase_url"
                                type="url"
                                value={data.purchase_url}
                                onChange={(e) => setData('purchase_url', e.target.value)}
                                className="mt-1 block w-full border-primary-200 bg-white dark:border-primary-800/60 dark:bg-zinc-900"
                                placeholder="https://..."
                            />
                            <InputError message={errors.purchase_url} />
                        </div>
                        <div>
                            <InputLabel htmlFor="event_video_type" value="Vídeo do evento (opcional)" />
                            <SelectInput
                                id="event_video_type"
                                value={data.video_type}
                                className="mt-1"
                                onChange={(e) => {
                                    const next = e.target.value as EventVideoType;
                                    setData('video_type', next);
                                    if (next === '') {
                                        setData('video_url', '');
                                    }
                                }}
                            >
                                <option value="">Sem vídeo</option>
                                <option value="youtube">YouTube</option>
                                <option value="instagram">Instagram</option>
                            </SelectInput>
                            <InputError message={errors.video_type} className="mt-1" />
                        </div>
                        {data.video_type === 'youtube' && (
                            <div>
                                <InputLabel htmlFor="event_video_url_youtube" value="Link do YouTube" />
                                <TextInput
                                    id="event_video_url_youtube"
                                    value={data.video_url}
                                    onChange={(e) => setData('video_url', e.target.value)}
                                    className="mt-1 block w-full"
                                    placeholder="https://www.youtube.com/watch?v=… ou https://youtu.be/…"
                                />
                                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                                    Na app, a capa exibe o ícone de play e o vídeo abre no detalhe do evento.
                                </p>
                                <InputError message={errors.video_url} className="mt-1" />
                            </div>
                        )}
                        {data.video_type === 'instagram' && (
                            <div>
                                <InputLabel htmlFor="event_video_url_instagram" value="Link do Instagram" />
                                <TextInput
                                    id="event_video_url_instagram"
                                    value={data.video_url}
                                    onChange={(e) => setData('video_url', e.target.value)}
                                    className="mt-1 block w-full"
                                    placeholder="https://www.instagram.com/p/… ou …/reel/…"
                                />
                                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                                    Na app, a capa exibe o ícone de play e abre o vídeo no Instagram.
                                </p>
                                <InputError message={errors.video_url} className="mt-1" />
                            </div>
                        )}
                        <div>
                            <InputLabel htmlFor="image_url">Imagem de capa / fundo</InputLabel>
                            <p
                                id="event_cover_specs"
                                className="mt-1.5 rounded-xl border border-teal-200/80 bg-teal-50 px-3 py-2 text-xs leading-relaxed text-teal-950 dark:border-teal-900/50 dark:bg-teal-950/35 dark:text-teal-100"
                            >
                                <span className="font-semibold">Capa no app:</span> {EVENT_COVER_SPECS}
                            </p>
                            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                                Envie um arquivo ou cole o link da imagem.
                            </p>
                            <div className="mt-2 space-y-3">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-zinc-200 dark:bg-zinc-800">
                                        {data.image_file ? (
                                            <img
                                                src={URL.createObjectURL(data.image_file)}
                                                alt=""
                                                className="h-full w-full object-cover"
                                            />
                                        ) : data.image_url ? (
                                            <img
                                                src={imageSrc(data.image_url, appUrl)}
                                                alt=""
                                                className="h-full w-full object-cover"
                                            />
                                        ) : (
                                            <PhotoIcon className="h-5 w-5 text-zinc-500" />
                                        )}
                                    </div>
                                    <div className="min-w-0 flex-1 space-y-2">
                                        <input
                                            id="image_file"
                                            type="file"
                                            accept={GALLERY_IMAGE_ACCEPT}
                                            aria-describedby="event_cover_specs"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0] ?? null;
                                                setData('image_file', file);
                                            }}
                                            className="block w-full text-sm text-zinc-900 file:mr-4 file:rounded-full file:border-0 file:bg-zinc-900 file:px-4 file:py-2.5 file:text-sm file:font-semibold file:text-white hover:file:bg-zinc-800 dark:text-zinc-100 dark:file:bg-zinc-100 dark:file:text-zinc-900"
                                        />
                                        <TextInput
                                            id="image_url"
                                            value={data.image_url}
                                            onChange={(e) => setData('image_url', e.target.value)}
                                            className="block w-full"
                                            placeholder="Ou URL https://..."
                                        />
                                    </div>
                                </div>
                                <InputError message={errors.image_url} />
                                <InputError message={errors.image_file} />
                            </div>
                            {(data.image_file || data.image_url) && data.video_type && data.video_url.trim() && (
                                <div className="mt-3 overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-700">
                                    <p className="border-b border-zinc-100 bg-zinc-50 px-3 py-2 text-xs font-medium text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
                                        Pré-visualização na app
                                    </p>
                                    <NewsPostCover
                                        imageSrc={
                                            data.image_file
                                                ? URL.createObjectURL(data.image_file)
                                                : imageSrc(data.image_url, appUrl)
                                        }
                                        instagramVideoUrl={
                                            data.video_type === 'instagram' ? data.video_url : null
                                        }
                                        showYoutubePlayOverlay={data.video_type === 'youtube'}
                                    />
                                </div>
                            )}
                        </div>
                        <div>
                            <InputLabel htmlFor="color">Cor do evento</InputLabel>
                            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                                Toque numa cor sugerida, use o seletor ou escreva o código hex (ex.: #3B82F6).
                            </p>
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                                {EVENT_COLOR_PRESETS.map((hex) => {
                                    const active = normalizeHexColor(data.color) === hex;
                                    return (
                                        <button
                                            key={hex}
                                            type="button"
                                            title={hex}
                                            onClick={() => setData('color', hex)}
                                            className={`h-9 w-9 shrink-0 rounded-full border-2 border-white shadow-sm ring-offset-2 transition hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 dark:border-zinc-900 dark:ring-offset-zinc-950 ${
                                                active ? 'ring-2 ring-zinc-900 dark:ring-white' : 'ring-0'
                                            }`}
                                            style={{ backgroundColor: hex }}
                                            aria-label={`Cor ${hex}`}
                                            aria-pressed={active}
                                        />
                                    );
                                })}
                                <label className="ml-1 flex cursor-pointer items-center gap-2 rounded-xl border border-zinc-200 bg-white px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900">
                                    <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Mais</span>
                                    <input
                                        type="color"
                                        className="h-8 w-10 cursor-pointer rounded border-0 bg-transparent p-0"
                                        value={colorPickerSafeValue(data.color)}
                                        onChange={(e) => setData('color', e.target.value.toUpperCase())}
                                        aria-label="Escolher cor personalizada"
                                    />
                                </label>
                            </div>
                            <TextInput
                                id="color"
                                value={data.color}
                                onChange={(e) => setData('color', e.target.value)}
                                className="mt-2 block w-full font-mono text-sm"
                                placeholder="#3B82F6"
                                autoComplete="off"
                            />
                            <InputError message={errors.color} />
                        </div>
                    </div>
                    <div className="mt-6 flex justify-end gap-2">
                        <SecondaryButton type="button" onClick={closeModal}>
                            Cancelar
                        </SecondaryButton>
                        <PrimaryButton type="submit" disabled={processing}>
                            {isEditing ? 'Salvar' : 'Criar'}
                        </PrimaryButton>
                    </div>
                </form>
            </Modal>
        </AdminLayout>
    );
}
