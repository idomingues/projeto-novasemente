import MobileLayout from '@/Layouts/MobileLayout';
import DonationProgressBar from '@/Components/Donations/DonationProgressBar';
import DonationTransparencyNotice, {
    type DonationTransparencyInfo,
} from '@/Components/Donations/DonationTransparencyNotice';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import Modal from '@/Components/Modal';
import { buildPixCopyPaste, parseMoneyInput } from '@/lib/pixPayload';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { GALLERY_IMAGE_ACCEPT } from '@/utils/mobilePhotoPick';
import {
    ArrowLeftIcon,
    ArrowTopRightOnSquareIcon,
    BoltIcon,
    DocumentDuplicateIcon,
    PlayCircleIcon,
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

const SEVENME_LOGO_SRC = '/images/7me-logo.png';

function donationLinkHost(url: string): string {
    try {
        return new URL(url).host;
    } catch {
        return '';
    }
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

export default function MobileDonationShow({ campaign, recentDonations, donationUrl, transparency, pix, localOffer }: Props) {
    const page = usePage();
    const csrf = (page.props as { csrf_token?: string }).csrf_token ?? '';
    const flash = (page.props as { flash?: { success?: string; error?: string } }).flash;
    const auth = (page.props as { auth?: { user?: { name: string } | null } }).auth;
    const isLoggedIn = Boolean(auth?.user);

    const [donateOpen, setDonateOpen] = useState(false);
    const [amountRaw, setAmountRaw] = useState('');
    const [pixPayload, setPixPayload] = useState<string | null>(null);
    const [amountError, setAmountError] = useState<string | null>(null);
    const [payloadCopied, setPayloadCopied] = useState(false);
    const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [confirmStep, setConfirmStep] = useState(false);
    const [suggestedAmount, setSuggestedAmount] = useState<number | null>(null);
    const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

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

    const pixKeyForOffer = pix.pix_key?.trim() || localOffer.pixKey;
    const donationHost = donationUrl ? donationLinkHost(donationUrl) : '';
    const hasDonationUrl = campaign.type === 'money' && Boolean(donationUrl);
    const availabilityMessage = !campaign.accepting_donations
        ? campaign.status === 'active' && campaign.starts_at && campaignStartsInFuture(campaign.starts_at)
            ? `Esta campanha começa em ${formatCampaignDate(campaign.starts_at)}.`
            : campaign.type === 'items'
              ? 'Esta campanha não está aceitando novos compromissos no momento.'
              : 'Esta campanha não está aceitando doações no momento.'
        : null;

    const generatePix = () => {
        setAmountError(null);
        setPixPayload(null);
        const amount = parseMoneyInput(amountRaw);
        if (amount === null) {
            setAmountError('Informe um valor válido (ex.: 50 ou 50,20).');
            return;
        }
        const payload = buildPixCopyPaste({
            pixKey: pixKeyForOffer,
            amount,
            merchantName: localOffer.merchantName,
            merchantCity: localOffer.merchantCity,
        });
        if (!payload) {
            setAmountError('Não foi possível gerar o código PIX.');
            return;
        }
        setPixPayload(payload);
    };

    const copyPayload = () => {
        if (!pixPayload) return;
        navigator.clipboard.writeText(pixPayload).then(() => {
            setPayloadCopied(true);
            setTimeout(() => setPayloadCopied(false), 2500);
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
                setPixPayload(null);
                setAmountRaw('');
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
        setPixPayload(null);
        setAmountRaw('');
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
                    <>
                        {campaign.type === 'money' && <DonationTransparencyNotice info={transparency} variant="compact" />}
                        <PrimaryButton type="button" onClick={openDonateModal} className="w-full">
                            {campaign.type === 'items' ? 'Registrar compromisso de doação' : 'Fazer doação'}
                        </PrimaryButton>
                    </>
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

                {campaign.type === 'money' && hasDonationUrl && donationUrl && (
                    <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                        <div className="border-b border-zinc-100 bg-zinc-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/80 sm:p-5">
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                                <div className="flex shrink-0 items-center justify-center sm:justify-start">
                                    <img
                                        src={SEVENME_LOGO_SRC}
                                        alt="7me"
                                        className="h-9 w-auto max-w-[160px] object-contain object-left"
                                        width={160}
                                        height={36}
                                    />
                                </div>
                                <div className="min-w-0 flex-1 text-center sm:text-left">
                                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Doar pelo 7me</h2>
                                    <p className="mt-1 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                                        Se você já prefere usar o 7me, abra o link oficial abaixo para concluir sua doação.
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-3 p-4 sm:p-5">
                            <a
                                href={donationUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-zinc-900 px-4 py-3.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-zinc-800 active:scale-[0.99] dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
                            >
                                <span>Abrir 7me para doar</span>
                                <ArrowTopRightOnSquareIcon className="h-4 w-4 opacity-80 group-hover:opacity-100" />
                            </a>
                            {donationHost && (
                                <p className="text-center text-xs text-zinc-500 dark:text-zinc-500">
                                    Destino: {donationHost} (nova aba)
                                </p>
                            )}
                        </div>
                    </section>
                )}

                {campaign.type === 'money' && (
                    <div className="rounded-2xl border border-brand-200/90 bg-gradient-to-br from-brand-50 to-white p-4 dark:border-brand-900/55 dark:from-brand-950/45 dark:to-zinc-900">
                    <h2 className="mb-2 flex items-center gap-2 font-semibold text-zinc-900 dark:text-white">
                        <BoltIcon className="h-5 w-5 text-brand-600" />
                        PIX para doação
                    </h2>
                    <p className="mb-3 text-sm text-zinc-600 dark:text-zinc-400">
                        Gere o código PIX Copia e Cola ou use a chave abaixo. Depois envie o comprovante pelo botão &quot;Fazer doação&quot;.
                    </p>
                    <p className="mb-3 break-all text-xs text-zinc-500">
                        Chave: <span className="font-mono text-zinc-700 dark:text-zinc-300">{pixKeyForOffer}</span>
                    </p>
                    <div className="space-y-3">
                        <div>
                            <InputLabel htmlFor="pix_amount" value="Valor (R$)" />
                            <TextInput
                                id="pix_amount"
                                type="text"
                                inputMode="decimal"
                                placeholder="Ex.: 100 ou 100,50"
                                value={amountRaw}
                                onChange={(e) => {
                                    setAmountRaw(e.target.value);
                                    setPixPayload(null);
                                    setAmountError(null);
                                }}
                                className="mt-1 w-full max-w-xs"
                            />
                            {amountError && <p className="mt-1 text-sm text-red-600">{amountError}</p>}
                        </div>
                        <SecondaryButton type="button" onClick={generatePix}>
                            Gerar código PIX
                        </SecondaryButton>
                        {pixPayload && (
                            <div className="space-y-2 border-t border-zinc-200 pt-3 dark:border-zinc-700">
                                <textarea
                                    readOnly
                                    value={pixPayload}
                                    rows={3}
                                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-mono dark:border-zinc-700 dark:bg-zinc-950"
                                />
                                <button
                                    type="button"
                                    onClick={copyPayload}
                                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-medium text-white"
                                >
                                    <DocumentDuplicateIcon className="h-4 w-4" />
                                    {payloadCopied ? 'Copiado!' : 'Copiar código'}
                                </button>
                            </div>
                        )}
                    </div>
                    </div>
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
                    <form onSubmit={submitDonation} className="space-y-4 p-6">
                        <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">Confirmar doação</h3>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">
                            1. Faça o PIX · 2. Envie o comprovante · 3. Confirme o valor
                        </p>

                        {!confirmStep ? (
                            <div className="space-y-3">
                                <DonationTransparencyNotice info={transparency} variant="compact" />
                                <InputLabel value="Comprovante (foto)" />
                                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                    Envie uma foto nítida do comprovante PIX. Ela será guardada apenas para conferência pela
                                    equipe financeira — não aparece publicamente no app.
                                </p>
                                <input
                                    type="file"
                                    accept={GALLERY_IMAGE_ACCEPT}
                                    disabled={uploading}
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) void handleReceiptUpload(file);
                                    }}
                                    className="block w-full text-sm"
                                />
                                {uploading && <p className="text-sm text-zinc-500">Lendo comprovante...</p>}
                                {uploadError && <p className="text-sm text-red-600">{uploadError}</p>}
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <DonationTransparencyNotice
                                    info={transparency}
                                    isAnonymous={data.is_anonymous}
                                    sendEmailConfirmation={data.send_email_confirmation}
                                />
                                {receiptPreview && (
                                    <img src={receiptPreview} alt="Comprovante" className="max-h-48 rounded-xl border object-contain" />
                                )}
                                {suggestedAmount !== null ? (
                                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                                        Valor detectado no comprovante:{' '}
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
                                <div className="space-y-1">
                                    <label className="flex items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                                        <input
                                            type="checkbox"
                                            className="mt-0.5"
                                            checked={data.is_anonymous}
                                            onChange={(e) => setData('is_anonymous', e.target.checked)}
                                        />
                                        <span>
                                            <span className="font-medium">Não exibir meu nome na lista pública</span>
                                            <span className="mt-0.5 block text-xs text-zinc-500 dark:text-zinc-400">
                                                Aparecerá como «Anônimo» na campanha. A equipe financeira ainda identifica
                                                sua doação internamente.
                                            </span>
                                        </span>
                                    </label>
                                </div>
                                {transparency.donor_email && (
                                    <div className="space-y-1">
                                        <label className="flex items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                                            <input
                                                type="checkbox"
                                                className="mt-0.5"
                                                checked={data.send_email_confirmation}
                                                onChange={(e) => setData('send_email_confirmation', e.target.checked)}
                                            />
                                            <span>
                                                <span className="font-medium">Quero receber confirmação por e-mail</span>
                                                <span className="mt-0.5 block text-xs text-zinc-500 dark:text-zinc-400">
                                                    Enviaremos um resumo para{' '}
                                                    <span className="font-medium text-zinc-700 dark:text-zinc-300">
                                                        {transparency.donor_email}
                                                    </span>{' '}
                                                    somente se você marcar esta opção.
                                                </span>
                                            </span>
                                        </label>
                                    </div>
                                )}
                                <div className="flex justify-end gap-2">
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
                        className="absolute right-4 top-4 rounded-full bg-white/10 px-3 py-1 text-sm text-white"
                        onClick={() => setLightboxUrl(null)}
                    >
                        Fechar
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
