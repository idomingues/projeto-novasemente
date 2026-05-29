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

interface EnrollmentRow {
    id: number;
    status: string;
    status_label: string;
    listing_title: string;
    category_name: string | null;
    counterpart_name: string | null;
    show_url: string;
    can_review: boolean;
    messages: { id: number; body: string; author_name: string | null; is_mine: boolean; created_at: string | null }[];
}

interface Props {
    enrollments: EnrollmentRow[];
}

export default function SharedTalentMyEnrollments({ enrollments }: Props) {
    return (
        <MobileLayout>
            <Head title="Minhas inscrições" />
            <FlashMessages />
            <div className="mx-auto max-w-3xl space-y-6">
                <Link href={route('mobile.shared-talents.index')} className="text-sm font-medium text-brand-600">
                    ← Doar Talentos
                </Link>
                <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Minhas inscrições</h1>
                {enrollments.length === 0 ? (
                    <p className="text-sm text-zinc-600">Você ainda não se inscreveu em nenhum talento.</p>
                ) : (
                    enrollments.map((row) => <EnrollmentCard key={row.id} row={row} />)
                )}
            </div>
        </MobileLayout>
    );
}

function EnrollmentCard({ row }: { row: EnrollmentRow }) {
    const [reviewOpen, setReviewOpen] = useState(false);
    const reviewForm = useForm({ rating: 5, comment: '' });
    const messageForm = useForm({ body: '' });
    const cancelForm = useForm({ status: 'cancelled' });

    return (
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <Link href={row.show_url} className="font-semibold text-zinc-900 hover:text-brand-600 dark:text-white">
                {row.listing_title}
            </Link>
            <p className="text-xs text-zinc-500">
                {row.category_name} · com {row.counterpart_name}
            </p>
            <span className="mt-1 inline-block rounded-full bg-zinc-100 px-2 py-0.5 text-xs dark:bg-zinc-800">
                {row.status_label}
            </span>

            {row.messages.length > 0 && (
                <div className="mt-3 max-h-40 space-y-2 overflow-y-auto rounded-lg bg-zinc-50 p-2 text-sm dark:bg-zinc-800">
                    {row.messages.map((m) => (
                        <div key={m.id} className={m.is_mine ? 'text-right' : ''}>
                            <span className="text-xs text-zinc-500">{m.author_name}</span>
                            <p>{m.body}</p>
                        </div>
                    ))}
                </div>
            )}

            <form
                className="mt-3 space-y-2"
                onSubmit={(e) => {
                    e.preventDefault();
                    messageForm.post(route('mobile.shared-talents.enrollment.messages', row.id), {
                        onSuccess: () => messageForm.reset(),
                    });
                }}
            >
                <p className="text-xs text-zinc-500">{CHAT_MESSAGE_SENDS_EMAIL_SUBTITLE}</p>
                <div className="flex gap-2">
                    <TextInput
                        className="flex-1"
                        placeholder="Mensagem..."
                        value={messageForm.data.body}
                        onChange={(e) => messageForm.setData('body', e.target.value)}
                    />
                    <PrimaryButton disabled={messageForm.processing}>Enviar</PrimaryButton>
                </div>
            </form>

            <div className="mt-3 flex flex-wrap gap-2">
                {row.can_review && (
                    <SecondaryButton type="button" onClick={() => setReviewOpen(true)}>
                        Avaliar experiência
                    </SecondaryButton>
                )}
                {!['cancelled', 'rejected', 'completed'].includes(row.status) && (
                    <SecondaryButton
                        type="button"
                        onClick={() =>
                            cancelForm.patch(route('mobile.shared-talents.enrollment.status', row.id))
                        }
                    >
                        Cancelar participação
                    </SecondaryButton>
                )}
            </div>

            <Modal show={reviewOpen} onClose={() => setReviewOpen(false)}>
                <form
                    className="space-y-4 p-6"
                    onSubmit={(e) => {
                        e.preventDefault();
                        reviewForm.post(route('mobile.shared-talents.enrollment.review', row.id), {
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
