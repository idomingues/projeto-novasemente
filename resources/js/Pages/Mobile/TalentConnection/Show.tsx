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
import TalentListingContactPanel, {
    type TalentContactChannel,
} from '@/Components/Talents/TalentListingContactPanel';
import UserListAvatar from '@/Components/UserListAvatar';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { FormEventHandler, useState } from 'react';

interface Listing {
    id: number;
    title: string;
    type_label: string;
    category_name: string | null;
    description: string;
    locality: string | null;
    availability: string | null;
    notes: string | null;
    allows_exchange: boolean;
    allows_negotiation: boolean;
    photo_url: string | null;
    author_name: string | null;
    author_photo_url: string | null;
    author_locality: string | null;
    church_name: string | null;
    can_express_interest: boolean;
    has_interest: boolean;
    is_owner: boolean;
    is_example?: boolean;
    contact_channels?: TalentContactChannel[];
}

interface Props {
    listing: Listing;
    reportReasons: Record<string, string>;
}

export default function TalentConnectionShow({ listing, reportReasons }: Props) {
    const [reportOpen, setReportOpen] = useState(false);

    const interestForm = useForm({ message: '' });
    const reportForm = useForm({ reason: '', description: '' });

    const submitInterest: FormEventHandler = (e) => {
        e.preventDefault();
        interestForm.post(route('mobile.talents.interest', listing.id));
    };

    const submitReport: FormEventHandler = (e) => {
        e.preventDefault();
        reportForm.post(route('mobile.talents.report', listing.id), {
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
                    href={route('mobile.talents.index')}
                    className="text-sm font-medium text-brand-600 hover:text-brand-700"
                >
                    ← Voltar
                </Link>

                {listing.photo_url && (
                    <img src={listing.photo_url} alt="" className="h-48 w-full rounded-2xl object-cover sm:h-64" />
                )}

                {listing.is_example ? (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
                        <p className="font-semibold">Publicação de exemplo</p>
                        <p className="mt-1 text-amber-900/90 dark:text-amber-100/90">
                            Este anúncio existe só para mostrar como fica uma publicação real. Não envie interesse nem trate
                            como oferta ativa.
                        </p>
                    </div>
                ) : null}

                <div>
                    <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">{listing.title}</h1>
                    <p className="text-sm text-brand-700 dark:text-brand-400">{listing.type_label}</p>
                    <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                        {listing.category_name}
                        {listing.locality ? ` · ${listing.locality}` : ''}
                    </p>
                </div>

                {listing.contact_channels && listing.contact_channels.length > 0 ? (
                    <TalentListingContactPanel channels={listing.contact_channels} isExample={listing.is_example} />
                ) : null}

                <div className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                    <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-zinc-500">Membro</p>
                        <p className="text-lg font-semibold text-zinc-900 dark:text-white">{listing.author_name}</p>
                        {(listing.author_locality || listing.church_name) && (
                            <p className="text-sm text-zinc-600 dark:text-zinc-400">
                                {[listing.church_name, listing.author_locality].filter(Boolean).join(' · ')}
                            </p>
                        )}
                    </div>
                    <UserListAvatar
                        name={listing.author_name}
                        photoUrl={listing.author_photo_url}
                        size="lg"
                    />
                </div>

                <div className="prose prose-sm max-w-none dark:prose-invert">
                    <p className="whitespace-pre-wrap text-zinc-700 dark:text-zinc-300">{listing.description}</p>
                </div>

                {listing.availability && (
                    <div>
                        <p className="text-sm font-medium text-zinc-500">Disponibilidade</p>
                        <p className="text-zinc-800 dark:text-zinc-200">{listing.availability}</p>
                    </div>
                )}

                {listing.notes && (
                    <div>
                        <p className="text-sm font-medium text-zinc-500">Observações</p>
                        <p className="text-zinc-800 dark:text-zinc-200">{listing.notes}</p>
                    </div>
                )}

                <div className="flex flex-wrap gap-2 text-sm text-zinc-600">
                    {listing.allows_exchange && (
                        <span className="rounded-full bg-brand-50 px-3 py-1 dark:bg-brand-950">Aceita troca</span>
                    )}
                    {listing.allows_negotiation && (
                        <span className="rounded-full bg-zinc-100 px-3 py-1 dark:bg-zinc-800">Combinação direta</span>
                    )}
                </div>

                <p className="text-xs text-zinc-500">
                    Esta rede é para colaboração entre membros. Pagamentos, negociações e eventuais conflitos são
                    tratados fora do app, com responsabilidade mútua entre as partes.
                </p>

                {!listing.is_owner && listing.can_express_interest && !listing.has_interest && (
                    <form onSubmit={submitInterest} className="space-y-3 rounded-2xl border border-brand-200 bg-brand-50/50 p-4 dark:border-brand-900 dark:bg-brand-950/30">
                        <h2 className="font-semibold text-zinc-900 dark:text-white">Tenho interesse</h2>
                        <Textarea
                            placeholder="Mensagem opcional para o publicador..."
                            value={interestForm.data.message}
                            onChange={(e) => interestForm.setData('message', e.target.value)}
                            rows={3}
                            className="w-full"
                        />
                        <PrimaryButton disabled={interestForm.processing}>Demonstrar interesse</PrimaryButton>
                    </form>
                )}

                {listing.has_interest && (
                    <p className="rounded-xl bg-green-50 p-3 text-sm text-green-800 dark:bg-green-950 dark:text-green-200">
                        Você já demonstrou interesse. Acompanhe em{' '}
                        <Link href={route('mobile.talents.my-interests')} className="font-semibold underline">
                            Meus interesses
                        </Link>
                        .
                    </p>
                )}

                {!listing.is_owner && (
                    <button
                        type="button"
                        onClick={() => setReportOpen(true)}
                        className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400"
                    >
                        <ExclamationTriangleIcon className="h-4 w-4" />
                        Denunciar publicação
                    </button>
                )}
            </div>

            <Modal show={reportOpen} onClose={() => setReportOpen(false)}>
                <form onSubmit={submitReport} className="space-y-4 p-6">
                    <h2 className="text-lg font-semibold">Denunciar</h2>
                    <div>
                        <InputLabel value="Motivo" />
                        <SelectInput
                            className="mt-1 w-full"
                            value={reportForm.data.reason}
                            onChange={(e) => reportForm.setData('reason', e.target.value)}
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
                    <div>
                        <InputLabel value="Detalhes (opcional)" />
                        <Textarea
                            className="mt-1 w-full"
                            rows={3}
                            value={reportForm.data.description}
                            onChange={(e) => reportForm.setData('description', e.target.value)}
                        />
                    </div>
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
