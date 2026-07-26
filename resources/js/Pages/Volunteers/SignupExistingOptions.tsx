import FlashMessages from '@/Components/FlashMessages';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import MobileLayout from '@/Layouts/MobileLayout';
import { Head, Link } from '@inertiajs/react';
import {
    BuildingOffice2Icon,
    CheckCircleIcon,
    ExclamationTriangleIcon,
    PencilSquareIcon,
    UserPlusIcon,
} from '@heroicons/react/24/outline';

export type SignupSituationStatus = 'new' | 'existing' | 'privileged';

type Props = {
    token: string;
    churchName: string;
    email: string;
    status: SignupSituationStatus;
    hasAppAccount: boolean;
    isAuthenticated: boolean;
    situationTitle: string;
    situationSummary: string;
    suggestedAction: string;
    primaryActionLabel: string;
    primaryActionUrl: string;
    secondaryActionLabel?: string | null;
    secondaryActionUrl?: string | null;
    loginUrl: string;
    changeEmailUrl: string;
};

export default function SignupExistingOptions({
    churchName,
    email,
    status,
    hasAppAccount,
    isAuthenticated,
    situationTitle,
    situationSummary,
    suggestedAction,
    primaryActionLabel,
    primaryActionUrl,
    secondaryActionLabel = null,
    secondaryActionUrl = null,
    loginUrl,
    changeEmailUrl,
}: Props) {
    const bannerClass =
        status === 'new'
            ? 'border-teal-200 bg-teal-50 text-teal-950 dark:border-teal-900/50 dark:bg-teal-950/35 dark:text-teal-100'
            : status === 'privileged'
              ? 'border-red-200 bg-red-50 text-red-950 dark:border-red-900/50 dark:bg-red-950/35 dark:text-red-100'
              : 'border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/35 dark:text-amber-100';

    const Icon =
        status === 'new' ? CheckCircleIcon : status === 'privileged' ? ExclamationTriangleIcon : UserPlusIcon;

    const iconWrapClass =
        status === 'new'
            ? 'bg-teal-600 dark:bg-teal-500'
            : status === 'privileged'
              ? 'bg-red-600'
              : 'bg-amber-500';

    return (
        <MobileLayout>
            <Head title={`${situationTitle} — ${churchName}`} />
            <FlashMessages />

            <div className="mx-auto w-full max-w-md space-y-5 px-1 sm:px-0">
                <header>
                    <Link
                        href={changeEmailUrl}
                        className="mb-4 inline-flex cursor-pointer text-sm font-medium text-teal-800 underline-offset-2 hover:underline dark:text-teal-300"
                    >
                        Trocar e-mail
                    </Link>
                    <div className="flex items-start gap-3">
                        <div
                            className={`flex size-12 shrink-0 items-center justify-center rounded-xl shadow-sm ${iconWrapClass}`}
                        >
                            <Icon className="size-6 text-white" aria-hidden />
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
                                Situação identificada
                            </p>
                            <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
                                {situationTitle}
                            </h1>
                            <p className="mt-1 text-sm font-semibold text-zinc-700 dark:text-zinc-300">{churchName}</p>
                            <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                                E-mail verificado:{' '}
                                <span className="font-semibold text-zinc-800 dark:text-zinc-200">{email}</span>
                            </p>
                        </div>
                    </div>
                </header>

                <div className={`rounded-xl border px-4 py-3 text-sm ${bannerClass}`} role="status">
                    <p className="font-semibold">{situationSummary}</p>
                    <p className="mt-1.5 leading-relaxed opacity-95">{suggestedAction}</p>
                </div>

                <div className="space-y-3 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80">
                    {status !== 'privileged' ? (
                        <Link href={primaryActionUrl} className="block">
                            <PrimaryButton
                                type="button"
                                className="inline-flex w-full cursor-pointer items-center justify-center gap-2"
                            >
                                {status === 'new' ? (
                                    <UserPlusIcon className="h-5 w-5 shrink-0" aria-hidden />
                                ) : (
                                    <PencilSquareIcon className="h-5 w-5 shrink-0" aria-hidden />
                                )}
                                {primaryActionLabel}
                            </PrimaryButton>
                        </Link>
                    ) : null}

                    {status === 'existing' && secondaryActionLabel && secondaryActionUrl ? (
                        <Link href={secondaryActionUrl} className="block">
                            <SecondaryButton
                                type="button"
                                className="inline-flex w-full cursor-pointer items-center justify-center gap-2 !normal-case !tracking-normal"
                            >
                                <BuildingOffice2Icon className="h-5 w-5 shrink-0" aria-hidden />
                                {secondaryActionLabel}
                            </SecondaryButton>
                        </Link>
                    ) : null}

                    {status === 'existing' && !isAuthenticated && hasAppAccount ? (
                        <p className="pt-1 text-center text-xs text-zinc-500 dark:text-zinc-400">
                            Já tem senha?{' '}
                            <Link
                                href={loginUrl}
                                className="cursor-pointer font-semibold text-teal-800 underline-offset-2 hover:underline dark:text-teal-300"
                            >
                                Entrar no app
                            </Link>
                        </p>
                    ) : null}

                    {status === 'privileged' ? (
                        <Link href={changeEmailUrl} className="block">
                            <PrimaryButton type="button" className="w-full justify-center cursor-pointer">
                                Usar outro e-mail
                            </PrimaryButton>
                        </Link>
                    ) : null}
                </div>
            </div>
        </MobileLayout>
    );
}
