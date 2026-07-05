import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import { Link } from '@inertiajs/react';

export type MissionSubmissionResult = {
    volunteerId: number;
    fullName: string;
    alreadyInApp: boolean;
    alreadyInAppReason?: string | null;
    appAccountCreated?: boolean;
    appAccountResolved?: boolean;
    message: string;
    instructions?: string[];
    instructionsEmailSent?: boolean;
    instructionsEmail?: string | null;
};

type Props = {
    submission: MissionSubmissionResult;
    enterAppHref: string;
    onNewRegistration: () => void;
};

function InstructionsBlock({
    instructions,
    emailNotice,
}: {
    instructions: string[];
    emailNotice: string | null;
}) {
    if (instructions.length === 0) {
        return null;
    }

    return (
        <div className="mt-5 space-y-3 border-t border-emerald-200/80 pt-5 dark:border-emerald-800/50">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Próximos passos</h3>
            <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                {instructions.map((line) => (
                    <li key={line}>{line}</li>
                ))}
            </ul>
            {emailNotice ? (
                <p className="rounded-xl border border-emerald-200/80 bg-white/60 px-4 py-3 text-sm text-zinc-700 dark:border-emerald-800/50 dark:bg-zinc-900/40 dark:text-zinc-300">
                    {emailNotice}
                </p>
            ) : null}
        </div>
    );
}

export default function MissionSubmissionSuccess({ submission, enterAppHref, onNewRegistration }: Props) {
    const instructions = submission.instructions ?? [];
    const showLoggedInAppLink = submission.alreadyInApp && submission.appAccountResolved !== false;

    const emailNoticeAfterSend =
        submission.instructionsEmailSent && submission.instructionsEmail
            ? `Enviamos as mesmas informações para o e-mail ${submission.instructionsEmail}.`
            : submission.instructionsEmailSent
              ? 'Enviamos as mesmas informações para o e-mail cadastrado.'
              : null;

    return (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/90 p-5 shadow-sm dark:border-emerald-900/60 dark:bg-emerald-950/30 sm:p-6">
            <div className="flex items-start gap-3">
                <span
                    className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-lg text-white dark:bg-emerald-500"
                    aria-hidden
                >
                    ✓
                </span>
                <div className="min-w-0 flex-1 space-y-2">
                    <h2 className="text-lg font-semibold text-emerald-950 dark:text-emerald-50">Cadastro enviado</h2>
                    <p className="text-sm leading-relaxed text-emerald-900/90 dark:text-emerald-100/90">{submission.message}</p>
                    {submission.fullName ? (
                        <p className="text-xs text-emerald-800/80 dark:text-emerald-200/70">
                            Nome registrado: <span className="font-medium">{submission.fullName}</span>
                        </p>
                    ) : null}
                </div>
            </div>

            <InstructionsBlock instructions={instructions} emailNotice={emailNoticeAfterSend} />

            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                {showLoggedInAppLink ? (
                    <Link href={enterAppHref} className="inline-flex w-full sm:w-auto">
                        <PrimaryButton type="button" className="w-full justify-center sm:min-w-[14rem]">
                            Ir para o início
                        </PrimaryButton>
                    </Link>
                ) : null}
                <SecondaryButton
                    type="button"
                    className="w-full justify-center sm:w-auto"
                    onClick={onNewRegistration}
                >
                    Fazer outro cadastro
                </SecondaryButton>
            </div>
        </div>
    );
}
