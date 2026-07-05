import MobileLayout from '@/Layouts/MobileLayout';
import DonationProgressBar from '@/Components/Donations/DonationProgressBar';
import { Head, Link } from '@inertiajs/react';
import { BanknotesIcon } from '@heroicons/react/24/outline';

interface Campaign {
    id: number;
    title: string;
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
    thanks_is_published?: boolean;
}

const typeLabels: Record<Campaign['type'], string> = {
    money: 'Financeira',
    items: 'Objetos',
};

interface Props {
    campaigns: Campaign[];
}

function formatCampaignDate(value: string): string {
    return new Date(`${value}T12:00:00`).toLocaleDateString('pt-BR');
}

function campaignStartsInFuture(startsAt: string | null): boolean {
    if (!startsAt) {
        return false;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return new Date(`${startsAt}T12:00:00`).getTime() > today.getTime();
}

function campaignAvailabilityLabel(campaign: Campaign): string | null {
    if (campaign.accepting_donations) {
        return null;
    }

    if (campaign.status === 'active' && campaign.starts_at && campaignStartsInFuture(campaign.starts_at)) {
        return `Começa em ${formatCampaignDate(campaign.starts_at)}`;
    }

    if (campaign.status === 'closed' || campaign.status === 'archived') {
        return 'Campanha encerrada';
    }

    return 'Doações indisponíveis no momento';
}

export default function MobileDonationsIndex({ campaigns }: Props) {
    return (
        <MobileLayout>
            <Head title="Doação" />
            <div className="mx-auto max-w-3xl space-y-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-3xl">
                        Doação
                    </h1>
                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                        Campanhas financeiras e de objetos no mesmo lugar para você apoiar com recursos, itens e cuidado.
                    </p>
                </div>

                {campaigns.length === 0 ? (
                    <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-900">
                        <BanknotesIcon className="mx-auto mb-3 h-10 w-10 text-zinc-400" />
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">Nenhuma campanha ativa no momento.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {campaigns.map((campaign) => {
                            const availabilityLabel = campaignAvailabilityLabel(campaign);

                            return (
                                <Link
                                    key={campaign.id}
                                    href={route('mobile.donations.show', campaign.id)}
                                    className="block rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm transition hover:border-brand-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-brand-700 sm:flex sm:items-start sm:gap-5 sm:p-5"
                                >
                                    {campaign.cover_image_url && (
                                        <div className="mb-3 overflow-hidden rounded-xl bg-zinc-100 sm:mb-0 sm:w-2/5 sm:max-w-sm sm:shrink-0 dark:bg-zinc-800">
                                            <img
                                                src={campaign.cover_image_url}
                                                alt=""
                                                className="aspect-video w-full object-cover sm:aspect-auto sm:max-h-56 sm:object-contain md:max-h-64"
                                            />
                                        </div>
                                    )}
                                    <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">{campaign.title}</h2>
                                        <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-medium text-brand-700 dark:bg-brand-950/40 dark:text-brand-200">
                                            {typeLabels[campaign.type]}
                                        </span>
                                    </div>
                                    {(campaign.starts_at || campaign.ends_at) && (
                                        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                                            {campaign.starts_at ? `Início: ${formatCampaignDate(campaign.starts_at)}` : ''}
                                            {campaign.starts_at && campaign.ends_at ? ' · ' : ''}
                                            {campaign.ends_at ? `Prazo: ${formatCampaignDate(campaign.ends_at)}` : ''}
                                        </p>
                                    )}
                                    <div className="mt-3">
                                        <DonationProgressBar
                                            raisedAmount={campaign.type === 'items' ? campaign.collected_quantity : campaign.raised_amount}
                                            goalAmount={campaign.type === 'items' ? campaign.goal_quantity ?? 0 : campaign.goal_amount}
                                            remainingAmount={campaign.type === 'items' ? campaign.remaining_quantity : campaign.remaining_amount}
                                            progressPercent={campaign.progress_percent}
                                            valueMode={campaign.type === 'items' ? 'quantity' : 'currency'}
                                            unitLabel={campaign.unit_label}
                                            pendingAmount={campaign.type === 'items' ? Math.max(0, campaign.pledged_quantity - campaign.collected_quantity) : null}
                                            size="sm"
                                        />
                                    </div>
                                    {availabilityLabel && (
                                        <p className="mt-2 text-xs font-medium text-amber-600 dark:text-amber-400">
                                            {availabilityLabel}
                                        </p>
                                    )}
                                    {campaign.thanks_is_published && (
                                        <p className="mt-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                                            Agradecimento publicado
                                        </p>
                                    )}
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>
        </MobileLayout>
    );
}
