/**
 * Agenda semanal institucional (conteúdo do material Nova Semente).
 * Visual alinhado ao resto do app: superfície neutra; verde só em horários e acentos discretos.
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

interface Props {
    churchName?: string | null;
}

export default function WeeklyAgendaNovaSemente({ churchName }: Props) {
    return (
        <section
            className="rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
            aria-labelledby="weekly-agenda-heading"
        >
            <div className="border-b border-zinc-100 px-4 py-3 dark:border-zinc-800 sm:px-5">
                <h2
                    id="weekly-agenda-heading"
                    className="text-center text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400"
                >
                    Agenda semanal
                </h2>
            </div>
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {ROWS.map((row) => (
                    <div key={row.when} className="flex gap-3 px-4 py-4 sm:gap-4 sm:px-5 sm:py-5">
                        <div className="flex w-[5.75rem] shrink-0 flex-col items-end sm:w-32">
                            <p className="text-right text-[0.65rem] font-bold uppercase leading-tight tracking-wide text-brand-600 dark:text-brand-400 sm:text-xs">
                                {row.when}
                            </p>
                        </div>
                        <div
                            className="w-0.5 shrink-0 self-stretch rounded-full bg-brand-200 dark:bg-brand-800"
                            aria-hidden
                        />
                        <div className="min-w-0 flex-1">
                            {row.title && (
                                <p className="text-sm font-semibold uppercase tracking-wide text-zinc-900 dark:text-white">
                                    {row.title}
                                </p>
                            )}
                            {row.body && (
                                <p
                                    className={`text-sm leading-relaxed text-zinc-600 dark:text-zinc-400 ${row.title ? 'mt-1.5' : ''}`}
                                >
                                    {row.body}
                                </p>
                            )}
                            {row.lines && (
                                <ul className="mt-0 space-y-2">
                                    {row.lines.map((line) => (
                                        <li
                                            key={line}
                                            className="text-sm font-semibold uppercase leading-snug tracking-wide text-zinc-800 dark:text-zinc-200"
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
            {churchName && (
                <p className="border-t border-zinc-100 px-4 py-3 text-center text-xs font-medium text-zinc-500 dark:text-zinc-400 dark:border-zinc-800">
                    {churchName}
                </p>
            )}
        </section>
    );
}
