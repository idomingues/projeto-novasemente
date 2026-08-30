import {
    DIZIMO_PACTO_CLOSING,
    DIZIMO_PACTO_INTRO,
    DIZIMO_PACTO_PILLARS,
    DIZIMO_PACTO_SECTIONS,
} from '@/data/dizimoPactoStory';
import {
    BookOpenIcon,
    GlobeAmericasIcon,
    HeartIcon,
    ScaleIcon,
    SparklesIcon,
} from '@heroicons/react/24/outline';
import type { ComponentType, SVGProps } from 'react';

type LineIcon = ComponentType<SVGProps<SVGSVGElement> & { className?: string }>;

const SECTION_ICONS: Record<(typeof DIZIMO_PACTO_SECTIONS)[number]['id'], LineIcon> = {
    dizimo: ScaleIcon,
    pacto: HeartIcon,
    semente: GlobeAmericasIcon,
};

const PILLAR_ICONS: Record<(typeof DIZIMO_PACTO_PILLARS)[number]['id'], LineIcon> = {
    fidelidade: ScaleIcon,
    gratidao: HeartIcon,
    compromisso: BookOpenIcon,
    adoracao: SparklesIcon,
};

function Verse({ text, reference }: { text: string; reference: string }) {
    return (
        <blockquote className="rounded-2xl bg-zinc-50 px-4 py-4 ring-1 ring-zinc-200/80 dark:bg-zinc-950/50 dark:ring-zinc-800">
            <p className="text-[15px] font-medium leading-relaxed text-zinc-800 dark:text-zinc-100">
                &ldquo;{text}&rdquo;
            </p>
            <footer className="mt-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-700 dark:text-brand-300">
                {reference}
            </footer>
        </blockquote>
    );
}

function CircleIcon({ icon: Icon }: { icon: LineIcon }) {
    return (
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-brand-600 shadow-sm ring-1 ring-brand-200/90 dark:bg-zinc-950 dark:text-brand-300 dark:ring-brand-800/70">
            <Icon className="h-5 w-5" aria-hidden strokeWidth={1.6} />
        </span>
    );
}

export default function DizimoPactoStory() {
    return (
        <div className="space-y-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-400 dark:text-zinc-500">
                Por que devolver
            </p>

            <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-zinc-200/90 dark:bg-zinc-900 dark:ring-zinc-800 sm:p-6">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-700 dark:text-brand-300">
                    {DIZIMO_PACTO_INTRO.eyebrow}
                </p>
                <h2 className="mt-1.5 text-[1.65rem] font-semibold leading-tight tracking-tight text-zinc-900 dark:text-white sm:text-3xl">
                    Uma vida de{' '}
                    <span className="text-brand-600 dark:text-brand-300">fidelidade</span>, gratidão e missão
                </h2>
                <div className="mt-4 space-y-3 text-[15px] leading-relaxed text-zinc-600 dark:text-zinc-300">
                    {DIZIMO_PACTO_INTRO.paragraphs.map((paragraph) => (
                        <p key={paragraph.slice(0, 48)}>{paragraph}</p>
                    ))}
                </div>
                <div className="mt-5">
                    <Verse
                        text={DIZIMO_PACTO_INTRO.verse.text}
                        reference={DIZIMO_PACTO_INTRO.verse.reference}
                    />
                </div>
            </section>

            {DIZIMO_PACTO_SECTIONS.map((section) => {
                const Icon = SECTION_ICONS[section.id];
                return (
                    <section
                        key={section.id}
                        className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-zinc-200/90 dark:bg-zinc-900 dark:ring-zinc-800 sm:p-6"
                    >
                        <div className="flex items-start gap-3.5">
                            <CircleIcon icon={Icon} />
                            <div className="min-w-0">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-700 dark:text-brand-300">
                                    {section.kicker}
                                </p>
                                <h2 className="mt-1 text-lg font-semibold tracking-tight text-zinc-900 dark:text-white">
                                    {section.title}
                                </h2>
                            </div>
                        </div>
                        <div className="mt-4 space-y-3 text-[15px] leading-relaxed text-zinc-600 dark:text-zinc-300">
                            {section.paragraphs.map((paragraph) => (
                                <p key={paragraph.slice(0, 48)}>{paragraph}</p>
                            ))}
                        </div>
                        <p className="mt-5 text-sm font-medium text-zinc-500 dark:text-zinc-400">
                            {section.invitation}
                        </p>
                        <div className="mt-2.5">
                            <Verse text={section.verse.text} reference={section.verse.reference} />
                        </div>
                    </section>
                );
            })}

            <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-zinc-200/90 dark:bg-zinc-900 dark:ring-zinc-800 sm:p-6">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-700 dark:text-brand-300">
                    {DIZIMO_PACTO_CLOSING.eyebrow}
                </p>
                <h2 className="mt-1.5 text-xl font-semibold tracking-tight text-zinc-900 dark:text-white sm:text-2xl">
                    {DIZIMO_PACTO_CLOSING.title}
                </h2>
                <ul className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
                    {DIZIMO_PACTO_PILLARS.map((pillar) => {
                        const Icon = PILLAR_ICONS[pillar.id];
                        return (
                            <li
                                key={pillar.id}
                                className="flex flex-col items-center rounded-2xl bg-zinc-50 px-3 py-4 text-center ring-1 ring-zinc-200/80 dark:bg-zinc-950/40 dark:ring-zinc-800"
                            >
                                <CircleIcon icon={Icon} />
                                <p className="mt-3 text-sm font-semibold text-zinc-900 dark:text-white">
                                    {pillar.label}
                                </p>
                                <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{pillar.line}</p>
                            </li>
                        );
                    })}
                </ul>
                <div className="mt-5 space-y-3 text-[15px] leading-relaxed text-zinc-600 dark:text-zinc-300">
                    {DIZIMO_PACTO_CLOSING.paragraphs.map((paragraph) => (
                        <p key={paragraph.slice(0, 48)}>{paragraph}</p>
                    ))}
                </div>
                <div className="mt-5">
                    <Verse
                        text={DIZIMO_PACTO_CLOSING.verse.text}
                        reference={DIZIMO_PACTO_CLOSING.verse.reference}
                    />
                </div>
            </section>
        </div>
    );
}
