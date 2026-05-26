import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import TextInput from '@/Components/TextInput';
import { Link, useForm } from '@inertiajs/react';
import { FormEventHandler, useState } from 'react';

export type MissionSubmissionResult = {
    volunteerId: number;
    fullName: string;
    alreadyInApp: boolean;
    alreadyInAppReason?: string | null;
    appAccountCreated?: boolean;
    message: string;
    instructions?: string[];
    instructionsEmailSent?: boolean;
    instructionsEmail?: string | null;
};

type Props = {
    submission: MissionSubmissionResult;
    appAccountStoreUrl: string;
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

export default function MissionSubmissionSuccess({
    submission,
    appAccountStoreUrl,
    enterAppHref,
    onNewRegistration,
}: Props) {
    const [wantsAppAccount, setWantsAppAccount] = useState<boolean | null>(null);
    const appForm = useForm({
        email: '',
        password: '',
        password_confirmation: '',
    });

    const instructions = submission.instructions ?? [];
    const canEnterApp = submission.alreadyInApp || submission.appAccountCreated === true;
    const showAppForm =
        !submission.alreadyInApp && !submission.appAccountCreated && wantsAppAccount === true;

    const emailNoticeForPendingAccount =
        wantsAppAccount === true && !submission.appAccountCreated
            ? 'As mesmas informações acima serão enviadas para o e-mail que você cadastrar abaixo.'
            : null;

    const emailNoticeAfterSend =
        submission.instructionsEmailSent && submission.instructionsEmail
            ? `Enviamos as mesmas informações para o e-mail ${submission.instructionsEmail}.`
            : submission.instructionsEmailSent
              ? 'Enviamos as mesmas informações para o e-mail cadastrado.'
              : null;

    const submitAppAccount: FormEventHandler = (e) => {
        e.preventDefault();
        appForm.post(appAccountStoreUrl, {
            preserveScroll: true,
            onFinish: () => appForm.reset('password', 'password_confirmation'),
        });
    };

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

            <InstructionsBlock
                instructions={instructions}
                emailNotice={
                    submission.appAccountCreated || submission.alreadyInApp
                        ? emailNoticeAfterSend
                        : emailNoticeForPendingAccount ?? emailNoticeAfterSend
                }
            />

            {!canEnterApp && wantsAppAccount === null ? (
                <div className="mt-5 space-y-3 border-t border-emerald-200/80 pt-5 dark:border-emerald-800/50">
                    <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                        Deseja criar uma conta no aplicativo agora?
                    </p>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400">
                        Com a conta você acompanha cultos, avisos e outros recursos da igreja no celular.
                    </p>
                    <div className="flex flex-col gap-2 sm:flex-row">
                        <PrimaryButton type="button" className="flex-1 justify-center" onClick={() => setWantsAppAccount(true)}>
                            Sim, criar conta
                        </PrimaryButton>
                        <SecondaryButton type="button" className="flex-1 justify-center" onClick={() => setWantsAppAccount(false)}>
                            Agora não
                        </SecondaryButton>
                    </div>
                </div>
            ) : !canEnterApp && wantsAppAccount === false ? (
                <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
                    Tudo certo. Nossa equipe missionária entrará em contato pelo telefone informado.
                </p>
            ) : null}

            {showAppForm ? (
                <form onSubmit={submitAppAccount} className="mt-5 space-y-4 border-t border-emerald-200/80 pt-5 dark:border-emerald-800/50">
                    <p className="text-sm text-zinc-700 dark:text-zinc-300">Informe e-mail e senha para acessar o app:</p>
                    <div>
                        <InputLabel htmlFor="mission_app_email" value="E-mail" />
                        <TextInput
                            id="mission_app_email"
                            type="email"
                            className="mt-1 block w-full"
                            value={appForm.data.email}
                            onChange={(e) => appForm.setData('email', e.target.value)}
                            autoComplete="email"
                            required
                        />
                        <InputError message={appForm.errors.email} className="mt-1" />
                    </div>
                    <div>
                        <InputLabel htmlFor="mission_app_password" value="Senha" />
                        <TextInput
                            id="mission_app_password"
                            type="password"
                            className="mt-1 block w-full"
                            value={appForm.data.password}
                            onChange={(e) => appForm.setData('password', e.target.value)}
                            autoComplete="new-password"
                            required
                        />
                        <InputError message={appForm.errors.password} className="mt-1" />
                    </div>
                    <div>
                        <InputLabel htmlFor="mission_app_password_confirmation" value="Confirmar senha" />
                        <TextInput
                            id="mission_app_password_confirmation"
                            type="password"
                            className="mt-1 block w-full"
                            value={appForm.data.password_confirmation}
                            onChange={(e) => appForm.setData('password_confirmation', e.target.value)}
                            autoComplete="new-password"
                            required
                        />
                    </div>
                    <PrimaryButton type="submit" className="w-full justify-center" disabled={appForm.processing}>
                        {appForm.processing ? 'Criando conta…' : 'Criar conta no app'}
                    </PrimaryButton>
                </form>
            ) : null}

            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                {canEnterApp ? (
                    <Link href={enterAppHref} className="inline-flex w-full sm:w-auto">
                        <PrimaryButton type="button" className="w-full justify-center sm:min-w-[14rem]">
                            Entrar no aplicativo
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
