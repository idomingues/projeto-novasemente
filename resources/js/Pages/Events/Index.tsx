import AdminLayout from '@/Layouts/AdminLayout';
import { Head, useForm, router } from '@inertiajs/react';
import {
    PlusIcon,
    PencilIcon,
    TrashIcon,
    CalendarDaysIcon,
    ListBulletIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    MapPinIcon,
    ClockIcon,
} from '@heroicons/react/24/outline';
import PageHeader from '@/Components/PageHeader';
import Card from '@/Components/Card';
import Modal from '@/Components/Modal';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import Textarea from '@/Components/Textarea';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import InputError from '@/Components/InputError';
import { useState, FormEventHandler, useMemo } from 'react';

interface EventItem {
    id: number;
    title: string;
    description: string | null;
    starts_at: string;
    ends_at: string | null;
    all_day: boolean;
    location: string | null;
    image_url: string | null;
    color: string | null;
}

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

function formatTime(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleDateString('pt-BR', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
}

function formatDateTime(iso: string, allDay: boolean): string {
    const d = new Date(iso);
    if (allDay) {
        return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
    }
    return d.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export default function Index({ events, eventsForMonth, month, year, canManage }: Props) {
    const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);

    const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm({
        title: '',
        description: '',
        starts_at: '',
        ends_at: '',
        all_day: false,
        location: '',
        image_url: '',
        color: '',
    });

    const openCreateModal = () => {
        setIsEditing(false);
        setEditingId(null);
        const now = new Date();
        const start = new Date(now);
        start.setMinutes(0, 0, 0);
        const end = new Date(start);
        end.setHours(end.getHours() + 1, 0, 0, 0);
        setData({
            title: '',
            description: '',
            starts_at: start.toISOString().slice(0, 16),
            ends_at: end.toISOString().slice(0, 16),
            all_day: false,
            location: '',
            image_url: '',
            color: '',
        });
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
            starts_at: start.toISOString().slice(0, 16),
            ends_at: end ? end.toISOString().slice(0, 16) : '',
            all_day: ev.all_day,
            location: ev.location ?? '',
            image_url: ev.image_url ?? '',
            color: ev.color ?? '',
        });
        clearErrors();
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        reset();
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        if (isEditing && editingId) {
            put(route('events.update', editingId), { onSuccess: () => closeModal() });
        } else {
            post(route('events.store'), { onSuccess: () => closeModal() });
        }
    };

    const handleDelete = (id: number) => {
        if (confirm('Remover este evento?')) {
            router.delete(route('events.destroy', id));
        }
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
            <PageHeader title="Eventos">
                <div className="flex flex-wrap items-center gap-2 w-full">
                    <div className="flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden">
                        <button
                            type="button"
                            onClick={() => setViewMode('calendar')}
                            className={`px-3 py-2 text-sm font-medium flex items-center gap-1 ${
                                viewMode === 'calendar'
                                    ? 'bg-primary-600 text-white'
                                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
                            }`}
                        >
                            <CalendarDaysIcon className="w-4 h-4" />
                            Calendário
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode('list')}
                            className={`px-3 py-2 text-sm font-medium flex items-center gap-1 ${
                                viewMode === 'list'
                                    ? 'bg-primary-600 text-white'
                                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
                            }`}
                        >
                            <ListBulletIcon className="w-4 h-4" />
                            Lista
                        </button>
                    </div>
                    {canManage && (
                        <PrimaryButton type="button" onClick={openCreateModal} className="gap-2">
                            <PlusIcon className="w-5 h-5" />
                            Novo evento
                        </PrimaryButton>
                    )}
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
                            <Card key={ev.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                                <div
                                    className="hidden sm:block w-14 h-14 rounded-lg flex-shrink-0 flex items-center justify-center text-white font-bold text-lg"
                                    style={{
                                        backgroundColor: ev.color || 'var(--primary-600, #2563eb)',
                                    }}
                                >
                                    {new Date(ev.starts_at).getDate()}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                                        {ev.title}
                                    </h3>
                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-sm text-gray-600 dark:text-gray-400">
                                        <span className="flex items-center gap-1">
                                            <ClockIcon className="w-4 h-4 flex-shrink-0" />
                                            {formatDateTime(ev.starts_at, ev.all_day)}
                                            {ev.ends_at && !ev.all_day && ` – ${formatTime(ev.ends_at)}`}
                                        </span>
                                        {ev.location && (
                                            <span className="flex items-center gap-1 truncate">
                                                <MapPinIcon className="w-4 h-4 flex-shrink-0" />
                                                {ev.location}
                                            </span>
                                        )}
                                    </div>
                                    {ev.description && (
                                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                                            {ev.description}
                                        </p>
                                    )}
                                </div>
                                {canManage && (
                                    <div className="flex gap-2 flex-shrink-0">
                                        <SecondaryButton
                                            type="button"
                                            onClick={() => openEditModal(ev)}
                                            className="gap-1"
                                        >
                                            <PencilIcon className="w-4 h-4" />
                                            Editar
                                        </SecondaryButton>
                                        <SecondaryButton
                                            type="button"
                                            onClick={() => handleDelete(ev.id)}
                                            className="gap-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                        >
                                            <TrashIcon className="w-4 h-4" />
                                            Excluir
                                        </SecondaryButton>
                                    </div>
                                )}
                            </Card>
                        ))
                    )}
                </div>
            )}

            <Modal show={isModalOpen} onClose={closeModal} maxWidth="md">
                <form onSubmit={submit} className="p-6">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        {isEditing ? 'Editar evento' : 'Novo evento'}
                    </h2>
                    <div className="space-y-4">
                        <div>
                            <InputLabel htmlFor="title">Título *</InputLabel>
                            <TextInput
                                id="title"
                                value={data.title}
                                onChange={(e) => setData('title', e.target.value)}
                                className="mt-1 block w-full"
                                required
                            />
                            <InputError message={errors.title} />
                        </div>
                        <div>
                            <InputLabel htmlFor="description">Descrição</InputLabel>
                            <Textarea
                                id="description"
                                value={data.description}
                                onChange={(e) => setData('description', e.target.value)}
                                className="mt-1 block w-full"
                                rows={3}
                            />
                            <InputError message={errors.description} />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <InputLabel htmlFor="starts_at">Início *</InputLabel>
                                <TextInput
                                    id="starts_at"
                                    type={data.all_day ? 'date' : 'datetime-local'}
                                    value={data.all_day ? data.starts_at.slice(0, 10) : data.starts_at}
                                    onChange={(e) => setData('starts_at', e.target.value)}
                                    className="mt-1 block w-full"
                                    required
                                />
                                <InputError message={errors.starts_at} />
                            </div>
                            <div>
                                <InputLabel htmlFor="ends_at">Fim</InputLabel>
                                <TextInput
                                    id="ends_at"
                                    type={data.all_day ? 'date' : 'datetime-local'}
                                    value={data.all_day ? data.ends_at.slice(0, 10) : data.ends_at}
                                    onChange={(e) => setData('ends_at', e.target.value)}
                                    className="mt-1 block w-full"
                                />
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
                            <InputLabel htmlFor="image_url">URL da imagem</InputLabel>
                            <TextInput
                                id="image_url"
                                value={data.image_url}
                                onChange={(e) => setData('image_url', e.target.value)}
                                className="mt-1 block w-full"
                                placeholder="https://..."
                            />
                            <InputError message={errors.image_url} />
                        </div>
                        <div>
                            <InputLabel htmlFor="color">Cor (hex, ex: #3B82F6)</InputLabel>
                            <TextInput
                                id="color"
                                value={data.color}
                                onChange={(e) => setData('color', e.target.value)}
                                className="mt-1 block w-full"
                                placeholder="#3B82F6"
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
