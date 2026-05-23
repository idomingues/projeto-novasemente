import MobileLayout from '@/Layouts/MobileLayout';
import DonationProgressBar from '@/Components/Donations/DonationProgressBar';
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
    ends_at: string | null;
    cover_image_url: string | null;
    accepting_donations: boolean;
    thanks_is_published?: boolean;
}

interface Props {
    campaigns: Campaign[];
}

export default function MobileDonationCampaignsIndex({ campaigns }: Props) {
    return (
        <MobileLayout>
            <Head title="Campanhas de doação" />
            <div className="mx-auto max-w-3xl space-y-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-3xl">
                        Campanhas de doação
                    </h1>
                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                        Contribua com causas específicas da igreja e acompanhe o progresso em tempo real.
                    </p>
                </div>

                {campaigns.length === 0 ? (
                    <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-900">
                        <BanknotesIcon className="mx-auto mb-3 h-10 w-10 text-zinc-400" />
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">Nenhuma campanha ativa no momento.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {campaigns.map((campaign) => (
                            <Link
                                key={campaign.id}
                                href={route('mobile.campaigns.show', campaign.id)}
                                className="block rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm transition hover:border-brand-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-brand-700"
                            >
                                {campaign.cover_image_url && (
                                    <img
                                        src={campaign.cover_image_url}
                                        alt=""
                                        className="mb-3 h-36 w-full rounded-xl object-cover"
                                    />
                                )}
                                <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">{campaign.title}</h2>
                                <div className="mt-3">
                                    <DonationProgressBar
                                        raisedAmount={campaign.raised_amount}
                                        goalAmount={campaign.goal_amount}
                                        remainingAmount={campaign.remaining_amount}
                                        progressPercent={campaign.progress_percent}
                                        size="sm"
                                    />
                                </div>
                                {!campaign.accepting_donations && (
                                    <p className="mt-2 text-xs font-medium text-amber-600 dark:text-amber-400">
                                        Campanha encerrada
                                    </p>
                                )}
                                {campaign.thanks_is_published && (
                                    <p className="mt-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                                        Agradecimento publicado
                                    </p>
                                )}
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </MobileLayout>
    );
}
