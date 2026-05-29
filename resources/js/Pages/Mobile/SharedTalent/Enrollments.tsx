import MobileLayout from '@/Layouts/MobileLayout';
import FlashMessages from '@/Components/FlashMessages';
import Modal from '@/Components/Modal';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import InputLabel from '@/Components/InputLabel';
import SelectInput from '@/Components/SelectInput';
import TextInput from '@/Components/TextInput';
import Textarea from '@/Components/Textarea';
import { Head, Link, useForm } from '@inertiajs/react';
import { useState } from 'react';
import { inertiaListModalSave } from '@/utils/inertiaListModalSave';
import { CHAT_MESSAGE_SENDS_EMAIL_SUBTITLE } from '@/constants/chatEmailNotice';

interface EnrollmentRow {
    id: number;
    status: string;
    status_label: string;
    listing_title: string;
    counterpart_name: string | null;
    message: string | null;
    messages: { id: number; body: string; author_name: string | null; is_mine: boolean; created_at: string | null }[];
}

interface Props {
    enrollments: EnrollmentRow[];
    myListings: { id: number; title: string }[];
}

const publisherStatusOptions = [
    { value: 'confirmed', label: 'Confirmar' },
    { value: 'rejected', label: 'Rejeitar' },
    { value: 'in_progress', label: 'Em andamento' },
    { value: 'completed', label: 'Concluído' },
];

export default function SharedTalentEnrollments({ enrollments, myListings }: Props) {
    const [announceOpen, setAnnounceOpen] = useState(false);
    const announceForm = useForm({ listing_id: '', body: '' });

    return (
        <MobileLayout>
            <Head title="Participantes" />
            <FlashMessages />
            <div className="mx-auto max-w-3xl space-y-6">
                <Link href={route('mobile.shared-talents.index')} className="text-sm font-medium text-brand-600">
                    ← Doar Talentos
                </Link>
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Participantes</h1>
                    {myListings.length > 0 && (
                        <SecondaryButton
                            type="button"
                            onClick={() => {
                                announceForm.setData('listing_id', String(myListings[0].id));
                                setAnnounceOpen(true);
                            }}
                        >
                            Enviar comunicado
                        </SecondaryButton>
                    )}
                </div>
                {enrollments.length === 0 ? (
                    <p className="text-sm text-zinc-600">Nenhuma inscrição nas suas publicações ainda.</p>
                ) : (
                    enrollments.map((row) => <PublisherEnrollmentCard key={row.id} row={row} />)
                )}
            </div>

            <Modal show={announceOpen} onClose={() => setAnnounceOpen(false)}>
                <form
                    className="space-y-4 p-6"
                    onSubmit={(e) => {
                        e.preventDefault();
                        if (!announceForm.data.listing_id) return;
                        announceForm.post(
                            route('mobile.shared-talents.announcements', announceForm.data.listing_id),
                            { ...inertiaListModalSave },
                        );
                    }}
                >
                    <h2 className="text-lg font-semibold">Comunicado aos participantes</h2>
                    <SelectInput
                        value={announceForm.data.listing_id}
                        onChange={(e) => announceForm.setData('listing_id', e.target.value)}
                    >
                        {myListings.map((l) => (
                            <option key={l.id} value={l.id}>
                                {l.title}
                            </option>
                        ))}
                    </SelectInput>
                    <Textarea
                        rows={4}
                        value={announceForm.data.body}
                        onChange={(e) => announceForm.setData('body', e.target.value)}
                        placeholder="Mensagem para inscritos confirmados..."
                    />
                    <PrimaryButton disabled={announceForm.processing}>Enviar</PrimaryButton>
                </form>
            </Modal>
        </MobileLayout>
    );
}

function PublisherEnrollmentCard({ row }: { row: EnrollmentRow }) {
    const [statusOpen, setStatusOpen] = useState(false);
    const statusForm = useForm({ status: row.status });
    const messageForm = useForm({ body: '' });

    return (
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <p className="font-semibold text-zinc-900 dark:text-white">{row.listing_title}</p>
            <p className="text-sm text-zinc-600">{row.counterpart_name}</p>
            <span className="mt-1 inline-block rounded-full bg-zinc-100 px-2 py-0.5 text-xs dark:bg-zinc-800">
                {row.status_label}
            </span>
            {row.message && <p className="mt-2 text-sm italic text-zinc-500">«{row.message}»</p>}

            {row.messages.length > 0 && (
                <div className="mt-3 max-h-32 space-y-1 overflow-y-auto text-sm">
                    {row.messages.map((m) => (
                        <p key={m.id}>
                            <strong>{m.author_name}:</strong> {m.body}
                        </p>
                    ))}
                </div>
            )}

            <div className="mt-3 flex flex-wrap gap-2">
                <SecondaryButton type="button" onClick={() => setStatusOpen(true)}>
                    Atualizar status
                </SecondaryButton>
            </div>

            <form
                className="mt-2"
                onSubmit={(e) => {
                    e.preventDefault();
                    messageForm.post(route('mobile.shared-talents.enrollment.messages', row.id), {
                        onSuccess: () => messageForm.reset(),
                    });
                }}
            >
                <p className="text-xs text-zinc-500">{CHAT_MESSAGE_SENDS_EMAIL_SUBTITLE}</p>
                <div className="mt-1 flex gap-2">
                    <TextInput
                        className="flex-1"
                        value={messageForm.data.body}
                        onChange={(e) => messageForm.setData('body', e.target.value)}
                    />
                    <PrimaryButton disabled={messageForm.processing}>Enviar</PrimaryButton>
                </div>
            </form>

            <Modal show={statusOpen} onClose={() => setStatusOpen(false)}>
                <form
                    className="space-y-4 p-6"
                    onSubmit={(e) => {
                        e.preventDefault();
                        statusForm.patch(route('mobile.shared-talents.enrollment.status', row.id), {
                            ...inertiaListModalSave,
                        });
                    }}
                >
                    <InputLabel value="Status" />
                    <SelectInput
                        value={statusForm.data.status}
                        onChange={(e) => statusForm.setData('status', e.target.value)}
                    >
                        {row.status === 'awaiting_approval' && (
                            <>
                                <option value="confirmed">Confirmar</option>
                                <option value="rejected">Rejeitar</option>
                            </>
                        )}
                        {publisherStatusOptions.map((o) => (
                            <option key={o.value} value={o.value}>
                                {o.label}
                            </option>
                        ))}
                    </SelectInput>
                    <PrimaryButton disabled={statusForm.processing}>Salvar</PrimaryButton>
                </form>
            </Modal>
        </div>
    );
}
