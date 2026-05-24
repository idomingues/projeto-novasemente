import { Link } from '@inertiajs/react';
import { UserGroupIcon } from '@heroicons/react/24/outline';
import type { VolunteerSignupCompletion } from '@/utils/volunteerSignupCompletion';
import { volunteerSignupMissingOnlyHref } from '@/utils/volunteerSignupCompletion';

interface Props {
    completion: VolunteerSignupCompletion;
    variant?: 'mobile' | 'desktop';
}

export default function VolunteerSignupStatusCard({ completion, variant = 'mobile' }: Props) {
    if (completion.is_complete) {
        return null;
    }

    const missingHref = volunteerSignupMissingOnlyHref();

    const missingLabel =
        completion.missing_count === 1
            ? 'Falta 1 pergunta para concluir o cadastro.'
            : `Faltam ${completion.missing_count} perguntas para concluir o cadastro.`;

    const titleClass =
        variant === 'desktop'
            ? 'text-lg font-medium text-gray-900 dark:text-gray-100'
            : 'font-semibold text-zinc-900 dark:text-white';

    const body = (
        <>
            <div className="flex flex-wrap items-center gap-2">
                <div className={titleClass}>Cadastro de voluntário</div>
                <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900 dark:bg-amber-950/50 dark:text-amber-200">
                    {completion.percent}%
                </span>
            </div>
            <p
                className={
                    variant === 'desktop'
                        ? 'mt-1 text-sm text-gray-600 dark:text-gray-400'
                        : 'mt-0.5 text-sm text-zinc-600 dark:text-zinc-400'
                }
            >
                {missingLabel}
            </p>
            <CardActions missingHref={missingHref} desktop={variant === 'desktop'} />
        </>
    );

    if (variant === 'desktop') {
        return (
            <div className="bg-white p-4 shadow dark:bg-zinc-800 sm:rounded-lg sm:p-8">
                <div className="max-w-xl">{body}</div>
            </div>
        );
    }

    return (
        <div className="rounded-2xl border border-primary-200 bg-primary-50/90 p-4 shadow-sm dark:border-primary-900 dark:bg-primary-950/35">
            <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-100 dark:bg-primary-900/40">
                    <UserGroupIcon className="h-6 w-6 text-primary-700 dark:text-primary-200" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">{body}</div>
            </div>
        </div>
    );
}

function CardActions({ missingHref, desktop = false }: { missingHref: string; desktop?: boolean }) {
    const topMargin = desktop ? 'mt-4' : 'mt-3';

    return (
        <Link
            href={missingHref}
            className={`${topMargin} inline-flex items-center justify-center rounded-xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-400`}
        >
            Responder perguntas faltantes
        </Link>
    );
}
