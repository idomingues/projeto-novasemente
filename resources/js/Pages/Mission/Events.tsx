import AdminLayout from '@/Layouts/AdminLayout';
import FlashMessages from '@/Components/FlashMessages';
import MissionAdminTabs from '@/Components/Mission/MissionAdminTabs';
import PageHeader from '@/Components/PageHeader';
import AddButton from '@/Components/AddButton';
import Card from '@/Components/Card';
import SecondaryButton from '@/Components/SecondaryButton';
import EventAdminModal, {
    defaultEventFormData,
    eventFormDataFromItem,
    type EventAdminFormData,
} from '@/Components/Events/EventAdminModal';
import type { EventItemForAdmin } from '@/Components/Events/eventAdminTypes';
import { formatDateTime, formatTime } from '@/Components/Events/eventAdminTypes';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import {
    CalendarDaysIcon,
    ClockIcon,
    MapPinIcon,
    PencilIcon,
    TrashIcon,
    BanknotesIcon,
    TicketIcon,
} from '@heroicons/react/24/outline';
import { FormEventHandler, useState } from 'react';
import { confirmAction } from '@/utils/confirmDialog';

interface Props {
    events: EventItemForAdmin[];
    canManage: boolean;
}

export default function MissionEventsAdmin({ events, canManage }: Props) {
    const appUrl = (usePage().props as { appUrl?: string }).appUrl ?? '';
    const [open, setOpen] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);

    const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm<EventAdminFormData>(
        defaultEventFormData(),
    );

    const openCreate = () => {
        setEditingId(null);
        reset();
        clearErrors();
        setOpen(true);
    };

    const openEdit = (row: EventItemForAdmin) => {
        setEditingId(row.id);
        setData(eventFormDataFromItem(row));
        clearErrors();
        setOpen(true);
    };

    const close = () => {
        setOpen(false);
        reset();
        setEditingId(null);
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        if (editingId) {
            put(route('mission.content.events.update', editingId), {
                forceFormData: true,
                onSuccess: () => close(),
            });
        } else {
            post(route('mission.content.events.store'), {
                forceFormData: true,
                onSuccess: () => close(),
            });
        }
    };

    const destroy = async (id: number) => {
        const ok = await confirmAction({
            title: 'Remover evento?',
            text: 'Esta ação não pode ser desfeita.',
            confirmButtonText: 'Remover',
            danger: true,
            icon: 'warning',
        });
        if (ok) router.delete(route('mission.content.events.destroy', id));
    };

    return (
        <AdminLayout>
            <Head title="Missão — Eventos" />
            <FlashMessages />
            <div className="space-y-6">
                <PageHeader
                    title="Missão"
                    subtitle="Cadastre os próximos eventos da comunidade missionária — o mesmo formato dos eventos gerais do app."
                    actions={
                        canManage ? (
                            <AddButton variant="icon" onClick={openCreate} title="Novo evento">
                                Novo evento
                            </AddButton>
                        ) : undefined
                    }
                />
                <MissionAdminTabs active="eventos" />

                {events.length === 0 ? (
                    <div className="rounded-2xl border border-zinc-200 bg-white py-12 text-center dark:border-zinc-800 dark:bg-zinc-900">
                        <CalendarDaysIcon className="mx-auto h-10 w-10 text-zinc-400" />
                        <p className="mt-3 font-medium text-zinc-600">Nenhum evento cadastrado</p>
                        {canManage ? (
                            <div className="mt-4">
                                <AddButton variant="icon" onClick={openCreate} title="Novo evento">
                                    Novo evento
                                </AddButton>
                            </div>
                        ) : null}
                    </div>
                ) : (
                    <div className="space-y-3">
                        {events.map((ev) => (
                            <Card key={ev.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                                <div
                                    className="hidden h-14 w-14 flex-shrink-0 items-center justify-center rounded-lg text-lg font-bold text-white sm:flex"
                                    style={{
                                        backgroundColor: ev.color || 'var(--primary-600, #2563eb)',
                                    }}
                                >
                                    {new Date(ev.starts_at).getDate()}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h3 className="truncate font-semibold text-gray-900 dark:text-white">{ev.title}</h3>
                                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-600 dark:text-gray-400">
                                        <span className="flex items-center gap-1">
                                            <ClockIcon className="h-4 w-4 flex-shrink-0" />
                                            {formatDateTime(ev.starts_at, ev.all_day)}
                                            {ev.ends_at && !ev.all_day && ` – ${formatTime(ev.ends_at)}`}
                                        </span>
                                        {ev.location && (
                                            <span className="flex items-center gap-1 truncate">
                                                <MapPinIcon className="h-4 w-4 flex-shrink-0" />
                                                {ev.location}
                                            </span>
                                        )}
                                        {ev.price && (
                                            <span className="flex items-center gap-1">
                                                <BanknotesIcon className="h-4 w-4 flex-shrink-0" />
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
                                        <p className="mt-1 line-clamp-2 text-sm text-gray-600 dark:text-gray-400">
                                            {ev.description}
                                        </p>
                                    )}
                                </div>
                                {canManage ? (
                                    <div className="flex flex-shrink-0 gap-2">
                                        <SecondaryButton type="button" onClick={() => openEdit(ev)} className="gap-1">
                                            <PencilIcon className="h-4 w-4" />
                                            Editar
                                        </SecondaryButton>
                                        <SecondaryButton
                                            type="button"
                                            onClick={() => destroy(ev.id)}
                                            className="gap-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                        >
                                            <TrashIcon className="h-4 w-4" />
                                            Excluir
                                        </SecondaryButton>
                                    </div>
                                ) : null}
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            <EventAdminModal
                show={open}
                onClose={close}
                isEditing={editingId !== null}
                data={data}
                setData={setData}
                errors={errors}
                processing={processing}
                onSubmit={submit}
                appUrl={appUrl}
            />
        </AdminLayout>
    );
}
