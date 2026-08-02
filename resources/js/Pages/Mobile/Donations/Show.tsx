import MobileLayout from '@/Layouts/MobileLayout';
import DonationProgressBar from '@/Components/Donations/DonationProgressBar';
import type { DonationTransparencyInfo } from '@/Components/Donations/DonationTransparencyNotice';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import Modal from '@/Components/Modal';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { GALLERY_IMAGE_ACCEPT } from '@/utils/mobilePhotoPick';
import {
    ArrowLeftIcon,
    CheckIcon,
    DocumentDuplicateIcon,
    PlayCircleIcon,
    XMarkIcon,
} from '@heroicons/react/24/outline';
import { FormEventHandler, useState } from 'react';

interface CampaignPhoto {
    id: number;
    image_url: string;
}

interface Campaign {
    id: number;
    title: string;
    description: string | null;
    type: 'money' | 'items';
    goal_amount: number;
    raised_amount: number;
    remaining_amount: number;
    goal_quantity: number | null;
    pledged_quantity: number;
    collected_quantity: number;
    remaining_quantity: number;
    unit_label: string | null;
    progress_percent: number;
    status: string;
    starts_at: string | null;
    ends_at: string | null;
    cover_image_url: string | null;
    accepting_donations: boolean;
    story_video_url: string | null;
    story_youtube_embed_url: string | null;
    story_photos: CampaignPhoto[];
    thanks_is_published: boolean;
    thanks_message: string | null;
    thanks_published_at: string | null;
    thanks_photos: CampaignPhoto[];
}

interface RecentDonation {
    donor_name: string;
    entry_type?: 'money' | 'item';
    amount?: number;
    item_description?: string;
    quantity?: number;
    unit_label?: string | null;
    status?: string;
    confirmed_at: string;
}

interface Props {
    campaign: Campaign;
    recentDonations: RecentDonation[];
    donationUrl: string | null;
    transparency: DonationTransparencyInfo;
    pix: {
        church_name: string | null;
        pix_key: string | null;
    };
    localOffer: {
        pixKey: string;
        merchantName: string;
        merchantCity: string;
    };
}

function formatCampaignDate(value: string): string {
    return new Date(`${value}T12:00:00`).toLocaleDateString('pt-BR');
}

function formatQuantity(value: number, unitLabel?: string | null): string {
    return unitLabel ? `${value} ${unitLabel}` : `${value}`;
}

function campaignStartsInFuture(startsAt: string | null): boolean {
    if (!startsAt) {
        return false;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return new Date(`${startsAt}T12:00:00`).getTime() > today.getTime();
}

function ProcessSteps({ current }: { current: 1 | 2 | 3 }) {
    const steps = [
        { n: 1 as const, label: 'PIX' },
        { n: 2 as const, label: 'Comprovante' },
        { n: 3 as const, label: 'Confirmar' },
    ];

    return (
        <ol className="flex items-center gap-1.5 sm:gap-2" aria-label="Passos da doação">
            {steps.map((step, index) => {
                const done = current > step.n;
                const active = current === step.n;
                return (
                    <li key={step.n} className="flex min-w-0 flex-1 items-center gap-1.5 sm:gap-2">
                        {index > 0 && (
                            <span
                                className={`h-px min-w-2 flex-1 ${done || active ? 'bg-zinc-300 dark:bg-zinc-600' : 'bg-zinc-200 dark:bg-zinc-800'}`}
                                aria-hidden
                            />
                        )}
                        <span
                            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                                done || active
                                    ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
                                    : 'bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500'
                            }`}
                        >
                            {done ? <CheckIcon className="h-3.5 w-3.5" strokeWidth={2.5} /> : step.n}
                        </span>
                        <span
                            className={`hidden truncate text-xs font-medium sm:inline ${
                                active || done
                                    ? 'text-zinc-900 dark:text-zinc-100'
                                    : 'text-zinc-400 dark:text-zinc-500'
                            }`}
                        >
                            {step.label}
                        </span>
                    </li>
                );
            })}
        </ol>
    );
}

export default function MobileDonationShow({ campaign, recentDonations, transparency, pix, localOffer }: Props) {
    const page = usePage();
    const csrf = (page.props as { csrf_token?: string }).csrf_token ?? '';
    const flash = (page.props as { flash?: { success?: string; error?: string } }).flash;
    const auth = (page.props as { auth?: { user?: { name: string } | null } }).auth;
    const isLoggedIn = Boolean(auth?.user);

    const [donateOpen, setDonateOpen] = useState(false);
    const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [confirmStep, setConfirmStep] = useState(false);
    const [suggestedAmount, setSuggestedAmount] = useState<number | null>(null);
    const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
    const [pixCopied, setPixCopied] = useState(false);

    const { data, setData, post, processing, errors, reset } = useForm({
        amount: '',
        is_anonymous: false,
        send_email_confirmation: false,
    });

    const itemForm = useForm({
        item_description: '',
        quantity: '1',
        notes: '',
        is_anonymous: false,
    });

    const pixKey = pix.pix_key?.trim() || localOffer.pixKey;
    const processStep: 1 | 2 | 3 = confirmStep ? 3 : 2;
    const availabilityMessage = !campaign.accepting_donations
        ? campaign.status === 'active' && campaign.starts_at && campaignStartsInFuture(campaign.starts_at)
            ? `Esta campanha começa em ${formatCampaignDate(campaign.starts_at)}.`
            : campaign.type === 'items'
              ? 'Esta campanha não está aceitando novos compromissos no momento.'
              : 'Esta campanha não está aceitando doações no momento.'
        : null;

    const copyPix = () => {
        if (!pixKey) return;
        navigator.clipboard.writeText(pixKey).then(() => {
            setPixCopied(true);
            setTimeout(() => setPixCopied(false), 2000);
        });
    };

    const handleReceiptUpload = async (file: File) => {
        setUploadError(null);
        setUploading(true);
        setConfirmStep(false);
        setSuggestedAmount(null);

        const formData = new FormData();
        formData.append('receipt', file);

        try {
            const res = await fetch(route('mobile.donations.receipt', campaign.id), {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'X-CSRF-TOKEN': csrf,
                    'X-Requested-With': 'XMLHttpRequest',
                },
                credentials: 'same-origin',
                body: formData,
            });

            const json = await res.json();

            if (!res.ok) {
                setUploadError(json.message ?? 'Não foi possível processar o comprovante.');
                return;
            }

            setReceiptPreview(json.receipt_preview_url ?? URL.createObjectURL(file));
            const suggested = json.suggested_amount as number | null;
            setSuggestedAmount(suggested);
            setData('amount', suggested !== null ? String(suggested) : '');
            setConfirmStep(true);
        } catch {
            setUploadError('Erro ao enviar o comprovante. Tente novamente.');
        } finally {
            setUploading(false);
        }
    };

    const submitDonation: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('mobile.donations.donate', campaign.id), {
            onSuccess: () => {
                setDonateOpen(false);
                setConfirmStep(false);
                reset();
                setReceiptPreview(null);
                setSuggestedAmount(null);
            },
        });
    };

    const submitItemPledge: FormEventHandler = (e) => {
        e.preventDefault();
        itemForm.post(route('mobile.donations.items.pledge', campaign.id), {
            onSuccess: () => {
                setDonateOpen(false);
                itemForm.reset();
            },
        });
    };

    const openDonateModal = () => {
        reset();
        itemForm.reset();
        setConfirmStep(false);
        setReceiptPreview(null);
        setSuggestedAmount(null);
        setUploadError(null);
        setPixCopied(false);
        setDonateOpen(true);
    };


    return (
        <MobileLayout>
            <Head title={campaign.title} />
            <div className="mx-auto max-w-3xl space-y-6">
                <div className="flex items-start justify-between gap-3">
                    <Link
                        href={route('mobile.donations.index')}
                        className="inline-flex min-w-0 flex-1 items-center gap-1 text-sm font-medium text-brand-600 dark:text-brand-400"
                    >
                        <ArrowLeftIcon className="h-4 w-4 shrink-0" />
                        <span className="truncate">Voltar às campanhas</span>
                    </Link>
                    {isLoggedIn ? (
                        <Link
                            href={route('mobile.donations.my-donations')}
                            className="inline-flex shrink-0 whitespace-nowrap text-right text-sm font-medium text-zinc-600 underline dark:text-zinc-400"
                        >
                            Minhas doações
                        </Link>
                    ) : null}
                </div>

                {flash?.success && (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
                        {flash.success}
                        {isLoggedIn ? (
                            <Link
                                href={route('mobile.donations.my-donations')}
                                className="mt-2 block font-medium text-emerald-900 underline dark:text-emerald-100"
                            >
                                Ver em Minhas doações
                            </Link>
                        ) : null}
                    </div>
                )}

                {campaign.cover_image_url && (
                    <div className="overflow-hidden rounded-2xl bg-zinc-100 dark:bg-zinc-800">
                        <img
                            src={campaign.cover_image_url}
                            alt=""
                            className="mx-auto w-full max-h-64 object-contain sm:max-h-[28rem] lg:max-h-[32rem]"
                        />
                    </div>
                )}

                <div>
                    <h1 className="text-2xl font-bold text-zinc-900 dark:text-white sm:text-3xl">{campaign.title}</h1>
                    {(campaign.starts_at || campaign.ends_at) && (
                        <p className="mt-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                            {campaign.starts_at ? `Início: ${formatCampaignDate(campaign.starts_at)}` : ''}
                            {campaign.starts_at && campaign.ends_at ? ' · ' : ''}
                            {campaign.ends_at ? `Prazo: ${formatCampaignDate(campaign.ends_at)}` : ''}
                        </p>
                    )}
                    {campaign.description && (
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                            {campaign.description}
                        </p>
                    )}
                </div>

                {(campaign.story_youtube_embed_url || campaign.story_photos.length > 0) && (
                    <section className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                        <h2 className="mb-3 flex items-center gap-2 font-semibold text-zinc-900 dark:text-white">
                            <PlayCircleIcon className="h-5 w-5 text-brand-600" />
                            {campaign.story_youtube_embed_url ? 'Fotos e vídeo do projeto' : 'Fotos do projeto'}
                        </h2>
                        <p className="mb-3 text-sm text-zinc-600 dark:text-zinc-400">
                            Acompanhe registros visuais deste projeto e compartilhe com outras pessoas o que está acontecendo.
                        </p>
                        {campaign.story_youtube_embed_url && (
                            <div className="aspect-video w-full overflow-hidden rounded-xl bg-black">
                                <iframe
                                    title="Vídeo da campanha"
                                    src={`${campaign.story_youtube_embed_url}?rel=0`}
                                    className="h-full w-full"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                />
                            </div>
                        )}
                        {campaign.story_photos.length > 0 && (
                            <div className={`grid grid-cols-2 gap-2 sm:grid-cols-3 ${campaign.story_youtube_embed_url ? 'mt-3' : ''}`}>
                                {campaign.story_photos.map((photo) => (
                                    <button
                                        key={photo.id}
                                        type="button"
                                        onClick={() => setLightboxUrl(photo.image_url)}
                                        className="overflow-hidden rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
                                    >
                                        <img src={photo.image_url} alt="" className="h-28 w-full object-cover" />
                                    </button>
                                ))}
                            </div>
                        )}
                    </section>
                )}

                <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                    <DonationProgressBar
                        raisedAmount={campaign.type === 'items' ? campaign.collected_quantity : campaign.raised_amount}
                        goalAmount={campaign.type === 'items' ? campaign.goal_quantity ?? 0 : campaign.goal_amount}
                        remainingAmount={campaign.type === 'items' ? campaign.remaining_quantity : campaign.remaining_amount}
                        progressPercent={campaign.progress_percent}
                        valueMode={campaign.type === 'items' ? 'quantity' : 'currency'}
                        unitLabel={campaign.unit_label}
                        pendingAmount={campaign.type === 'items' ? Math.max(0, campaign.pledged_quantity - campaign.collected_quantity) : null}
                    />
                </div>

                {campaign.type === 'items' && (
                    <section className="rounded-2xl border border-sky-200 bg-sky-50/80 p-4 dark:border-sky-900/40 dark:bg-sky-950/30">
                        <h2 className="font-semibold text-zinc-900 dark:text-white">Como funciona a doação de objetos</h2>
                        <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">
                            Registre aqui o item e a quantidade que você pretende doar. Quando a entrega acontecer, a equipe
                            confirma o recebimento e o progresso da campanha é atualizado.
                        </p>
                        <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">
                            Comprometidos: {formatQuantity(campaign.pledged_quantity, campaign.unit_label)} · Recebidos:{' '}
                            {formatQuantity(campaign.collected_quantity, campaign.unit_label)}
                        </p>
                    </section>
                )}

                {availabilityMessage && (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
                        {availabilityMessage}
                    </div>
                )}

                {campaign.accepting_donations && (
                    <PrimaryButton type="button" onClick={openDonateModal} className="w-full">
                        {campaign.type === 'items' ? 'Registrar compromisso de doação' : 'Fazer doação'}
                    </PrimaryButton>
                )}

                {campaign.thanks_is_published && (
                    <section className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/30">
                        <h2 className="font-semibold text-zinc-900 dark:text-white">Agradecimento</h2>
                        {campaign.thanks_message && (
                            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                                {campaign.thanks_message}
                            </p>
                        )}
                        {campaign.thanks_photos.length > 0 && (
                            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                                {campaign.thanks_photos.map((photo) => (
                                    <button
                                        key={photo.id}
                                        type="button"
                                        onClick={() => setLightboxUrl(photo.image_url)}
                                        className="overflow-hidden rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    >
                                        <img src={photo.image_url} alt="" className="h-28 w-full object-cover" />
                                    </button>
                                ))}
                            </div>
                        )}
                    </section>
                )}

                {recentDonations.length > 0 && (
                    <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                        <h2 className="mb-3 font-semibold text-zinc-900 dark:text-white">
                            {campaign.type === 'items' ? 'Compromissos recentes' : 'Doações recentes'}
                        </h2>
                        <ul className="space-y-2">
                            {recentDonations.map((d, i) => (
                                <li key={`${d.confirmed_at}-${i}`} className="flex items-center justify-between text-sm">
                                    <span className="text-zinc-700 dark:text-zinc-300">
                                        {d.donor_name}
                                        {d.item_description ? (
                                            <span className="mt-0.5 block text-xs text-zinc-500 dark:text-zinc-400">
                                                {d.item_description}
                                            </span>
                                        ) : null}
                                    </span>
                                    <span className="font-medium text-emerald-600 dark:text-emerald-400">
                                        {d.entry_type === 'item' && d.quantity !== undefined
                                            ? formatQuantity(d.quantity, d.unit_label)
                                            : (d.amount ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>

            <Modal show={donateOpen} onClose={() => setDonateOpen(false)} maxWidth="md">
                {campaign.type === 'money' ? (
                    <form onSubmit={submitDonation} className="space-y-5 p-6">
                        <div className="space-y-3">
                            <div>
                                <p className="text-xs font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                                    Doar
                                </p>
                                <h3 className="mt-1 text-lg font-semibold tracking-tight text-zinc-900 dark:text-white">
                                    {campaign.title}
                                </h3>
                            </div>
                            <ProcessSteps current={processStep} />
                        </div>

                        {!confirmStep ? (
                            <div className="space-y-5">
                                <section className="space-y-3">
                                    <div>
                                        <p className="text-xs font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                                            1. Faça o PIX
                                        </p>
                                        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                                            Copie a chave e pague no app do seu banco.
                                        </p>
                                    </div>
                                    <div className="rounded-2xl bg-zinc-50 px-3.5 py-3 dark:bg-zinc-950/50">
                                        <p className="break-all font-mono text-sm text-zinc-900 dark:text-zinc-100">{pixKey}</p>
                                        <button
                                            type="button"
                                            onClick={copyPix}
                                            className="mt-3 inline-flex cursor-pointer items-center gap-1.5 text-sm font-semibold text-zinc-900 transition hover:text-zinc-600 dark:text-white dark:hover:text-zinc-300"
                                        >
                                            {pixCopied ? (
                                                <>
                                                    <CheckIcon className="h-4 w-4" strokeWidth={2.25} />
                                                    Copiado
                                                </>
                                            ) : (
                                                <>
                                                    <DocumentDuplicateIcon className="h-4 w-4" />
                                                    Copiar chave
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </section>

                                <section className="space-y-3 border-t border-zinc-100 pt-5 dark:border-zinc-800">
                                    <div>
                                        <p className="text-xs font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                                            2. Envie o comprovante
                                        </p>
                                        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                                            Foto nítida do comprovante PIX. Fica só para conferência interna.
                                        </p>
                                    </div>
                                    <input
                                        type="file"
                                        accept={GALLERY_IMAGE_ACCEPT}
                                        disabled={uploading}
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) void handleReceiptUpload(file);
                                        }}
                                        className="block w-full cursor-pointer text-sm file:mr-3 file:cursor-pointer file:rounded-xl file:border-0 file:bg-zinc-900 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white dark:file:bg-white dark:file:text-zinc-900"
                                    />
                                    {uploading && <p className="text-sm text-zinc-500">Lendo comprovante...</p>}
                                    {uploadError && <p className="text-sm text-red-600">{uploadError}</p>}
                                </section>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div>
                                    <p className="text-xs font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                                        3. Confirme o valor
                                    </p>
                                </div>
                                {receiptPreview && (
                                    <img
                                        src={receiptPreview}
                                        alt="Comprovante"
                                        className="max-h-48 rounded-2xl object-contain ring-1 ring-zinc-200 dark:ring-zinc-700"
                                    />
                                )}
                                {suggestedAmount !== null ? (
                                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                                        Valor detectado:{' '}
                                        <strong className="text-zinc-900 dark:text-white">
                                            {suggestedAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                        </strong>
                                        . Confirme ou ajuste abaixo.
                                    </p>
                                ) : (
                                    <p className="text-sm text-amber-700 dark:text-amber-300">
                                        Não foi possível ler o valor automaticamente. Informe o valor manualmente.
                                    </p>
                                )}
                                <div>
                                    <InputLabel htmlFor="donation_amount" value="Valor da doação (R$)" />
                                    <TextInput
                                        id="donation_amount"
                                        type="number"
                                        step="0.01"
                                        min="0.01"
                                        value={data.amount}
                                        onChange={(e) => setData('amount', e.target.value)}
                                        className="mt-1 w-full"
                                        required
                                    />
                                    <InputError message={errors.amount} />
                                </div>
                                <div className="space-y-3">
                                    <label className="flex cursor-pointer items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                                        <input
                                            type="checkbox"
                                            className="mt-0.5 cursor-pointer"
                                            checked={data.is_anonymous}
                                            onChange={(e) => setData('is_anonymous', e.target.checked)}
                                        />
                                        <span>
                                            <span className="font-medium">Não exibir meu nome na lista pública</span>
                                            <span className="mt-0.5 block text-xs text-zinc-500 dark:text-zinc-400">
                                                Aparecerá como «Anônimo». A equipe financeira ainda identifica a doação.
                                            </span>
                                        </span>
                                    </label>
                                    {transparency.donor_email && (
                                        <label className="flex cursor-pointer items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                                            <input
                                                type="checkbox"
                                                className="mt-0.5 cursor-pointer"
                                                checked={data.send_email_confirmation}
                                                onChange={(e) => setData('send_email_confirmation', e.target.checked)}
                                            />
                                            <span>
                                                <span className="font-medium">Receber confirmação por e-mail</span>
                                                <span className="mt-0.5 block text-xs text-zinc-500 dark:text-zinc-400">
                                                    Enviaremos um resumo para {transparency.donor_email}.
                                                </span>
                                            </span>
                                        </label>
                                    )}
                                </div>
                                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                                    <SecondaryButton type="button" onClick={() => setConfirmStep(false)}>
                                        Trocar comprovante
                                    </SecondaryButton>
                                    <PrimaryButton disabled={processing}>Confirmar doação</PrimaryButton>
                                </div>
                            </div>
                        )}
                    </form>
                ) : (
                    <form onSubmit={submitItemPledge} className="space-y-4 p-6">
                        <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">Registrar compromisso de doação</h3>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">
                            Conte qual item você pretende entregar e em qual quantidade. A equipe confirmará depois o recebimento.
                        </p>
                        <div>
                            <InputLabel htmlFor="item_description" value="Item que você vai doar" />
                            <TextInput
                                id="item_description"
                                value={itemForm.data.item_description}
                                onChange={(e) => itemForm.setData('item_description', e.target.value)}
                                className="mt-1 w-full"
                                placeholder={campaign.title}
                                required
                            />
                            <InputError message={itemForm.errors.item_description} />
                        </div>
                        <div>
                            <InputLabel htmlFor="item_quantity" value={`Quantidade${campaign.unit_label ? ` (${campaign.unit_label})` : ''}`} />
                            <TextInput
                                id="item_quantity"
                                type="number"
                                min="1"
                                step="1"
                                value={itemForm.data.quantity}
                                onChange={(e) => itemForm.setData('quantity', e.target.value)}
                                className="mt-1 w-full"
                                required
                            />
                            <InputError message={itemForm.errors.quantity} />
                        </div>
                        <div>
                            <InputLabel htmlFor="item_notes" value="Observações (opcional)" />
                            <textarea
                                id="item_notes"
                                value={itemForm.data.notes}
                                onChange={(e) => itemForm.setData('notes', e.target.value)}
                                rows={4}
                                className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900 dark:text-white"
                                placeholder="Ex.: consigo entregar no sábado à tarde."
                            />
                            <InputError message={itemForm.errors.notes} />
                        </div>
                        <label className="flex items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                            <input
                                type="checkbox"
                                className="mt-0.5"
                                checked={itemForm.data.is_anonymous}
                                onChange={(e) => itemForm.setData('is_anonymous', e.target.checked)}
                            />
                            <span>
                                <span className="font-medium">Não exibir meu nome na lista pública</span>
                                <span className="mt-0.5 block text-xs text-zinc-500 dark:text-zinc-400">
                                    Seu compromisso pode aparecer como «Anônimo» para outras pessoas, mas a equipe verá quem fará a entrega.
                                </span>
                            </span>
                        </label>
                        <div className="flex justify-end gap-2">
                            <SecondaryButton type="button" onClick={() => setDonateOpen(false)}>
                                Cancelar
                            </SecondaryButton>
                            <PrimaryButton disabled={itemForm.processing}>Registrar compromisso</PrimaryButton>
                        </div>
                    </form>
                )}
            </Modal>

            {lightboxUrl && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
                    role="dialog"
                    aria-modal="true"
                    onClick={() => setLightboxUrl(null)}
                >
                    <button
                        type="button"
                        className="absolute right-4 top-4 cursor-pointer rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20"
                        onClick={() => setLightboxUrl(null)}
                        aria-label="Fechar"
                    >
                        <XMarkIcon className="h-6 w-6" aria-hidden />
                    </button>
                    <img
                        src={lightboxUrl}
                        alt=""
                        className="max-h-[90vh] max-w-full rounded-lg object-contain"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}
        </MobileLayout>
    );
}

function InputError({ message }: { message?: string }) {
    if (!message) return null;
    return <p className="mt-1 text-sm text-red-600">{message}</p>;
}
