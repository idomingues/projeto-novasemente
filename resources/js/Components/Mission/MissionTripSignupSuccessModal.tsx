import Modal from '@/Components/Modal';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import { Link } from '@inertiajs/react';
import { CheckCircleIcon, HeartIcon, SparklesIcon } from '@heroicons/react/24/outline';

type Props = {
    show: boolean;
    onClose: () => void;
    missionHomeUrl: string;
    participantName?: string;
};

export default function MissionTripSignupSuccessModal({
    show,
    onClose,
    missionHomeUrl,
    participantName,
}: Props) {
    const greeting = participantName?.trim()
        ? `${participantName.trim()}, obrigado(a)!`
        : 'Obrigado(a) pela sua inscrição!';

    return (
        <Modal show={show} onClose={onClose} maxWidth="md">
            <div className="overflow-hidden">
                <div className="relative bg-gradient-to-br from-slate-900 via-teal-950 to-amber-950 px-6 pb-8 pt-10 text-center sm:px-8">
                    <div
                        className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-amber-400/20 blur-3xl"
                        aria-hidden
                    />
                    <div
                        className="pointer-events-none absolute -bottom-12 -left-8 h-36 w-36 rounded-full bg-teal-400/15 blur-3xl"
                        aria-hidden
                    />
                    <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-emerald-400/30 bg-emerald-500/15 shadow-lg shadow-emerald-950/40">
                        <CheckCircleIcon className="h-9 w-9 text-emerald-300" aria-hidden />
                    </div>
                    <p className="relative mt-5 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-amber-100">
                        <SparklesIcon className="h-4 w-4 text-amber-300" aria-hidden />
                        Inscrição recebida
                    </p>
                    <h2 className="relative mt-4 text-xl font-bold leading-snug text-white sm:text-2xl">{greeting}</h2>
                    <p className="relative mx-auto mt-3 max-w-sm text-sm leading-relaxed text-teal-100/90">
                        Sua manifestação de interesse na Missão Tailândia & Mianmar foi registrada com sucesso.
                    </p>
                </div>

                <div className="space-y-4 px-6 py-6 sm:px-8">
                    <div className="rounded-2xl border border-teal-200/70 bg-teal-50/60 p-4 dark:border-teal-800/50 dark:bg-teal-950/30">
                        <div className="flex gap-3">
                            <HeartIcon className="mt-0.5 h-5 w-5 shrink-0 text-teal-600 dark:text-teal-400" aria-hidden />
                            <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                                Nossa equipe missionária analisará sua inscrição com carinho. Em breve entraremos em
                                contato por e-mail ou telefone com os próximos passos.
                            </p>
                        </div>
                    </div>
                    <p className="text-center text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                        Por favor, aguarde nosso retorno. Ficamos muito felizes com o seu desejo de servir.
                    </p>
                    <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
                        <PrimaryButton type="button" onClick={onClose} className="w-full sm:w-auto">
                            Entendi
                        </PrimaryButton>
                        <Link href={missionHomeUrl} className="w-full sm:w-auto">
                            <SecondaryButton type="button" className="w-full">
                                Voltar à missão
                            </SecondaryButton>
                        </Link>
                    </div>
                </div>
            </div>
        </Modal>
    );
}
