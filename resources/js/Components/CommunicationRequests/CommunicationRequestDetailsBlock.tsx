export type CommunicationDetailsPayload = {
    demandTypeLabel: string;
    priorityLabel: string;
    eventDate: string | null;
    ministryName: string | null;
    artChannelLabels: string[];
    coverageEvent: string | null;
    coverageSupportLabels: string[];
    technicalEvent: string | null;
    technicalSupportLabels: string[];
    attachments: Array<{ path: string; name: string; url: string }>;
};

function formatDateBr(ymd: string | null): string {
    if (!ymd) return '—';
    const parts = ymd.split('-').map((x) => parseInt(x, 10));
    const [y, m, d] = parts;
    if (!y || !m || !d) return ymd;
    return new Date(y, m - 1, d).toLocaleDateString('pt-BR');
}

function DetailRow({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <span className="font-medium text-zinc-600 dark:text-zinc-400">{label}: </span>
            <span>{value}</span>
        </div>
    );
}

export default function CommunicationRequestDetailsBlock({ details }: { details: CommunicationDetailsPayload }) {
    const hasExtras =
        details.eventDate ||
        details.ministryName ||
        details.artChannelLabels.length > 0 ||
        details.coverageEvent ||
        details.coverageSupportLabels.length > 0 ||
        details.technicalEvent ||
        details.technicalSupportLabels.length > 0 ||
        details.attachments.length > 0;

    if (!hasExtras) {
        return null;
    }

    return (
        <div className="rounded-2xl border border-zinc-200 bg-zinc-50/80 p-4 text-sm text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800/40 dark:text-zinc-300 space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Detalhes da demanda
            </div>
            <DetailRow label="Tipo" value={details.demandTypeLabel} />
            <DetailRow label="Prioridade" value={details.priorityLabel} />
            {details.eventDate ? <DetailRow label="Data do evento" value={formatDateBr(details.eventDate)} /> : null}
            {details.ministryName ? <DetailRow label="Ministério/responsável" value={details.ministryName} /> : null}
            {details.artChannelLabels.length > 0 ? (
                <DetailRow label="Canais" value={details.artChannelLabels.join(' · ')} />
            ) : null}
            {details.coverageEvent ? <DetailRow label="Programação/evento" value={details.coverageEvent} /> : null}
            {details.coverageSupportLabels.length > 0 ? (
                <DetailRow label="Apoio (cobertura)" value={details.coverageSupportLabels.join(' · ')} />
            ) : null}
            {details.technicalEvent ? <DetailRow label="Programação/evento (técnica)" value={details.technicalEvent} /> : null}
            {details.technicalSupportLabels.length > 0 ? (
                <DetailRow label="Apoio (equipe técnica)" value={details.technicalSupportLabels.join(' · ')} />
            ) : null}
            {details.attachments.length > 0 ? (
                <div>
                    <span className="font-medium text-zinc-600 dark:text-zinc-400">Materiais: </span>
                    <ul className="mt-1 list-disc pl-5">
                        {details.attachments.map((a) => (
                            <li key={a.path}>
                                <a
                                    href={a.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sky-700 underline dark:text-sky-300"
                                >
                                    {a.name}
                                </a>
                            </li>
                        ))}
                    </ul>
                </div>
            ) : null}
        </div>
    );
}
