import MobileLayout from '@/Layouts/MobileLayout';
import DonationProgressBar from '@/Components/Donations/DonationProgressBar';
import type { CaixaFixoStoryFinancial } from '@/data/caixaFixoIgrejaStory';
import { caixaFixoMonthlyProgress, caixaFixoMonthlyProgressLabels } from '@/data/caixaFixoIgrejaStory';
import type { ConstrucaoIgrejaStoryData } from '@/data/construcaoIgrejaStory';
import { construcaoProgressRaised } from '@/data/construcaoIgrejaStory';
import { Head, Link } from '@inertiajs/react';
import { BanknotesIcon } from '@heroicons/react/24/outline';

interface Campaign {
    id: number;
    title: string;
    goal_amount: number;
    raised_amount: number;
    remaining_amount: number;
    progress_percent: number;
    status: string;
    starts_at: string | null;
    ends_at: string | null;
    cover_image_url: string | null;
    accepting_donations: boolean;
    show_caixa_fixo_story?: boolean;
    caixa_fixo_story?: CaixaFixoStoryFinancial | null;
    show_construcao_story?: boolean;
    construcao_story?: ConstrucaoIgrejaStoryData | null;
    thanks_is_published?: boolean;
}

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

export default function MobileDonationCampaignsIndex({ campaigns }: Props) {
    return (
        <MobileLayout>
            <Head title="Oferta Nova Semente" />
            <div className="mx-auto max-w-3xl space-y-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-3xl">
                        Oferta Nova Semente
                    </h1>
                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                        Cada contribuição é um abraço à missão. Participe com o coração e veja o impacto da sua generosidade.
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
                                    href={route('mobile.campaigns.show', campaign.id)}
                                    className="block rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm transition hover:border-brand-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-brand-700"
                                >
                                {campaign.cover_image_url && (
                                    <img
                                        src={campaign.cover_image_url}
                                        alt=""
                                        className="mb-3 h-[13.5rem] w-full rounded-xl object-cover"
                                    />
                                )}
                                <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">{campaign.title}</h2>
                                {campaign.show_caixa_fixo_story && (
                                    <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-teal-700 dark:text-teal-300">
                                        {caixaFixoMonthlyProgressLabels().monthTitle}
                                    </p>
                                )}
                                {!campaign.show_caixa_fixo_story && (campaign.starts_at || campaign.ends_at) && (
                                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                                        {campaign.starts_at ? `Início: ${formatCampaignDate(campaign.starts_at)}` : ''}
                                        {campaign.starts_at && campaign.ends_at ? ' · ' : ''}
                                        {campaign.ends_at ? `Prazo: ${formatCampaignDate(campaign.ends_at)}` : ''}
                                    </p>
                                )}
                                <div className="mt-3">
                                    {(() => {
                                        if (campaign.show_caixa_fixo_story) {
                                            const monthly = caixaFixoMonthlyProgress(campaign.caixa_fixo_story);
                                            const labels = caixaFixoMonthlyProgressLabels();
                                            if (monthly) {
                                                return (
                                                    <DonationProgressBar
                                                        raisedAmount={monthly.raised}
                                                        goalAmount={monthly.goal}
                                                        remainingAmount={monthly.remaining}
                                                        progressPercent={monthly.percent}
                                                        raisedLabel={labels.raisedLabel}
                                                        remainingLabel={labels.remainingLabel}
                                                        size="sm"
                                                    />
                                                );
                                            }
                                        }
                                        let fromStory: number | null = null;
                                        if (campaign.show_construcao_story) {
                                            fromStory = construcaoProgressRaised(campaign.construcao_story);
                                        }
                                        const raised = fromStory ?? campaign.raised_amount;
                                        const goal = campaign.goal_amount;
                                        const remaining = Math.max(0, goal - raised);
                                        const percent = goal > 0 ? Math.min(100, Math.floor((raised / goal) * 100)) : 0;
                                        return (
                                            <DonationProgressBar
                                                raisedAmount={raised}
                                                goalAmount={goal}
                                                remainingAmount={remaining}
                                                progressPercent={percent}
                                                size="sm"
                                            />
                                        );
                                    })()}
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
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>
        </MobileLayout>
    );
}
