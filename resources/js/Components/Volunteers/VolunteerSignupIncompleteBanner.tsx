import { Link } from '@inertiajs/react';
import { ExclamationTriangleIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import type { VolunteerSignupCompletion } from '@/utils/volunteerSignupCompletion';
import { describeMissingVolunteerSignupFields, volunteerSignupMissingOnlyHref } from '@/utils/volunteerSignupCompletion';

interface Props {
    completion: VolunteerSignupCompletion;
}

export default function VolunteerSignupIncompleteBanner({ completion }: Props) {
    if (completion.is_complete) {
        return null;
    }

    const missingLabel =
        completion.missing_count === 1
            ? 'Falta 1 pergunta obrigatória para concluir seu cadastro de voluntário.'
            : `Faltam ${completion.missing_count} perguntas obrigatórias para concluir seu cadastro de voluntário.`;

    const pendingHint = describeMissingVolunteerSignupFields(completion.missing_fields);

    const missingHref = route().has('volunteers.self-signup.edit') ? volunteerSignupMissingOnlyHref() : null;

    return (
        <div
            className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 shadow-sm dark:border-amber-900/50 dark:bg-amber-950/35"
            role="alert"
        >
            <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/40">
                    <UserGroupIcon className="h-5 w-5 text-amber-800 dark:text-amber-200" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-amber-950 dark:text-amber-50">Cadastro de voluntário incompleto</p>
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900 dark:bg-amber-900/50 dark:text-amber-100">
                            <ExclamationTriangleIcon className="h-3.5 w-3.5" aria-hidden />
                            {completion.percent}%
                        </span>
                    </div>
                    <p className="mt-1 text-sm text-amber-900/90 dark:text-amber-100/90">
                        {missingLabel}
                        {pendingHint ? (
                            <>
                                {' '}
                                <span className="font-medium">Pendente: {pendingHint}.</span>
                            </>
                        ) : null}
                    </p>
                    {missingHref ? (
                        <Link
                            href={missingHref}
                            className="mt-3 inline-flex items-center justify-center rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-400"
                        >
                            Responder perguntas faltantes
                        </Link>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
