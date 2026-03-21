/**
 * Agenda semanal institucional (conteúdo do material Nova Semente).
 */
const ROWS: {
    when: string;
    title: string | null;
    body: string | null;
    lines: string[] | null;
}[] = [
    {
        when: 'SÁB 9H30 e 12H',
        title: 'CULTO',
        body: 'Um momento de pausa, reflexão e conexão com Deus. Com música, mensagem e um ambiente preparado pra você viver uma experiência real de fé.',
        lines: null,
    },
    {
        when: 'SÁB 11H',
        title: null,
        body: null,
        lines: [
            'SEMENTINHA 0 a 16 anos',
            'NOVA ESSÊNCIA a partir dos 17 anos',
            'CONVIVA a partir dos 21 anos',
        ],
    },
    {
        when: 'SÁB 15H',
        title: 'CLASSE COMEÇOS',
        body: 'Pra quem está dando os primeiros passos na fé ou quer recomeçar sua caminhada com Deus. Um espaço de aprendizado, acolhimento e descoberta.',
        lines: null,
    },
    {
        when: 'QUA 20H',
        title: 'CULTO DE ORAÇÃO',
        body: 'Momento de oração, intercessão e intimidade com Deus em comunhão com a igreja. Todos são bem-vindos.',
        lines: null,
    },
];

function CitySilhouette() {
    return (
        <svg
            className="pointer-events-none mt-6 w-full text-black/25"
            viewBox="0 0 1200 64"
            preserveAspectRatio="none"
            aria-hidden
        >
            <path
                fill="currentColor"
                d="M0 64V44h20v6h14V38h18v26H0zm60 0V32h26v8h10V26h28v38H60zm76 0V46h18V30h22v34H136zm48 0V22h32v10h14V40h26v24H184zm88 0V36h20v-5h16v5h18v28H272zm72 0V28h36v36h-36zm48 0V18h44v46h-44zm60 0V40h16V26h28v38h-44zm54 0V32h24v32h-24zm38 0V24h30v40h-30zm42 0V38h18v-6h22v32h-40zm48 0V30h34v34h-34zm46 0V20h40v44h-40zm52 0V34h26v30h-26zm36 0V44h14V28h30v36h-44z"
            />
        </svg>
    );
}

interface Props {
    churchName?: string | null;
}

export default function WeeklyAgendaNovaSemente({ churchName }: Props) {
    return (
        <div
            className="relative overflow-hidden rounded-3xl shadow-lg ring-1 ring-black/10"
            style={{
                background: 'linear-gradient(168deg, #1e4d3a 0%, #153529 45%, #0c221a 100%)',
            }}
        >
            <div
                className="pointer-events-none absolute inset-0 opacity-[0.06]"
                aria-hidden
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='56' height='56' viewBox='0 0 56 56' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M28 0v56M0 28h56' stroke='%23fff' stroke-width='0.5' fill='none'/%3E%3C/svg%3E")`,
                }}
            />
            <div className="relative px-4 pb-1 pt-7 sm:px-7 sm:pt-9">
                <h2 className="text-center text-xs font-bold uppercase tracking-[0.35em] text-emerald-100/95">
                    Agenda semanal
                </h2>
                <div className="mt-8 space-y-0">
                    {ROWS.map((row, idx) => (
                        <div
                            key={row.when}
                            className={`flex gap-3 py-5 sm:gap-5 sm:py-6 ${idx > 0 ? 'border-t border-white/10' : ''}`}
                        >
                            <div className="w-[5.5rem] shrink-0 text-right sm:w-32">
                                <p className="text-[0.7rem] font-bold uppercase leading-tight tracking-wide text-amber-50/95 sm:text-xs">
                                    {row.when}
                                </p>
                            </div>
                            <div className="w-px shrink-0 bg-white/25" aria-hidden />
                            <div className="min-w-0 flex-1">
                                {row.title && (
                                    <p className="text-sm font-bold uppercase tracking-wide text-white">{row.title}</p>
                                )}
                                {row.body && (
                                    <p
                                        className={`text-sm leading-relaxed text-emerald-50/90 ${row.title ? 'mt-1.5' : ''}`}
                                    >
                                        {row.body}
                                    </p>
                                )}
                                {row.lines && (
                                    <ul className="mt-0 space-y-2">
                                        {row.lines.map((line) => (
                                            <li
                                                key={line}
                                                className="text-sm font-semibold uppercase leading-snug tracking-wide text-white/95"
                                            >
                                                {line}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
                <CitySilhouette />
                {churchName && (
                    <p className="-mt-1 pb-5 text-center text-xs font-medium tracking-wide text-emerald-200/75">
                        {churchName}
                    </p>
                )}
                {!churchName && <div className="h-4" />}
            </div>
        </div>
    );
}
