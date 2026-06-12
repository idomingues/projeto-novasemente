import Checkbox from '@/Components/Checkbox';
import type { VolunteerSignupCompletion } from '@/utils/volunteerSignupCompletion';
import {
    formatVolunteerSignupProgressLabel,
    volunteerSignupFullEditHref,
    volunteerSignupMissingOnlyHref,
} from '@/utils/volunteerSignupCompletion';
import { Link, usePage } from '@inertiajs/react';
import { ExclamationTriangleIcon, PencilSquareIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import { useState } from 'react';

interface VolunteerMinistry {
    id: number;
    name: string;
}

interface Props {
    /** Alerta quando o cadastro está incompleto (home / perfil). */
    volunteerSignupCompletion?: VolunteerSignupCompletion | null;
    /** Progresso completo do questionário — sempre enviado na edição de perfil. */
    volunteerSignupProgress?: VolunteerSignupCompletion | null;
    variant?: 'mobile' | 'desktop';
    className?: string;
    /** Dentro do card «Informações do perfil» (sem borda externa duplicada). */
    embedded?: boolean;
}

export default function ProfileVolunteerSection({
    volunteerSignupCompletion = null,
    volunteerSignupProgress = null,
    variant = 'desktop',
    className = '',
    embedded = false,
}: Props) {
    const page = usePage();
    const { volunteerMinistries = [] } = (page.props as {
        volunteerMinistries?: VolunteerMinistry[];
    }) || {};
    const auth = (page.props as {
        auth?: { user?: { is_volunteer?: boolean } };
    }).auth;
    const isVolunteer = auth?.user?.is_volunteer === true;
    const canOpenSignup = route().has('volunteers.self-signup.edit');
    const [wantsVolunteer, setWantsVolunteer] = useState(false);

    if (!canOpenSignup) {
        return null;
    }

    const pendingVolunteerSignup =
        isVolunteer && volunteerSignupCompletion != null && !volunteerSignupCompletion.is_complete;
    const progressLabel = pendingVolunteerSignup
        ? formatVolunteerSignupProgressLabel(volunteerSignupCompletion)
        : null;
    const signupHref = pendingVolunteerSignup ? volunteerSignupMissingOnlyHref() : volunteerSignupFullEditHref();

    const outerClass = embedded
        ? `mt-8 border-t border-zinc-200 pt-6 dark:border-zinc-700 ${className}`.trim()
        : variant === 'desktop'
          ? `bg-white dark:bg-zinc-800 p-4 shadow sm:rounded-lg sm:p-8 ${className}`.trim()
          : `rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 ${className}`.trim();

    const innerClass = embedded
        ? 'space-y-4'
        : variant === 'desktop'
          ? 'max-w-xl space-y-4'
          : 'space-y-4';

    const titleClass =
        variant === 'desktop'
            ? 'text-sm font-semibold text-gray-900 dark:text-gray-100'
            : 'font-semibold text-zinc-900 dark:text-white';

    const bodyClass =
        variant === 'desktop'
            ? 'text-xs text-gray-600 dark:text-gray-400'
            : 'text-sm text-zinc-600 dark:text-zinc-400';

    const primaryBtnClass =
        'inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary-600 px-5 py-3 text-base font-bold text-white shadow-md shadow-primary-600/25 transition hover:bg-primary-700 active:scale-[0.99] dark:bg-primary-500 dark:shadow-primary-900/30 dark:hover:bg-primary-400 sm:w-auto sm:min-w-[14rem]';

    const featuredActionClass =
        'block rounded-2xl border-2 border-primary-200 bg-gradient-to-br from-primary-50 via-white to-primary-50/80 p-4 shadow-sm dark:border-primary-800 dark:from-primary-950/50 dark:via-zinc-900 dark:to-primary-950/30';

    const featuredBtnClass =
        'inline-flex w-full cursor-pointer items-center justify-center gap-2.5 rounded-xl bg-primary-600 px-5 py-3.5 text-base font-bold tracking-tight text-white shadow-lg shadow-primary-600/30 ring-2 ring-primary-500/20 transition hover:bg-primary-700 hover:shadow-xl active:scale-[0.99] dark:bg-primary-500 dark:ring-primary-400/20 dark:hover:bg-primary-400';

    return (
        <div className={outerClass} aria-label="Voluntariado">
            <div className={innerClass}>
                <div>
                    <p className={titleClass}>Voluntariado</p>
                    <p className={`mt-1 ${bodyClass}`}>
                        {pendingVolunteerSignup
                            ? 'Complete o questionário para finalizar seu cadastro de voluntário. Suas respostas são salvas automaticamente.'
                            : isVolunteer
                              ? 'Consulte os departamentos em que serve e atualize seu questionário de voluntário quando precisar.'
                              : 'Marque abaixo se deseja servir e preencha o questionário completo para ser efetivado(a) como voluntário(a).'}
                    </p>
                </div>

                {pendingVolunteerSignup && progressLabel && volunteerSignupCompletion ? (
                    <div
                        className="rounded-xl border border-amber-200 bg-amber-50/90 p-3 dark:border-amber-900/50 dark:bg-amber-950/30"
                        role="status"
                    >
                        <div className="flex flex-wrap items-center gap-2">
                            <ExclamationTriangleIcon className="h-4 w-4 text-amber-800 dark:text-amber-200" aria-hidden />
                            <span className="text-sm font-semibold text-amber-950 dark:text-amber-50">Cadastro incompleto</span>
                            <span className="inline-flex rounded-full bg-amber-200/80 px-2 py-0.5 text-xs font-bold tabular-nums text-amber-950 dark:bg-amber-900/60 dark:text-amber-100">
                                {progressLabel}
                            </span>
                        </div>
                        <p className="mt-1 text-sm text-amber-900/90 dark:text-amber-100/90">
                            {volunteerSignupCompletion.missing_count === 1
                                ? 'Falta 1 pergunta obrigatória.'
                                : `Faltam ${volunteerSignupCompletion.missing_count} perguntas obrigatórias.`}
                        </p>
                        <Link href={signupHref} className={`${primaryBtnClass} mt-3`}>
                            <PencilSquareIcon className="h-5 w-5 shrink-0" aria-hidden />
                            Continuar cadastro
                        </Link>
                    </div>
                ) : null}

                {isVolunteer && !pendingVolunteerSignup ? (
                    <div className={featuredActionClass}>
                        <p className="text-sm font-semibold text-primary-900 dark:text-primary-100">
                            Questionário de voluntário
                        </p>
                        <p className="mt-1 text-xs text-primary-800/80 dark:text-primary-200/80">
                            Revise ou complete suas respostas quando quiser. Tudo é salvo automaticamente.
                        </p>
                        <Link href={signupHref} className={`${featuredBtnClass} mt-4`}>
                            <PencilSquareIcon className="h-5 w-5 shrink-0" aria-hidden />
                            Atualizar cadastro de voluntário
                        </Link>
                    </div>
                ) : null}

                {isVolunteer ? (
                    <div
                        className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50/60 p-4 dark:border-zinc-600 dark:bg-zinc-800/30 space-y-3"
                        aria-label="Departamentos em que serve — somente leitura"
                    >
                        <p className={titleClass}>Departamentos em que serve</p>
                        <p className={bodyClass}>
                            Somente consulta. A lista é definida pela equipe de voluntariado. Para alterações, fale com um líder ou com a
                            secretaria.
                        </p>
                        {volunteerMinistries.length > 0 ? (
                            <ul className="space-y-1.5 text-sm text-zinc-800 dark:text-zinc-200">
                                {volunteerMinistries.map((m) => (
                                    <li key={m.id} className="flex items-center gap-2">
                                        <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-500 dark:bg-zinc-400" />
                                        {m.name}
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className={bodyClass}>Você ainda não está vinculado a nenhum departamento.</p>
                        )}
                    </div>
                ) : !isVolunteer ? (
                    <label className="flex cursor-pointer items-start gap-3">
                        <Checkbox checked={wantsVolunteer} onChange={(e) => setWantsVolunteer(e.target.checked)} />
                        <span className="text-sm text-zinc-700 dark:text-zinc-200">Quero ser voluntário(a) na igreja</span>
                    </label>
                ) : null}

                {!pendingVolunteerSignup && !isVolunteer && wantsVolunteer ? (
                    <Link href={signupHref} className={primaryBtnClass}>
                        <UserGroupIcon className="h-5 w-5 shrink-0" aria-hidden />
                        Preencher cadastro de voluntário
                    </Link>
                ) : null}
            </div>
        </div>
    );
}
