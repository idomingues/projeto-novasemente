import MobileLayout from '@/Layouts/MobileLayout';
import PollCardResults from '@/Components/Polls/PollCardResults';
import type { PollResults } from '@/Components/Polls/pollTypes';
import { Head, Link } from '@inertiajs/react';
import { ChartBarIcon } from '@heroicons/react/24/outline';

type PollListItem = {
    id: number;
    question: string;
    allow_multiple: boolean;
    status: string;
    status_label: string;
    has_voted: boolean;
    options_count: number;
    results: PollResults | null;
};

type Props = {
    polls: PollListItem[];
};

export default function MobilePollsIndex({ polls }: Props) {
    return (
        <MobileLayout>
            <Head title="Enquetes" />
            <div className="mx-auto max-w-3xl space-y-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-3xl">
                        Enquetes
                    </h1>
                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                        Ao responder, você vê o resultado final.
                    </p>
                </div>

                {polls.length === 0 ? (
                    <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-900">
                        <ChartBarIcon className="mx-auto mb-3 h-10 w-10 text-zinc-400" />
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">Nenhuma enquete disponível no momento.</p>
                    </div>
                ) : (
                    <ul className="space-y-3">
                        {polls.map((poll) => (
                            <li key={poll.id}>
                                <Link
                                    href={route('mobile.polls.show', poll.id)}
                                    className="block cursor-pointer rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm transition hover:border-emerald-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-emerald-700"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <h2 className="text-base font-semibold text-zinc-900 dark:text-white">
                                            {poll.question}
                                        </h2>
                                        <span
                                            className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                                poll.has_voted
                                                    ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200'
                                                    : 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200'
                                            }`}
                                        >
                                            {poll.has_voted ? 'Respondida' : 'Pendente'}
                                        </span>
                                    </div>
                                    <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                                        {poll.options_count} opções ·{' '}
                                        {poll.has_voted ? 'Você já respondeu' : '1 voto por pessoa'}
                                        {poll.status !== 'open' ? ` · ${poll.status_label}` : ''}
                                    </p>
                                    {poll.has_voted && poll.results && (
                                        <PollCardResults results={poll.results} />
                                    )}
                                </Link>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </MobileLayout>
    );
}
