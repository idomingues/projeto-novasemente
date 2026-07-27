import AdminLayout from '@/Layouts/AdminLayout';
import CaixaFixoIgrejaStory from '@/Components/Donations/CaixaFixoIgrejaStory';
import DonationProgressBar from '@/Components/Donations/DonationProgressBar';
import AddButton from '@/Components/AddButton';
import PageHeader from '@/Components/PageHeader';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import ListCardActionRow from '@/Components/ListCard/ListCardActionRow';
import ListCardIconActionButton from '@/Components/ListCard/ListCardIconActionButton';
import ListCardTextActionButton from '@/Components/ListCard/ListCardTextActionButton';
import Modal from '@/Components/Modal';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import InputError from '@/Components/InputError';
import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    ArrowTopRightOnSquareIcon,
    BanknotesIcon,
    DocumentTextIcon,
    EyeIcon,
    PencilIcon,
    PencilSquareIcon,
    PhotoIcon,
    PlusIcon,
    TrashIcon,
} from '@heroicons/react/24/outline';
import { FormEventHandler, useEffect, useMemo, useRef, useState } from 'react';
import { DONATION_CAMPAIGN_COVER_SPECS } from '@/constants/mediaCoverSpecs';
import { parseMoneyInput } from '@/lib/pixPayload';
import { confirmAction } from '@/utils/confirmDialog';
import { inertiaListModalSave } from '@/utils/inertiaListModalSave';
import { GALLERY_IMAGE_ACCEPT } from '@/utils/mobilePhotoPick';

interface CampaignPhoto {
    id: number;
    image_url: string;
}

interface Campaign {
    id: number;
    title: string;
    description: string | null;
    goal_amount: number;
    raised_amount: number;
    remaining_amount: number;
    progress_percent: number;
    status: string;
    starts_at: string | null;
    ends_at: string | null;
    cover_image_url: string | null;
    allow_over_goal: boolean;
    donations_count: number;
    show_caixa_fixo_story: boolean;
    story_video_url: string | null;
    story_photos: CampaignPhoto[];
    thanks_message: string | null;
    thanks_is_published: boolean;
    thanks_published_at: string | null;
    thanks_donors_notified_at?: string | null;
    thanks_photos: CampaignPhoto[];
}

interface DonationRow {
    id: number;
    donor_name: string;
    amount: number;
    source?: string;
    is_manual?: boolean;
    manual_registration_note?: string | null;
    ocr_suggested_amount: number | null;
    amount_before_adjustment: number | null;
    adjustment_note: string | null;
    is_anonymous: boolean;
    confirmed_at: string;
    receipt_url: string | null;
    adjustment_history: {
        id: number;
        amount_before: number;
        amount_after: number;
        adjustment_note: string;
        adjusted_by_name: string | null;
        created_at: string;
    }[];
}

interface Props {
    campaigns: Campaign[];
    canManage: boolean;
    canManageMedia: boolean;
    canManageDonations: boolean;
}

const statusLabels: Record<string, string> = {
    active: 'Ativa',
    closed: 'Encerrada',
    archived: 'Arquivada',
};

export default function DonationCampaignsIndex({ campaigns, canManage, canManageMedia, canManageDonations = canManageMedia }: Props) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [previewCampaign, setPreviewCampaign] = useState<Campaign | null>(null);
    const [detailCampaign, setDetailCampaign] = useState<Campaign | null>(null);
    const [detailDonations, setDetailDonations] = useState<DonationRow[]>([]);
    const [loadingDonations, setLoadingDonations] = useState(false);
    const [mediaCampaign, setMediaCampaign] = useState<Campaign | null>(null);
    const [adjustDonation, setAdjustDonation] = useState<DonationRow | null>(null);
    const [manualDonationOpen, setManualDonationOpen] = useState(false);
    const storyPhotosInputRef = useRef<HTMLInputElement | null>(null);
    const thanksPhotosInputRef = useRef<HTMLInputElement | null>(null);

    const { data, setData, post, put, processing, errors, reset, clearErrors, transform } = useForm({
        title: '',
        description: '',
        goal_amount: '',
        starts_at: '',
        ends_at: '',
        status: 'active',
        allow_over_goal: true,
        show_caixa_fixo_story: false,
        cover_image: null as File | null,
    });

    const storyForm = useForm({
        story_video_url: '',
    });

    const thanksForm = useForm({
        thanks_message: '',
        notify_donors: false,
    });

    const adjustForm = useForm({
        amount: '',
        adjustment_note: '',
    });

    const manualForm = useForm({
        amount: '',
        external_donor_name: '',
        manual_registration_note: '',
        confirmed_at: '',
        is_anonymous: false,
        receipt: null as File | null,
    });

    function formatBrl(value: number): string {
        return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }

    function formatCampaignDate(value: string): string {
        return new Date(`${value}T12:00:00`).toLocaleDateString('pt-BR');
    }

    function formatMoneyFieldValue(value: number): string {
        return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function normalizeMoneyFieldValue(raw: string): string {
        const parsed = parseMoneyInput(raw);
        return parsed === null ? raw.trim() : parsed.toFixed(2);
    }

    const fetchDonations = async (campaignId: number) => {
        const res = await fetch(route('donation-campaigns.donations', campaignId), {
            headers: { Accept: 'application/json' },
            credentials: 'same-origin',
        });
        const json = await res.json();
        return (json.donations ?? []) as DonationRow[];
    };

    useEffect(() => {
        if (!mediaCampaign) return;
        const updated = campaigns.find((c) => c.id === mediaCampaign.id);
        if (updated) setMediaCampaign(updated);
    }, [campaigns, mediaCampaign?.id]);

    const editingCampaign = editingId ? campaigns.find((c) => c.id === editingId) : null;

    const coverPreviewUrl = useMemo(() => {
        if (data.cover_image) {
            return URL.createObjectURL(data.cover_image);
        }
        return editingCampaign?.cover_image_url ?? null;
    }, [data.cover_image, editingCampaign?.cover_image_url]);

    const openCreateModal = () => {
        setIsEditing(false);
        setEditingId(null);
        reset();
        clearErrors();
        setData({
            title: '',
            description: '',
            goal_amount: '',
            starts_at: '',
            ends_at: '',
            status: 'active',
            allow_over_goal: true,
            show_caixa_fixo_story: false,
            cover_image: null,
        });
        setIsModalOpen(true);
    };

    const openEditModal = (campaign: Campaign) => {
        setIsEditing(true);
        setEditingId(campaign.id);
        setData({
            title: campaign.title,
            description: campaign.description ?? '',
            goal_amount: formatMoneyFieldValue(campaign.goal_amount),
            starts_at: campaign.starts_at ?? '',
            ends_at: campaign.ends_at ?? '',
            status: campaign.status,
            allow_over_goal: campaign.allow_over_goal,
            show_caixa_fixo_story: campaign.show_caixa_fixo_story,
            cover_image: null,
        });
        clearErrors();
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        reset();
        setEditingId(null);
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        transform((current) => ({
            ...current,
            goal_amount: normalizeMoneyFieldValue(current.goal_amount),
        }));
        if (isEditing && editingId) {
            put(route('donation-campaigns.update', editingId), { ...inertiaListModalSave, forceFormData: true,
                onFinish: () => transform((current) => current),
            });
        } else {
            post(route('donation-campaigns.store'), { ...inertiaListModalSave, forceFormData: true,
                onFinish: () => transform((current) => current),
            });
        }
    };

    const handleDelete = async (id: number) => {
        const ok = await confirmAction({
            title: 'Remover campanha?',
            text: 'A campanha e todas as contribuições associadas serão excluídas.',
            confirmButtonText: 'Remover',
            danger: true,
            icon: 'warning',
        });
        if (ok) {
            router.delete(route('donation-campaigns.destroy', id));
        }
    };

    const openDonations = async (campaign: Campaign) => {
        setDetailCampaign(campaign);
        setLoadingDonations(true);
        try {
            setDetailDonations(await fetchDonations(campaign.id));
        } finally {
            setLoadingDonations(false);
        }
    };

    const openAdjust = (donation: DonationRow) => {
        setAdjustDonation(donation);
        adjustForm.setData({
            amount: String(donation.amount),
            adjustment_note: '',
        });
        adjustForm.clearErrors();
    };

    const submitAdjust: FormEventHandler = (e) => {
        e.preventDefault();
        if (!adjustDonation || !detailCampaign) return;
        adjustForm.patch(route('finance.donations.update', adjustDonation.id), {
            preserveScroll: true,
            onSuccess: async () => {
                setAdjustDonation(null);
                adjustForm.reset();
                setDetailDonations(await fetchDonations(detailCampaign.id));
                router.reload({ only: ['campaigns'] });
            },
        });
    };

    const openManualDonation = () => {
        manualForm.reset();
        manualForm.clearErrors();
        setManualDonationOpen(true);
    };

    const submitManualDonation: FormEventHandler = (e) => {
        e.preventDefault();
        if (!detailCampaign) return;

        manualForm.post(route('donation-campaigns.donations.manual', detailCampaign.id), {
            preserveScroll: true,
            forceFormData: true,
            onSuccess: async () => {
                setManualDonationOpen(false);
                manualForm.reset();
                setDetailDonations(await fetchDonations(detailCampaign.id));
                router.reload({ only: ['campaigns'] });
            },
        });
    };

    const openMediaModal = (campaign: Campaign) => {
        setMediaCampaign(campaign);
        storyForm.setData('story_video_url', campaign.story_video_url ?? '');
        thanksForm.setData('thanks_message', campaign.thanks_message ?? '');
    };

    const submitStory: FormEventHandler = (e) => {
        e.preventDefault();
        if (!mediaCampaign) return;
        storyForm.patch(route('donation-campaigns.story.update', mediaCampaign.id), inertiaListModalSave);
    };

    const uploadPhotos = (kind: 'story' | 'thanks', files: FileList | File[]) => {
        if (!mediaCampaign) return;
        const selectedFiles = Array.from(files);
        if (selectedFiles.length === 0) return;
        const fd = new FormData();
        fd.append('kind', kind);
        selectedFiles.forEach((file) => {
            fd.append('photos[]', file);
        });
        router.post(route('donation-campaigns.photos.store', mediaCampaign.id), fd, {
            ...inertiaListModalSave,
            forceFormData: true,
        });
    };

    const removePhoto = (photoId: number) => {
        if (!mediaCampaign) return;
        router.delete(route('donation-campaigns.photos.destroy', [mediaCampaign.id, photoId]), {
            ...inertiaListModalSave,
        });
    };

    const submitThanks: FormEventHandler = (e) => {
        e.preventDefault();
        if (!mediaCampaign) return;
        thanksForm.post(route('donation-campaigns.thanks.publish', mediaCampaign.id), inertiaListModalSave);
    };

    const unpublishThanks = () => {
        if (!mediaCampaign) return;
        router.post(route('donation-campaigns.thanks.unpublish', mediaCampaign.id), {}, inertiaListModalSave);
    };

    const campaignIsClosed = mediaCampaign?.status === 'closed' || mediaCampaign?.status === 'archived';

    return (
        <AdminLayout>
            <Head title="Oferta Nova Semente" />
            <PageHeader
                title="Oferta Nova Semente"
                subtitle="Mobilize a igreja com causas que tocam o coração e transformam vidas."
                actions={
                    canManage ? (
                        <AddButton variant="icon" onClick={openCreateModal} title="Nova campanha">
                            Nova campanha
                        </AddButton>
                    ) : undefined
                }
            />

            <div className="space-y-4">
                {campaigns.length === 0 ? (
                    <div className="rounded-2xl border border-zinc-200 bg-white py-12 text-center dark:border-zinc-800 dark:bg-zinc-900">
                        <BanknotesIcon className="mx-auto mb-4 h-10 w-10 text-zinc-400" />
                        <p className="font-medium text-zinc-600 dark:text-zinc-400">Nenhuma campanha cadastrada</p>
                        {canManage && (
                            <AddButton variant="icon" onClick={openCreateModal} className="mt-4" title="Nova campanha">
                                Nova campanha
                            </AddButton>
                        )}
                    </div>
                ) : (
                    campaigns.map((campaign) => (
                        <article
                            key={campaign.id}
                            className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
                        >
                            <button
                                type="button"
                                onClick={() => setPreviewCampaign(campaign)}
                                className="flex w-full cursor-pointer flex-col gap-4 rounded-xl text-left transition hover:bg-zinc-50/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:hover:bg-zinc-800/40 sm:flex-row sm:items-start sm:justify-between"
                            >
                                <div className="min-w-0 flex-1 space-y-3">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">{campaign.title}</h2>
                                        <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                                            {statusLabels[campaign.status] ?? campaign.status}
                                        </span>
                                    </div>
                                    {campaign.description && (
                                        <p className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2">{campaign.description}</p>
                                    )}
                                    {campaign.show_caixa_fixo_story && (
                                        <p className="text-xs font-medium text-sky-700 dark:text-sky-300">
                                            História do Caixa Fixo ativa
                                        </p>
                                    )}
                                    <DonationProgressBar
                                        raisedAmount={campaign.raised_amount}
                                        goalAmount={campaign.goal_amount}
                                        remainingAmount={campaign.remaining_amount}
                                        progressPercent={campaign.progress_percent}
                                    />
                                    <p className="text-xs text-zinc-500">
                                        {campaign.donations_count} contribuição(ões)
                                        {campaign.story_photos.length > 0 ? ` · ${campaign.story_photos.length} foto(s) do projeto` : ''}
                                        {campaign.starts_at ? ` · Início: ${formatCampaignDate(campaign.starts_at)}` : ''}
                                        {campaign.ends_at ? ` · Prazo: ${formatCampaignDate(campaign.ends_at)}` : ''}
                                    </p>
                                </div>
                                {campaign.cover_image_url && (
                                    <img
                                        src={campaign.cover_image_url}
                                        alt=""
                                        className="h-24 w-24 shrink-0 rounded-xl object-cover"
                                    />
                                )}
                            </button>
                            <ListCardActionRow className="mt-4">
                                <ListCardTextActionButton
                                    type="button"
                                    icon={<DocumentTextIcon className="h-4 w-4" />}
                                    onClick={() => setPreviewCampaign(campaign)}
                                >
                                    Ver conteúdo
                                </ListCardTextActionButton>
                                <ListCardTextActionButton
                                    type="button"
                                    icon={<EyeIcon className="h-4 w-4" />}
                                    onClick={() => openDonations(campaign)}
                                >
                                    Contribuições
                                </ListCardTextActionButton>
                                {canManageMedia && (
                                    <ListCardTextActionButton
                                        type="button"
                                        icon={<PhotoIcon className="h-4 w-4" />}
                                        onClick={() => openMediaModal(campaign)}
                                    >
                                        Fotos do projeto
                                    </ListCardTextActionButton>
                                )}
                                {canManage && (
                                    <>
                                        <ListCardIconActionButton
                                            label="Editar"
                                            icon={<PencilIcon className="h-5 w-5" />}
                                            onClick={() => openEditModal(campaign)}
                                        />
                                        <ListCardIconActionButton
                                            label="Excluir"
                                            icon={<TrashIcon className="h-5 w-5" />}
                                            tone="danger"
                                            onClick={() => handleDelete(campaign.id)}
                                        />
                                    </>
                                )}
                            </ListCardActionRow>
                        </article>
                    ))
                )}
            </div>

            <Modal show={previewCampaign !== null} onClose={() => setPreviewCampaign(null)} maxWidth="3xl">
                <div className="flex max-h-[min(90dvh,calc(100dvh-2rem))] flex-col">
                    <div className="flex shrink-0 flex-col gap-3 border-b border-zinc-200 px-5 py-4 dark:border-zinc-800 sm:flex-row sm:items-start sm:justify-between sm:px-6">
                        <div className="min-w-0">
                            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
                                {previewCampaign?.title}
                            </h3>
                            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                                Prévia do conteúdo exibido no app
                            </p>
                        </div>
                        <div className="flex shrink-0 flex-wrap gap-2">
                            {previewCampaign ? (
                                <Link
                                    href={route('mobile.campaigns.show', previewCampaign.id)}
                                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-zinc-600 dark:hover:bg-zinc-800"
                                >
                                    <ArrowTopRightOnSquareIcon className="h-4 w-4" aria-hidden />
                                    Abrir no app
                                </Link>
                            ) : null}
                        </div>
                    </div>
                    <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-6">
                        {previewCampaign?.cover_image_url && !previewCampaign.show_caixa_fixo_story ? (
                            <img
                                src={previewCampaign.cover_image_url}
                                alt=""
                                className="h-56 w-full rounded-2xl object-cover sm:h-72"
                            />
                        ) : null}
                        {previewCampaign?.show_caixa_fixo_story ? (
                            <CaixaFixoIgrejaStory />
                        ) : previewCampaign?.description ? (
                            <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
                                {previewCampaign.description}
                            </p>
                        ) : (
                            <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                Esta campanha ainda não tem descrição ou história publicada.
                            </p>
                        )}
                        {previewCampaign ? (
                            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/50">
                                <DonationProgressBar
                                    raisedAmount={previewCampaign.raised_amount}
                                    goalAmount={previewCampaign.goal_amount}
                                    remainingAmount={previewCampaign.remaining_amount}
                                    progressPercent={previewCampaign.progress_percent}
                                />
                            </div>
                        ) : null}
                    </div>
                </div>
            </Modal>

            <Modal show={isModalOpen} onClose={closeModal} maxWidth="lg">
                <form onSubmit={submit} className="p-6 space-y-4">
                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
                        {isEditing ? 'Editar campanha' : 'Nova campanha'}
                    </h3>
                    <div>
                        <InputLabel htmlFor="title" value="Título" />
                        <TextInput id="title" value={data.title} onChange={(e) => setData('title', e.target.value)} className="mt-1 w-full" required />
                        <InputError message={errors.title} className="mt-1" />
                    </div>
                    <div>
                        <InputLabel htmlFor="description" value="Descrição" />
                        <textarea
                            id="description"
                            value={data.description}
                            onChange={(e) => setData('description', e.target.value)}
                            rows={4}
                            className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900 dark:text-white"
                        />
                        <InputError message={errors.description} className="mt-1" />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-3">
                        <div>
                            <InputLabel htmlFor="goal_amount" value="Meta (R$)" />
                            <TextInput
                                id="goal_amount"
                                type="text"
                                inputMode="decimal"
                                placeholder="Ex.: 4.733.262,14"
                                value={data.goal_amount}
                                onChange={(e) => setData('goal_amount', e.target.value)}
                                onBlur={() => {
                                    const parsed = parseMoneyInput(data.goal_amount);
                                    if (parsed !== null) {
                                        setData('goal_amount', formatMoneyFieldValue(parsed));
                                    }
                                }}
                                className="mt-1 w-full"
                                required
                            />
                            <InputError message={errors.goal_amount} className="mt-1" />
                        </div>
                        <div>
                            <InputLabel htmlFor="starts_at" value="Data de início" />
                            <TextInput
                                id="starts_at"
                                type="date"
                                value={data.starts_at}
                                onChange={(e) => setData('starts_at', e.target.value)}
                                className="mt-1 w-full"
                                required
                            />
                            <InputError message={errors.starts_at} className="mt-1" />
                        </div>
                        <div>
                            <InputLabel htmlFor="ends_at" value="Data limite (opcional)" />
                            <TextInput
                                id="ends_at"
                                type="date"
                                value={data.ends_at}
                                onChange={(e) => setData('ends_at', e.target.value)}
                                className="mt-1 w-full"
                            />
                            <InputError message={errors.ends_at} className="mt-1" />
                        </div>
                    </div>
                    <div>
                        <InputLabel htmlFor="status" value="Status" />
                        <select
                            id="status"
                            value={data.status}
                            onChange={(e) => setData('status', e.target.value)}
                            className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900 dark:text-white"
                        >
                            <option value="active">Ativa</option>
                            <option value="closed">Encerrada</option>
                            <option value="archived">Arquivada</option>
                        </select>
                        <InputError message={errors.status} className="mt-1" />
                    </div>
                    <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                        <input
                            type="checkbox"
                            checked={data.allow_over_goal}
                            onChange={(e) => setData('allow_over_goal', e.target.checked)}
                            className="cursor-pointer"
                        />
                        Permitir contribuições acima da meta
                    </label>
                    <label className="flex cursor-pointer items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                        <input
                            type="checkbox"
                            checked={data.show_caixa_fixo_story}
                            onChange={(e) => setData('show_caixa_fixo_story', e.target.checked)}
                            className="mt-0.5 cursor-pointer"
                        />
                        <span>
                            Exibir história do Caixa Fixo da Igreja
                            <span className="mt-0.5 block text-xs text-zinc-500 dark:text-zinc-400">
                                Mostra no app a distribuição dos custos mensais e o saldo anual, em vez de um texto simples.
                            </span>
                        </span>
                    </label>
                    <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50/80 p-4 dark:border-zinc-600 dark:bg-zinc-800/40">
                        <InputLabel htmlFor="cover_image" value="Imagem de capa (opcional)" />
                        <p
                            id="donation_campaign_cover_specs"
                            className="mt-1 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400"
                        >
                            {DONATION_CAMPAIGN_COVER_SPECS}
                        </p>
                        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start">
                            <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
                                {coverPreviewUrl ? (
                                    <img src={coverPreviewUrl} alt="" className="h-full w-full object-cover" />
                                ) : (
                                    <PhotoIcon className="h-8 w-8 text-zinc-400 dark:text-zinc-500" aria-hidden />
                                )}
                            </div>
                            <div className="min-w-0 flex-1 space-y-2">
                                <input
                                    id="cover_image"
                                    type="file"
                                    accept={GALLERY_IMAGE_ACCEPT}
                                    aria-describedby="donation_campaign_cover_specs"
                                    onChange={(e) => setData('cover_image', e.target.files?.[0] ?? null)}
                                    className="block w-full cursor-pointer rounded-xl border border-zinc-300 bg-white px-3 py-3 text-sm text-zinc-700 file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-zinc-900 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-zinc-800 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:file:bg-zinc-100 dark:file:text-zinc-900"
                                />
                                {data.cover_image && (
                                    <p className="truncate text-xs text-zinc-600 dark:text-zinc-400">
                                        Arquivo selecionado: <span className="font-medium">{data.cover_image.name}</span>
                                    </p>
                                )}
                            </div>
                        </div>
                        <InputError message={errors.cover_image} className="mt-2" />
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <SecondaryButton type="button" onClick={closeModal}>
                            Cancelar
                        </SecondaryButton>
                        <PrimaryButton disabled={processing}>{isEditing ? 'Salvar' : 'Criar'}</PrimaryButton>
                    </div>
                </form>
            </Modal>

            <Modal show={detailCampaign !== null} onClose={() => setDetailCampaign(null)} maxWidth="2xl">
                <div className="p-6">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
                            Contribuições — {detailCampaign?.title}
                        </h3>
                        {canManageDonations && detailCampaign?.status !== 'archived' && (
                            <SecondaryButton type="button" onClick={openManualDonation}>
                                <PlusIcon className="mr-1.5 h-4 w-4" />
                                Registrar contribuição manual
                            </SecondaryButton>
                        )}
                    </div>
                    {loadingDonations ? (
                        <p className="mt-4 text-sm text-zinc-500">Carregando...</p>
                    ) : detailDonations.length === 0 ? (
                        <p className="mt-4 text-sm text-zinc-500">
                            Nenhuma contribuição registrada ainda.
                            {canManageDonations && detailCampaign?.status !== 'archived' && (
                                <span> Use «Registrar contribuição manual» para incluir valores recebidos fora do app.</span>
                            )}
                        </p>
                    ) : (
                        <div className="mt-4 max-h-96 overflow-y-auto">
                            <table className="min-w-full text-sm">
                                <thead>
                                    <tr className="border-b border-zinc-200 text-left text-zinc-500 dark:border-zinc-700">
                                        <th className="py-2 pr-3">Doador</th>
                                        <th className="py-2 pr-3">Valor</th>
                                        <th className="py-2 pr-3">Data</th>
                                        <th className="py-2 pr-3">Comprovante</th>
                                        {canManageDonations && <th className="py-2">Ações</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {detailDonations.map((d) => (
                                        <tr key={d.id} className="border-b border-zinc-100 dark:border-zinc-800">
                                            <td className="py-2 pr-3">
                                                <span>{d.donor_name}</span>
                                                {d.is_manual && (
                                                    <span className="ml-1.5 inline-block rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
                                                        Manual
                                                    </span>
                                                )}
                                                {d.manual_registration_note && (
                                                    <span className="mt-0.5 block text-xs text-zinc-500 line-clamp-2" title={d.manual_registration_note}>
                                                        {d.manual_registration_note}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-2 pr-3">
                                                <span className="font-medium">{formatBrl(d.amount)}</span>
                                                {d.amount_before_adjustment !== null && (
                                                    <span className="block text-xs text-zinc-500">
                                                        Antes: {formatBrl(d.amount_before_adjustment)}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-2 pr-3">
                                                {new Date(d.confirmed_at).toLocaleString('pt-BR')}
                                            </td>
                                            <td className="py-2 pr-3">
                                                {d.receipt_url ? (
                                                    <a href={d.receipt_url} target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline">
                                                        Ver
                                                    </a>
                                                ) : (
                                                    <span className="text-zinc-400">—</span>
                                                )}
                                            </td>
                                            {canManageDonations && (
                                                <td className="py-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => openAdjust(d)}
                                                        className="inline-flex items-center text-xs font-medium text-zinc-700 hover:text-zinc-900 dark:text-zinc-300"
                                                    >
                                                        <PencilSquareIcon className="mr-1 h-3.5 w-3.5" />
                                                        Ajustar valor
                                                    </button>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </Modal>

            <Modal show={manualDonationOpen} onClose={() => setManualDonationOpen(false)} maxWidth="md">
                <form onSubmit={submitManualDonation} className="space-y-4 p-6">
                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">Registrar contribuição manual</h3>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        Use quando o valor foi recebido fora do app (dinheiro, PIX direto, transferência, etc.) e precisa
                        constar no progresso da campanha.
                    </p>
                    {detailCampaign && (
                        <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{detailCampaign.title}</p>
                    )}
                    <div>
                        <InputLabel htmlFor="manual_amount" value="Valor (R$)" />
                        <TextInput
                            id="manual_amount"
                            type="number"
                            step="0.01"
                            min="0.01"
                            value={manualForm.data.amount}
                            onChange={(e) => manualForm.setData('amount', e.target.value)}
                            className="mt-1 w-full"
                            required
                        />
                        <InputError message={manualForm.errors.amount} className="mt-1" />
                    </div>
                    <div>
                        <InputLabel htmlFor="manual_donor_name" value="Nome do doador" />
                        <TextInput
                            id="manual_donor_name"
                            value={manualForm.data.external_donor_name}
                            onChange={(e) => manualForm.setData('external_donor_name', e.target.value)}
                            className="mt-1 w-full"
                            placeholder="Ex.: João Silva"
                            required
                        />
                        <InputError message={manualForm.errors.external_donor_name} className="mt-1" />
                    </div>
                    <div>
                        <InputLabel htmlFor="manual_confirmed_at" value="Data do recebimento (opcional)" />
                        <TextInput
                            id="manual_confirmed_at"
                            type="datetime-local"
                            value={manualForm.data.confirmed_at}
                            onChange={(e) => manualForm.setData('confirmed_at', e.target.value)}
                            className="mt-1 w-full"
                        />
                    </div>
                    <div>
                        <InputLabel htmlFor="manual_note" value="Observação do registro (obrigatório)" />
                        <textarea
                            id="manual_note"
                            value={manualForm.data.manual_registration_note}
                            onChange={(e) => manualForm.setData('manual_registration_note', e.target.value)}
                            rows={3}
                            minLength={10}
                            placeholder="Descreva como o valor foi recebido e por quem conferiu (mínimo 10 caracteres)."
                            className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900 dark:text-white"
                            required
                        />
                        <p className="mt-1 text-xs text-zinc-500">
                            Fica registrado no histórico da campanha para transparência.
                        </p>
                        <InputError message={manualForm.errors.manual_registration_note} className="mt-1" />
                    </div>
                    <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                        <input
                            type="checkbox"
                            checked={manualForm.data.is_anonymous}
                            onChange={(e) => manualForm.setData('is_anonymous', e.target.checked)}
                        />
                        Contribuição anônima na listagem pública
                    </label>
                    <div>
                        <InputLabel htmlFor="manual_receipt" value="Comprovante (opcional)" />
                        <input
                            id="manual_receipt"
                            type="file"
                            accept={GALLERY_IMAGE_ACCEPT}
                            onChange={(e) => manualForm.setData('receipt', e.target.files?.[0] ?? null)}
                            className="mt-1 block w-full text-sm"
                        />
                    </div>
                    <div className="flex justify-end gap-2">
                        <SecondaryButton type="button" onClick={() => setManualDonationOpen(false)}>
                            Cancelar
                        </SecondaryButton>
                        <PrimaryButton disabled={manualForm.processing}>Registrar contribuição</PrimaryButton>
                    </div>
                </form>
            </Modal>

            <Modal show={adjustDonation !== null} onClose={() => setAdjustDonation(null)} maxWidth="md">
                <form onSubmit={submitAdjust} className="space-y-4 p-6">
                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">Ajustar valor da contribuição</h3>
                    {adjustDonation && detailCampaign && (
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">
                            {adjustDonation.donor_name} · {detailCampaign.title} · Atual: {formatBrl(adjustDonation.amount)}
                        </p>
                    )}
                    <div>
                        <InputLabel htmlFor="campaign_adjust_amount" value="Novo valor (R$)" />
                        <TextInput
                            id="campaign_adjust_amount"
                            type="number"
                            step="0.01"
                            min="0.01"
                            value={adjustForm.data.amount}
                            onChange={(e) => adjustForm.setData('amount', e.target.value)}
                            className="mt-1 w-full"
                            required
                        />
                        {adjustForm.errors.amount && (
                            <p className="mt-1 text-sm text-red-600">{adjustForm.errors.amount}</p>
                        )}
                    </div>
                    <div>
                        <InputLabel htmlFor="campaign_adjustment_note" value="Motivo do ajuste (obrigatório)" />
                        <textarea
                            id="campaign_adjustment_note"
                            value={adjustForm.data.adjustment_note}
                            onChange={(e) => adjustForm.setData('adjustment_note', e.target.value)}
                            rows={3}
                            minLength={10}
                            placeholder="Descreva o erro encontrado e como o valor foi conferido (mínimo 10 caracteres)."
                            className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900 dark:text-white"
                            required
                        />
                        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                            A justificativa fica registrada no histórico e o doador pode ver em Minhas contribuições.
                        </p>
                        {adjustForm.errors.adjustment_note && (
                            <p className="mt-1 text-sm text-red-600">{adjustForm.errors.adjustment_note}</p>
                        )}
                    </div>
                    {adjustDonation && adjustDonation.adjustment_history.length > 0 && (
                        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-800/50">
                            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Histórico de ajustes</p>
                            <ul className="mt-2 max-h-40 space-y-2 overflow-y-auto text-xs text-zinc-600 dark:text-zinc-400">
                                {adjustDonation.adjustment_history.map((entry) => (
                                    <li key={entry.id} className="border-b border-zinc-200 pb-2 last:border-0 dark:border-zinc-700">
                                        <span className="font-medium text-zinc-800 dark:text-zinc-200">
                                            {formatBrl(entry.amount_before)} → {formatBrl(entry.amount_after)}
                                        </span>
                                        <span className="block text-zinc-500">
                                            {new Date(entry.created_at).toLocaleString('pt-BR')}
                                            {entry.adjusted_by_name ? ` · ${entry.adjusted_by_name}` : ''}
                                        </span>
                                        <span className="block">{entry.adjustment_note}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                    <div className="flex justify-end gap-2">
                        <SecondaryButton type="button" onClick={() => setAdjustDonation(null)}>
                            Cancelar
                        </SecondaryButton>
                        <PrimaryButton disabled={adjustForm.processing}>Salvar ajuste</PrimaryButton>
                    </div>
                </form>
            </Modal>

            <Modal show={mediaCampaign !== null} onClose={() => setMediaCampaign(null)} maxWidth="2xl">
                <div className="max-h-[85vh] overflow-y-auto p-6 space-y-8">
                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
                        Fotos e vídeo do projeto — {mediaCampaign?.title}
                    </h3>

                    <section className="space-y-4">
                        <h4 className="font-medium text-zinc-900 dark:text-white">Fotos do projeto (app)</h4>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">
                            Publique fotos e um vídeo opcional do andamento do projeto. Esse conteúdo fica visível no app enquanto a campanha estiver ativa ou encerrada.
                        </p>
                        <form onSubmit={submitStory} className="space-y-3">
                            <div>
                                <InputLabel htmlFor="story_video_url" value="Vídeo no YouTube (opcional)" />
                                <TextInput
                                    id="story_video_url"
                                    value={storyForm.data.story_video_url}
                                    onChange={(e) => storyForm.setData('story_video_url', e.target.value)}
                                    className="mt-1 w-full"
                                    placeholder="https://www.youtube.com/watch?v=…"
                                />
                                <InputError message={storyForm.errors.story_video_url} className="mt-1" />
                            </div>
                            <PrimaryButton type="submit" disabled={storyForm.processing}>
                                Salvar vídeo
                            </PrimaryButton>
                        </form>
                        <div>
                            <InputLabel value="Galeria do projeto" />
                            <div className="mt-2 flex flex-wrap gap-2">
                                {mediaCampaign?.story_photos.map((photo) => (
                                    <div key={photo.id} className="relative">
                                        <img src={photo.image_url} alt="" className="h-20 w-20 rounded-lg object-cover" />
                                        <button
                                            type="button"
                                            onClick={() => removePhoto(photo.id)}
                                            className="absolute -right-1 -top-1 rounded-full bg-red-600 p-0.5 text-white"
                                            title="Remover"
                                        >
                                            <TrashIcon className="h-3 w-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                            <input
                                type="file"
                                accept={GALLERY_IMAGE_ACCEPT}
                                multiple
                                ref={storyPhotosInputRef}
                                className="sr-only"
                                onChange={(e) => {
                                    if (e.target.files?.length) uploadPhotos('story', e.target.files);
                                    e.target.value = '';
                                }}
                            />
                            <div className="mt-3 flex flex-wrap items-center gap-3">
                                <PrimaryButton
                                    type="button"
                                    title="Escolher uma ou várias fotos do projeto"
                                    onClick={() => storyPhotosInputRef.current?.click()}
                                    className="inline-flex items-center gap-2"
                                >
                                    <PhotoIcon className="h-4 w-4" aria-hidden />
                                    Escolher fotos
                                </PrimaryButton>
                                <span className="text-sm text-zinc-500 dark:text-zinc-400">
                                    Selecione uma ou várias imagens de uma vez.
                                </span>
                            </div>
                            <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                                Use esta área para subir uma ou várias fotos do projeto que as pessoas poderão ver na campanha.
                            </p>
                        </div>
                    </section>

                    {campaignIsClosed ? (
                        <section className="space-y-4 border-t border-zinc-200 pt-6 dark:border-zinc-700">
                            <h4 className="font-medium text-zinc-900 dark:text-white">Agradecimento (após encerrar)</h4>
                            <p className="text-sm text-zinc-600 dark:text-zinc-400">
                                Publique uma mensagem e fotos de agradecimento visíveis no app para quem contribuiu.
                            </p>
                            {mediaCampaign?.thanks_is_published && (
                                <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                                    Publicado em{' '}
                                    {mediaCampaign.thanks_published_at
                                        ? new Date(mediaCampaign.thanks_published_at).toLocaleString('pt-BR')
                                        : '—'}
                                </p>
                            )}
                            {mediaCampaign?.thanks_donors_notified_at && (
                                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                                    E-mail e notificação enviados aos doadores em{' '}
                                    {new Date(mediaCampaign.thanks_donors_notified_at).toLocaleString('pt-BR')}.
                                </p>
                            )}
                            <form onSubmit={submitThanks} className="space-y-3">
                                <div>
                                    <InputLabel htmlFor="thanks_message" value="Mensagem de agradecimento" />
                                    <textarea
                                        id="thanks_message"
                                        value={thanksForm.data.thanks_message}
                                        onChange={(e) => thanksForm.setData('thanks_message', e.target.value)}
                                        rows={5}
                                        className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900 dark:text-white"
                                        required
                                    />
                                    <InputError message={thanksForm.errors.thanks_message} className="mt-1" />
                                </div>
                                <label className="flex items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                                    <input
                                        type="checkbox"
                                        className="mt-0.5"
                                        checked={thanksForm.data.notify_donors}
                                        onChange={(e) => thanksForm.setData('notify_donors', e.target.checked)}
                                    />
                                    <span>
                                        Enviar esta mensagem por e-mail e notificação no app a todos os doadores com
                                        conta (respeita as preferências de contato de cada usuário).
                                    </span>
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    <PrimaryButton type="submit" disabled={thanksForm.processing}>
                                        {mediaCampaign?.thanks_is_published
                                            ? thanksForm.data.notify_donors
                                                ? 'Republicar e notificar doadores'
                                                : 'Republicar no app'
                                            : thanksForm.data.notify_donors
                                              ? 'Publicar e notificar doadores'
                                              : 'Publicar no app'}
                                    </PrimaryButton>
                                    {mediaCampaign?.thanks_is_published && (
                                        <SecondaryButton type="button" onClick={unpublishThanks}>
                                            Ocultar do app
                                        </SecondaryButton>
                                    )}
                                </div>
                            </form>
                            <div>
                                <InputLabel value="Fotos do agradecimento" />
                                <div className="mt-2 flex flex-wrap gap-2">
                                    {mediaCampaign?.thanks_photos.map((photo) => (
                                        <div key={photo.id} className="relative">
                                            <img src={photo.image_url} alt="" className="h-20 w-20 rounded-lg object-cover" />
                                            <button
                                                type="button"
                                                onClick={() => removePhoto(photo.id)}
                                                className="absolute -right-1 -top-1 rounded-full bg-red-600 p-0.5 text-white"
                                                title="Remover"
                                            >
                                                <TrashIcon className="h-3 w-3" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                <input
                                    type="file"
                                    accept={GALLERY_IMAGE_ACCEPT}
                                    multiple
                                    ref={thanksPhotosInputRef}
                                    className="sr-only"
                                    onChange={(e) => {
                                        if (e.target.files?.length) uploadPhotos('thanks', e.target.files);
                                        e.target.value = '';
                                    }}
                                />
                                <div className="mt-3 flex flex-wrap items-center gap-3">
                                    <PrimaryButton
                                        type="button"
                                        title="Escolher uma ou várias fotos de agradecimento"
                                        onClick={() => thanksPhotosInputRef.current?.click()}
                                        className="inline-flex items-center gap-2"
                                    >
                                        <PhotoIcon className="h-4 w-4" aria-hidden />
                                        Escolher fotos
                                    </PrimaryButton>
                                    <span className="text-sm text-zinc-500 dark:text-zinc-400">
                                        Selecione uma ou várias imagens de uma vez.
                                    </span>
                                </div>
                            </div>
                        </section>
                    ) : (
                        <p className="border-t border-zinc-200 pt-6 text-sm text-amber-700 dark:border-zinc-700 dark:text-amber-300">
                            Encerre a campanha (status «Encerrada») para publicar o agradecimento no app.
                        </p>
                    )}
                </div>
            </Modal>
        </AdminLayout>
    );
}
