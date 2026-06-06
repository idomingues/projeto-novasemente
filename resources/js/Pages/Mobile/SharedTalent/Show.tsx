import MobileLayout from '@/Layouts/MobileLayout';
import FlashMessages from '@/Components/FlashMessages';
import Modal from '@/Components/Modal';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import InputLabel from '@/Components/InputLabel';
import Textarea from '@/Components/Textarea';
import SelectInput from '@/Components/SelectInput';
import InputError from '@/Components/InputError';
import { Head, Link, useForm } from '@inertiajs/react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { FormEventHandler, useState } from 'react';

interface Listing {
    id: number;
    title: string;
    category_name: string | null;
    description: string;
    locality: string | null;
    modality_label: string;
    age_range_label: string;
    available_days: string | null;
    schedule_time: string | null;
    frequency: string | null;
    duration_estimate: string | null;
    notes: string | null;
    photo_url: string | null;
    author_name: string | null;
    author_locality: string | null;
    church_name: string | null;
    slots_remaining: number;
    slots_total: number;
    can_enroll: boolean;
    has_enrollment: boolean;
    is_owner: boolean;
    is_example?: boolean;
}

interface Props {
    listing: Listing;
    reportReasons: Record<string, string>;
}

export default function SharedTalentShow({ listing, reportReasons }: Props) {
    const [reportOpen, setReportOpen] = useState(false);
    const enrollForm = useForm({ message: '' });
    const reportForm = useForm({ reason: '', description: '' });

    const submitEnroll: FormEventHandler = (e) => {
        e.preventDefault();
        enrollForm.post(route('mobile.shared-talents.enroll', listing.id));
    };

    const submitReport: FormEventHandler = (e) => {
        e.preventDefault();
        reportForm.post(route('mobile.shared-talents.report', listing.id), {
            onSuccess: () => {
                setReportOpen(false);
                reportForm.reset();
            },
        });
    };

    return (
        <MobileLayout>
            <Head title={listing.title} />
            <FlashMessages />
            <div className="mx-auto max-w-3xl space-y-6">
                <Link
                    href={route('mobile.shared-talents.index')}
                    className="text-sm font-medium text-brand-600 hover:text-brand-700"
                >
                    ← Explorar talentos
                </Link>

                {listing.photo_url && (
                    <img src={listing.photo_url} alt="" className="h-48 w-full rounded-2xl object-cover sm:h-64" />
                )}

                {listing.is_example ? (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
                        <p className="font-semibold">Publicação de exemplo</p>
                        <p className="mt-1 text-amber-900/90 dark:text-amber-100/90">
                            Este talento compartilhado é apenas demonstração visual. Não há inscrições reais neste anúncio.
                        </p>
                    </div>
                ) : null}

                <div>
                    <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">{listing.title}</h1>
                    <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                        {listing.category_name} · {listing.modality_label} · {listing.age_range_label}
                    </p>
                    <p className="mt-1 text-sm font-medium text-brand-700 dark:text-brand-400">
                        {listing.slots_remaining} vaga(s) de {listing.slots_total}
                    </p>
                </div>

                <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                    <p className="text-sm font-medium text-zinc-500">Responsável</p>
                    <p className="text-lg font-semibold text-zinc-900 dark:text-white">{listing.author_name}</p>
                    {(listing.author_locality || listing.church_name) && (
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">
                            {[listing.church_name, listing.author_locality].filter(Boolean).join(' · ')}
                        </p>
                    )}
                </div>

                <p className="whitespace-pre-wrap text-zinc-700 dark:text-zinc-300">{listing.description}</p>

                {(listing.available_days || listing.schedule_time) && (
                    <div>
                        <p className="text-sm font-medium text-zinc-500">Agenda</p>
                        <p className="text-zinc-800 dark:text-zinc-200">
                            {[listing.available_days, listing.schedule_time].filter(Boolean).join(' · ')}
                        </p>
                        {listing.frequency && <p className="text-sm text-zinc-600">Frequência: {listing.frequency}</p>}
                        {listing.duration_estimate && (
                            <p className="text-sm text-zinc-600">Duração: {listing.duration_estimate}</p>
                        )}
                    </div>
                )}

                {listing.locality && (
                    <p className="text-sm text-zinc-600">
                        <span className="font-medium">Local:</span> {listing.locality}
                    </p>
                )}

                {listing.notes && (
                    <div>
                        <p className="text-sm font-medium text-zinc-500">Observações</p>
                        <p className="text-zinc-800 dark:text-zinc-200">{listing.notes}</p>
                    </div>
                )}

                {listing.can_enroll && !listing.has_enrollment && (
                    <form onSubmit={submitEnroll} className="space-y-3 rounded-2xl border border-brand-200 bg-brand-50 p-4 dark:border-brand-800 dark:bg-brand-950/40">
                        <h2 className="font-semibold text-zinc-900 dark:text-white">Participar</h2>
                        <Textarea
                            placeholder="Mensagem opcional para o responsável..."
                            value={enrollForm.data.message}
                            onChange={(e) => enrollForm.setData('message', e.target.value)}
                            rows={2}
                        />
                        <PrimaryButton disabled={enrollForm.processing}>Solicitar participação</PrimaryButton>
                    </form>
                )}

                {listing.has_enrollment && (
                    <p className="rounded-xl bg-zinc-100 p-4 text-sm dark:bg-zinc-800">
                        Você já possui uma inscrição.{' '}
                        <Link href={route('mobile.shared-talents.my-enrollments')} className="font-semibold underline">
                            Acompanhar status
                        </Link>
                    </p>
                )}

                <button
                    type="button"
                    onClick={() => setReportOpen(true)}
                    className="flex items-center gap-2 text-sm text-zinc-500 hover:text-red-600"
                >
                    <ExclamationTriangleIcon className="h-4 w-4" />
                    Denunciar
                </button>
            </div>

            <Modal show={reportOpen} onClose={() => setReportOpen(false)}>
                <form onSubmit={submitReport} className="space-y-4 p-6">
                    <h2 className="text-lg font-semibold">Denunciar publicação</h2>
                    <div>
                        <InputLabel value="Motivo" />
                        <SelectInput
                            className="mt-1 w-full"
                            value={reportForm.data.reason}
                            onChange={(e) => reportForm.setData('reason', e.target.value)}
                            required
                        >
                            <option value="">Selecione</option>
                            {Object.entries(reportReasons).map(([value, label]) => (
                                <option key={value} value={value}>
                                    {label}
                                </option>
                            ))}
                        </SelectInput>
                        <InputError message={reportForm.errors.reason} />
                    </div>
                    <Textarea
                        placeholder="Detalhes (opcional)"
                        value={reportForm.data.description}
                        onChange={(e) => reportForm.setData('description', e.target.value)}
                        rows={3}
                    />
                    <div className="flex justify-end gap-2">
                        <SecondaryButton type="button" onClick={() => setReportOpen(false)}>
                            Cancelar
                        </SecondaryButton>
                        <PrimaryButton disabled={reportForm.processing}>Enviar denúncia</PrimaryButton>
                    </div>
                </form>
            </Modal>
        </MobileLayout>
    );
}
