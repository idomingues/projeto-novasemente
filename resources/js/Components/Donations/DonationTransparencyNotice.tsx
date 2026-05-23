import { InformationCircleIcon } from '@heroicons/react/24/outline';

export type DonationTransparencyInfo = {
    church_name: string | null;
    treasurer_notifications_enabled: boolean;
    donor_name: string | null;
    donor_email: string | null;
};

type Props = {
    info: DonationTransparencyInfo;
    variant?: 'compact' | 'full';
    isAnonymous?: boolean;
    sendEmailConfirmation?: boolean;
};

export default function DonationTransparencyNotice({
    info,
    variant = 'full',
    isAnonymous = false,
    sendEmailConfirmation = false,
}: Props) {
    const churchLabel = info.church_name ?? 'igreja';

    if (variant === 'compact') {
        return (
            <div className="rounded-xl border border-sky-200 bg-sky-50/80 px-4 py-3 text-sm text-sky-950 dark:border-sky-900/50 dark:bg-sky-950/30 dark:text-sky-100">
                <p className="flex items-start gap-2 font-medium">
                    <InformationCircleIcon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
                    Transparência
                </p>
                <p className="mt-2 text-sky-900/90 dark:text-sky-100/90">
                    Seu comprovante fica guardado para conferência interna. Você escolhe se seu nome aparece na lista
                    pública e se quer receber e-mail de confirmação.
                    {info.treasurer_notifications_enabled
                        ? ' A equipe financeira da igreja é avisada automaticamente sobre cada doação.'
                        : ' A equipe financeira acompanha as doações pelo painel interno.'}
                </p>
            </div>
        );
    }

    return (
        <div
            className="rounded-xl border border-sky-200 bg-sky-50/80 p-4 text-sm text-sky-950 dark:border-sky-900/50 dark:bg-sky-950/30 dark:text-sky-100"
            role="note"
            aria-label="Informações sobre uso dos seus dados na doação"
        >
            <h4 className="flex items-center gap-2 font-semibold">
                <InformationCircleIcon className="h-5 w-5 shrink-0" aria-hidden />
                Transparência — o que acontece com sua doação
            </h4>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sky-900/90 dark:text-sky-100/90">
                <li>
                    <strong>Comprovante:</strong> a foto enviada é armazenada com segurança e fica acessível apenas à
                    equipe financeira de <strong>{churchLabel}</strong>, para conferência e auditoria. Não publicamos o
                    comprovante no app.
                </li>
                <li>
                    <strong>Registro:</strong> guardamos valor, data e vínculo com sua conta no app (
                    {info.donor_name ? (
                        <>
                            nome cadastrado: <strong>{info.donor_name}</strong>
                        </>
                    ) : (
                        'nome da sua conta'
                    )}
                    ).
                </li>
                <li>
                    <strong>Lista pública:</strong>{' '}
                    {isAnonymous ? (
                        <>
                            você marcou <strong>anônimo</strong> — na campanha aparecerá «Anônimo». A equipe financeira
                            ainda identifica sua doação internamente para suporte e conferência.
                        </>
                    ) : (
                        <>
                            se você <strong>não</strong> marcar anônimo, seu nome cadastrado pode aparecer em «Doações
                            recentes» da campanha.
                        </>
                    )}
                </li>
                <li>
                    <strong>Aviso à igreja:</strong>{' '}
                    {info.treasurer_notifications_enabled ? (
                        <>
                            o tesoureiro configurado recebe <strong>e-mail automático</strong> com valor, nome (ou
                            «Anônimo») e data. O e-mail <strong>não</strong> inclui o comprovante — apenas o painel
                            interno.
                        </>
                    ) : (
                        <>
                            a igreja acompanha doações pelo painel interno (sem e-mail automático configurado no
                            momento).
                        </>
                    )}
                </li>
                <li>
                    <strong>E-mail para você:</strong>{' '}
                    {info.donor_email ? (
                        sendEmailConfirmation ? (
                            <>
                                você optou por receber confirmação em{' '}
                                <strong>{info.donor_email}</strong> com valor e campanha.
                            </>
                        ) : (
                            <>
                                só enviamos e-mail para <strong>{info.donor_email}</strong> se você marcar a opção
                                abaixo. Por padrão, <strong>não</strong> enviamos.
                            </>
                        )
                    ) : (
                        <>sua conta não tem e-mail cadastrado — não é possível enviar confirmação por e-mail.</>
                    )}
                </li>
            </ul>
        </div>
    );
}
