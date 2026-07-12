import AdminLayout from '@/Layouts/AdminLayout';
import FlashMessages from '@/Components/FlashMessages';
import MissionAdminTabs from '@/Components/Mission/MissionAdminTabs';
import PageHeader from '@/Components/PageHeader';
import AddButton from '@/Components/AddButton';
import Card from '@/Components/Card';
import ListCardActionRow from '@/Components/ListCard/ListCardActionRow';
import ListCardIconActionButton from '@/Components/ListCard/ListCardIconActionButton';
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
import { inertiaListModalSave } from '@/utils/inertiaListModalSave';

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
                ...inertiaListModalSave,
                forceFormData: true,
            });
        } else {
            post(route('mission.content.events.store'), {
                ...inertiaListModalSave,
                forceFormData: true,
                onSuccess: () => {
                    reset();
                    setEditingId(null);
                },
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
                                            </h3>
                                            {canManage ? (
                                                <ListCardActionRow className="-ml-1 self-end sm:-mr-1 sm:-mt-1 sm:ml-0 sm:self-auto">
                                                    <ListCardIconActionButton
                                                        label="Editar"
                                                        icon={<PencilIcon className="h-5 w-5" />}
                                                        onClick={() => openEdit(ev)}
                                                    />
                                                    <ListCardIconActionButton
                                                        label="Excluir"
                                                        icon={<TrashIcon className="h-5 w-5" />}
                                                        tone="danger"
                                                        onClick={() => destroy(ev.id)}
                                                    />
                                                </ListCardActionRow>
                                            ) : null}
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
