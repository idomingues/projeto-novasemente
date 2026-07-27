import { Link } from '@inertiajs/react';
import { CakeIcon, ExclamationTriangleIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import type { VolunteerSignupCompletion } from '@/utils/volunteerSignupCompletion';
import {
    formatVolunteerSignupProgressLabel,
    volunteerSignupOnlyBirthDateMissing,
    volunteerSignupPendingHref,
} from '@/utils/volunteerSignupCompletion';

interface Props {
    completion: VolunteerSignupCompletion;
}

export default function VolunteerSignupIncompleteBanner({ completion }: Props) {
    if (completion.is_complete) {
        return null;
    }

    const onlyBirthDate = volunteerSignupOnlyBirthDateMissing(completion);
    const missingHref =
        route().has('volunteers.self-signup.edit') || route().has('volunteers.self-signup.birth-date')
            ? volunteerSignupPendingHref(completion)
            : null;

    const title = onlyBirthDate ? 'Informe sua data de nascimento' : 'Finalize seu cadastro de voluntário';
    const missingLabel = onlyBirthDate
        ? 'Só falta a data de nascimento para concluir este passo.'
        : completion.missing_count === 1
          ? 'Falta 1 pergunta obrigatória para concluir seu cadastro de voluntário.'
          : `Faltam ${completion.missing_count} perguntas obrigatórias para concluir seu cadastro de voluntário.`;
    const hint = onlyBirthDate
        ? 'Leva poucos segundos e ajuda a equipe a lembrar do seu aniversário.'
        : 'Suas respostas são salvas automaticamente enquanto você preenche o questionário.';
    const cta = onlyBirthDate ? 'Informar data de nascimento' : 'Continuar cadastro';
    const progressLabel = formatVolunteerSignupProgressLabel(completion);
    const Icon = onlyBirthDate ? CakeIcon : UserGroupIcon;

    return (
        <div
            className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 shadow-sm dark:border-amber-900/50 dark:bg-amber-950/35"
            role="alert"
        >
            <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/40">
                    <Icon className="h-5 w-5 text-amber-800 dark:text-amber-200" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-amber-950 dark:text-amber-50">{title}</p>
                        {!onlyBirthDate ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold tabular-nums text-amber-900 dark:bg-amber-900/50 dark:text-amber-100">
                                <ExclamationTriangleIcon className="h-3.5 w-3.5" aria-hidden />
                                {progressLabel}
                            </span>
                        ) : null}
                    </div>
                    <p className="mt-1 text-sm text-amber-900/90 dark:text-amber-100/90">{missingLabel}</p>
                    <p className="mt-2 text-xs text-amber-900/80 dark:text-amber-100/80">{hint}</p>
                    {missingHref ? (
                        <Link
                            href={missingHref}
                            className="mt-3 inline-flex cursor-pointer items-center justify-center rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-400"
                        >
                            {cta}
                        </Link>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
