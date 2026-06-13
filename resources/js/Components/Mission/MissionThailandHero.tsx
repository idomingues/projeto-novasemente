import MissionParticipateButton from '@/Components/Mission/MissionParticipateButton';
import {
    ArrowRightIcon,
    CalendarDaysIcon,
    GlobeAsiaAustraliaIcon,
    MapPinIcon,
    SparklesIcon,
    UserGroupIcon,
} from '@heroicons/react/24/outline';

type Variant = 'page' | 'hub';

type Props = {
    variant?: Variant;
    participateHref?: string;
};

const stats = [
    { icon: MapPinIcon, label: 'Destino', value: 'Tailândia & Mianmar' },
    { icon: CalendarDaysIcon, label: 'Missão', value: '14–24 out 2026' },
    { icon: UserGroupIcon, label: 'Impacto', value: '+30 mil pessoas' },
];

export default function MissionThailandHero({ variant = 'page', participateHref }: Props) {
    const isPage = variant === 'page';

    return (
        <header
            className={`relative overflow-hidden rounded-3xl border border-amber-500/20 shadow-lg shadow-teal-950/15 dark:border-amber-400/15 dark:shadow-black/40 ${
                isPage ? 'lg:rounded-[1.75rem]' : ''
            }`}
        >
            <div
                className="absolute inset-0 bg-gradient-to-br from-slate-900 via-teal-950 to-amber-950"
                aria-hidden
            />
            <div
                className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-amber-400/20 blur-3xl"
                aria-hidden
            />
            <div
                className="absolute -bottom-24 -left-12 h-64 w-64 rounded-full bg-teal-400/15 blur-3xl"
                aria-hidden
            />
            <div
                className="absolute inset-0 opacity-[0.07]"
                style={{
                    backgroundImage:
                        'radial-gradient(circle at 1px 1px, rgb(255 255 255) 1px, transparent 0)',
                    backgroundSize: '24px 24px',
                }}
                aria-hidden
            />

            <div className={`relative ${isPage ? 'p-6 sm:p-8 lg:p-10' : 'p-5 sm:p-6'}`}>
                <div className={`flex flex-col gap-6 ${isPage ? 'lg:flex-row lg:items-end lg:justify-between' : ''}`}>
                    <div className="min-w-0 flex-1">
                        <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-amber-100 backdrop-blur-sm">
                            <GlobeAsiaAustraliaIcon className="h-4 w-4 text-amber-300" aria-hidden />
                            Missão transcultural
                        </div>

                        <h1
                            className={`mt-4 font-bold tracking-tight text-white ${
                                isPage
                                    ? 'text-3xl leading-tight sm:text-4xl lg:text-[2.75rem] lg:leading-[1.1]'
                                    : 'text-xl leading-snug sm:text-2xl'
                            }`}
                        >
                            Missão Tailândia & Mianmar
                        </h1>

                        <p
                            className={`mt-3 max-w-2xl leading-relaxed text-teal-100/90 ${
                                isPage ? 'text-sm sm:text-base' : 'text-sm'
                            }`}
                        >
                            Atendimento médico, odontológico e assistencial a comunidades em extrema vulnerabilidade —
                            especialmente refugiados.
                        </p>

                        {isPage ? (
                            <p className="mt-4 text-sm italic text-amber-100/80">
                                &quot;Be the change you want to see in the world.&quot;
                            </p>
                        ) : (
                            <p className="mt-2 text-xs text-teal-200/70">Outubro de 2026 · Nova Semente</p>
                        )}
                    </div>

                    {isPage && participateHref ? (
                        <div className="flex shrink-0 lg:min-w-[11rem]">
                            <MissionParticipateButton variant="hero" href={participateHref} />
                        </div>
                    ) : null}
                </div>

                <div
                    className={`mt-6 grid gap-2.5 sm:grid-cols-3 ${isPage ? 'lg:mt-8' : 'mt-4'}`}
                    role="list"
                    aria-label="Destaques da missão"
                >
                    {stats.map(({ icon: Icon, label, value }) => (
                        <div
                            key={label}
                            role="listitem"
                            className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3.5 py-3 backdrop-blur-sm"
                        >
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-400/15 text-amber-200">
                                <Icon className="h-4 w-4" aria-hidden />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-teal-200/80">
                                    {label}
                                </p>
                                <p className="truncate text-sm font-semibold text-white">{value}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {!isPage ? (
                    <div className="mt-4 flex items-center gap-1.5 text-sm font-semibold text-amber-200">
                        <SparklesIcon className="h-4 w-4" aria-hidden />
                        Conheça o projeto completo
                        <ArrowRightIcon className="h-4 w-4" aria-hidden />
                    </div>
                ) : null}
            </div>
        </header>
    );
}
