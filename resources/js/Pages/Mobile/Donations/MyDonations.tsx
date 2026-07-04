import MobileLayout from '@/Layouts/MobileLayout';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import ListCardActionRow from '@/Components/ListCard/ListCardActionRow';
import ListCardTextActionButton from '@/Components/ListCard/ListCardTextActionButton';
import InputLabel from '@/Components/InputLabel';
import Modal from '@/Components/Modal';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { ArrowLeftIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { FormEventHandler, useState } from 'react';
import { inertiaListModalSave } from '@/utils/inertiaListModalSave';

interface Donation {
    id: number;
    campaign_id: number;
    campaign_title: string | null;
    amount: number;
    ocr_suggested_amount: number | null;
    amount_before_adjustment: number | null;
    confirmed_at: string;
    receipt_url: string | null;
    dispute_status: string | null;
    dispute_message: string | null;
    disputed_at: string | null;
    dispute_resolution_note: string | null;
    dispute_resolved_at: string | null;
    adjustment_note: string | null;
    adjusted_at: string | null;
    adjustment_history: {
        amount_before: number;
        amount_after: number;
        adjustment_note: string;
        created_at: string;
    }[];
    can_dispute: boolean;
}

interface Props {
    donations: Donation[];
}

function formatBrl(value: number): string {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function disputeLabel(status: string | null): string | null {
    if (status === 'pending') return 'Em análise';
    if (status === 'resolved') return 'Resolvida';
    return null;
}

export default function MyDonations({ donations }: Props) {
    const page = usePage();
    const flash = (page.props as { flash?: { success?: string; error?: string } }).flash;

    const [disputeDonation, setDisputeDonation] = useState<Donation | null>(null);
    const { data, setData, post, processing, errors, reset, clearErrors } = useForm({
        dispute_message: '',
    });

    const openDispute = (donation: Donation) => {
        setDisputeDonation(donation);
        reset();
        clearErrors();
        setData('dispute_message', donation.dispute_message ?? '');
    };

    const closeDispute = () => {
        setDisputeDonation(null);
        reset();
    };

    const submitDispute: FormEventHandler = (e) => {
        e.preventDefault();
        if (!disputeDonation) return;
        post(route('mobile.donations.dispute', disputeDonation.id), {
            ...inertiaListModalSave,
            onSuccess: () => reset(),
        });
    };

    return (
        <MobileLayout>
            <Head title="Minhas doações" />
            <div className="mx-auto max-w-3xl space-y-6">
                <Link
                    href={route('mobile.donations.index')}
                    className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 dark:text-brand-400"
                >
                    <ArrowLeftIcon className="h-4 w-4" />
                    Voltar às campanhas
                </Link>

                <div>
                    <h1 className="text-2xl font-bold text-zinc-900 dark:text-white sm:text-3xl">Minhas doações</h1>
                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                        Acompanhe suas contribuições e solicite revisão se o valor registrado estiver incorreto.
                    </p>
                </div>

                <div className="rounded-xl border border-sky-200 bg-sky-50/80 px-4 py-3 text-sm text-sky-950 dark:border-sky-900/50 dark:bg-sky-950/30 dark:text-sky-100">
                    <p className="font-medium">Transparência</p>
                    <p className="mt-1 text-sky-900/90 dark:text-sky-100/90">
                        Guardamos valor, data e comprovante de cada doação. O comprovante fica acessível apenas à equipe
                        financeira da igreja — não é publicado no app. Se algo estiver errado, use «Reportar problema» na
                        doação correspondente.
                    </p>
                </div>

                {flash?.success && (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
                        {flash.success}
                    </div>
                )}
                {flash?.error && (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
                        {flash.error}
                    </div>
                )}

                {donations.length === 0 ? (
                    <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-900">
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">Você ainda não registrou doações em campanhas.</p>
                        <Link
                            href={route('mobile.donations.index')}
                            className="mt-4 inline-block text-sm font-medium text-brand-600 dark:text-brand-400"
                        >
                            Ver campanhas ativas
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {donations.map((d) => {
                            const disputeBadge = disputeLabel(d.dispute_status);
                            return (
                                <article
                                    key={d.id}
                                    className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
                                >
                                    <div className="flex flex-wrap items-start justify-between gap-2">
                                        <div>
                                            <h2 className="font-semibold text-zinc-900 dark:text-white">
                                                {d.campaign_title ?? 'Campanha'}
                                            </h2>
                                            <p className="mt-1 text-sm text-zinc-500">
                                                {new Date(d.confirmed_at).toLocaleString('pt-BR')}
                                            </p>
                                        </div>
                                        <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                                            {formatBrl(d.amount)}
                                        </p>
                                    </div>

                                    {d.amount_before_adjustment !== null && (
                                        <p className="mt-2 text-xs text-zinc-500">
                                            Valor original: {formatBrl(d.amount_before_adjustment)}
                                            {d.adjusted_at && ` · Ajustado em ${new Date(d.adjusted_at).toLocaleDateString('pt-BR')}`}
                                        </p>
                                    )}
                                    {d.ocr_suggested_amount !== null && (
                                        <p className="mt-1 text-xs text-zinc-500">
                                            Valor lido no comprovante: {formatBrl(d.ocr_suggested_amount)}
                                        </p>
                                    )}
                                    {d.adjustment_history.length > 0 ? (
                                        <div className="mt-2 space-y-2">
                                            {d.adjustment_history.map((entry, idx) => (
                                                <p
                                                    key={`${entry.created_at}-${idx}`}
                                                    className="rounded-lg bg-zinc-50 px-3 py-2 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                                                >
                                                    <span className="font-medium">Ajuste registrado:</span>{' '}
                                                    {formatBrl(entry.amount_before)} → {formatBrl(entry.amount_after)} ·{' '}
                                                    {new Date(entry.created_at).toLocaleDateString('pt-BR')}
                                                    <span className="mt-1 block">{entry.adjustment_note}</span>
                                                </p>
                                            ))}
                                        </div>
                                    ) : (
                                        d.adjustment_note && (
                                            <p className="mt-2 rounded-lg bg-zinc-50 px-3 py-2 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                                                <span className="font-medium">Observação da equipe:</span> {d.adjustment_note}
                                            </p>
                                        )
                                    )}

                                    {disputeBadge && (
                                        <span
                                            className={`mt-3 inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                                d.dispute_status === 'pending'
                                                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200'
                                                    : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200'
                                            }`}
                                        >
                                            Reclamação: {disputeBadge}
                                        </span>
                                    )}

                                    {d.dispute_message && (
                                        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                                            <span className="font-medium">Sua mensagem:</span> {d.dispute_message}
                                        </p>
                                    )}
                                    {d.dispute_resolution_note && (
                                        <p className="mt-2 rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-900 dark:bg-brand-950/40 dark:text-brand-100">
                                            <span className="font-medium">Resposta da equipe:</span> {d.dispute_resolution_note}
                                        </p>
                                    )}

                                    <ListCardActionRow className="mt-4">
                                        {d.receipt_url && (
                                            <a
                                                href={d.receipt_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex h-9 items-center text-xs font-medium text-brand-600 hover:underline dark:text-brand-400"
                                            >
                                                Ver comprovante
                                            </a>
                                        )}
                                        {d.can_dispute && (
                                            <ListCardTextActionButton
                                                type="button"
                                                icon={<ExclamationTriangleIcon className="h-4 w-4" />}
                                                onClick={() => openDispute(d)}
                                            >
                                                Solicitar revisão
                                            </ListCardTextActionButton>
                                        )}
                                    </ListCardActionRow>
                                </article>
                            );
                        })}
                    </div>
                )}
            </div>

            <Modal show={disputeDonation !== null} onClose={closeDispute} maxWidth="md">
                <form onSubmit={submitDispute} className="space-y-4 p-6">
                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">Solicitar revisão</h3>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        Explique o que está incorreto (valor no comprovante, valor registrado, etc.). A equipe financeira irá
                        analisar.
                    </p>
                    <div>
                        <InputLabel htmlFor="dispute_message" value="Descreva o problema" />
                        <textarea
                            id="dispute_message"
                            value={data.dispute_message}
                            onChange={(e) => setData('dispute_message', e.target.value)}
                            rows={5}
                            className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900 dark:text-white"
                            placeholder="Ex.: O comprovante mostra R$ 150,00, mas foi registrado R$ 15,00."
                            required
                        />
                        {errors.dispute_message && (
                            <p className="mt-1 text-sm text-red-600">{errors.dispute_message}</p>
                        )}
                    </div>
                    <div className="flex justify-end gap-2">
                        <SecondaryButton type="button" onClick={closeDispute}>
                            Cancelar
                        </SecondaryButton>
                        <PrimaryButton disabled={processing}>Enviar reclamação</PrimaryButton>
                    </div>
                </form>
            </Modal>
        </MobileLayout>
    );
}
