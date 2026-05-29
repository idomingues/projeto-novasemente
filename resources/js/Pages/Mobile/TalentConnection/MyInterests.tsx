import MobileLayout from '@/Layouts/MobileLayout';
import FlashMessages from '@/Components/FlashMessages';
import Modal from '@/Components/Modal';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import InputLabel from '@/Components/InputLabel';
import SelectInput from '@/Components/SelectInput';
import TextInput from '@/Components/TextInput';
import { Head, Link, useForm } from '@inertiajs/react';
import { useState } from 'react';
import { inertiaListModalSave } from '@/utils/inertiaListModalSave';
import { CHAT_MESSAGE_SENDS_EMAIL_SUBTITLE } from '@/constants/chatEmailNotice';

interface InterestRow {
    id: number;
    status: string;
    status_label: string;
    listing_title: string;
    listing_type_label: string;
    category_name: string | null;
    counterpart_name: string | null;
    role: 'interested' | 'publisher';
    show_url: string;
    can_review: boolean;
}

interface Props {
    asInterested: InterestRow[];
    asPublisher: InterestRow[];
}

const statusOptions = [
    { value: 'in_conversation', label: 'Em conversa' },
    { value: 'agreed', label: 'Combinado' },
    { value: 'completed', label: 'Concluído' },
    { value: 'cancelled', label: 'Cancelado' },
];

function InterestCard({ row }: { row: InterestRow }) {
    const [statusOpen, setStatusOpen] = useState(false);
    const [reviewOpen, setReviewOpen] = useState(false);

    const statusForm = useForm({ status: row.status });
    const reviewForm = useForm({ rating: 5, comment: '' });
    const messageForm = useForm({ body: '' });

    return (
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <Link href={row.show_url} className="font-semibold text-zinc-900 hover:text-brand-600 dark:text-white">
                {row.listing_title}
            </Link>
            <p className="text-xs text-zinc-500">
                {row.listing_type_label} · {row.category_name} · com {row.counterpart_name}
            </p>
            <span className="mt-1 inline-block rounded-full bg-zinc-100 px-2 py-0.5 text-xs dark:bg-zinc-800">
                {row.status_label}
            </span>
            <div className="mt-3 flex flex-wrap gap-2">
                <SecondaryButton type="button" onClick={() => setStatusOpen(true)}>
                    Atualizar status
                </SecondaryButton>
                {row.can_review && (
                    <SecondaryButton type="button" onClick={() => setReviewOpen(true)}>
                        Avaliar
                    </SecondaryButton>
                )}
            </div>

            <form
                className="mt-3 space-y-2"
                onSubmit={(e) => {
                    e.preventDefault();
                    messageForm.post(route('mobile.talents.interest.messages', row.id), {
                        onSuccess: () => messageForm.reset(),
                    });
                }}
            >
                <p className="text-xs text-zinc-500 dark:text-zinc-400">{CHAT_MESSAGE_SENDS_EMAIL_SUBTITLE}</p>
                <div className="flex gap-2">
                <TextInput
                    className="flex-1"
                    placeholder="Enviar mensagem..."
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
                        statusForm.patch(route('mobile.talents.interest.status', row.id), {
                            ...inertiaListModalSave,
                        });
                    }}
                >
                    <InputLabel value="Novo status" />
                    <SelectInput
                        className="w-full"
                        value={statusForm.data.status}
                        onChange={(e) => statusForm.setData('status', e.target.value)}
                    >
                        {statusOptions.map((o) => (
                            <option key={o.value} value={o.value}>
                                {o.label}
                            </option>
                        ))}
                    </SelectInput>
                    <PrimaryButton disabled={statusForm.processing}>Salvar</PrimaryButton>
                </form>
            </Modal>

            <Modal show={reviewOpen} onClose={() => setReviewOpen(false)}>
                <form
                    className="space-y-4 p-6"
                    onSubmit={(e) => {
                        e.preventDefault();
                        reviewForm.post(route('mobile.talents.interest.review', row.id), {
                            ...inertiaListModalSave,
                        });
                    }}
                >
                    <InputLabel value="Nota (1 a 5)" />
                    <SelectInput
                        className="w-full"
                        value={String(reviewForm.data.rating)}
                        onChange={(e) => reviewForm.setData('rating', Number(e.target.value))}
                    >
                        {[5, 4, 3, 2, 1].map((n) => (
                            <option key={n} value={n}>
                                {n} estrela{n > 1 ? 's' : ''}
                            </option>
                        ))}
                    </SelectInput>
                    <InputLabel value="Comentário (opcional)" />
                    <TextInput
                        className="w-full"
                        value={reviewForm.data.comment}
                        onChange={(e) => reviewForm.setData('comment', e.target.value)}
                    />
                    <PrimaryButton disabled={reviewForm.processing}>Enviar avaliação</PrimaryButton>
                </form>
            </Modal>
        </div>
    );
}

export default function TalentConnectionMyInterests({ asInterested, asPublisher }: Props) {
    return (
        <MobileLayout>
            <Head title="Meus interesses" />
            <FlashMessages />
            <div className="mx-auto max-w-3xl space-y-8">
                <Link href={route('mobile.talents.index')} className="text-sm font-medium text-brand-600">
                    ← Central de Serviços
                </Link>
                <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Meus interesses</h1>

                <section>
                    <h2 className="mb-3 text-lg font-semibold text-zinc-800 dark:text-zinc-200">Onde busquei ajuda</h2>
                    {asInterested.length === 0 ? (
                        <p className="text-sm text-zinc-500">Nenhum interesse registrado ainda.</p>
                    ) : (
                        <div className="space-y-3">
                            {asInterested.map((row) => (
                                <InterestCard key={row.id} row={row} />
                            ))}
                        </div>
                    )}
                </section>

                <section>
                    <h2 className="mb-3 text-lg font-semibold text-zinc-800 dark:text-zinc-200">
                        Interessados nas minhas publicações
                    </h2>
                    {asPublisher.length === 0 ? (
                        <p className="text-sm text-zinc-500">Ninguém demonstrou interesse ainda.</p>
                    ) : (
                        <div className="space-y-3">
                            {asPublisher.map((row) => (
                                <InterestCard key={`pub-${row.id}`} row={row} />
                            ))}
                        </div>
                    )}
                </section>
            </div>
        </MobileLayout>
    );
}
