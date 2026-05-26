import MobileLayout from '@/Layouts/MobileLayout';
import MissionHubBackLink from '@/Components/Mission/MissionHubBackLink';
import { Head } from '@inertiajs/react';

type AboutBlock = {
    key: string;
    title: string;
    body: string | null;
};

interface Props {
    blocks: AboutBlock[];
}

export default function MissionAbout({ blocks }: Props) {
    return (
        <MobileLayout>
            <Head title="Quem somos — Missão" />
            <div className="space-y-6">
                <div>
                    <MissionHubBackLink />
                    <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
                        Conheça a missão, o que fazemos e o que pretendemos.
                    </p>
                </div>

                <div className="space-y-4">
                    {blocks.map((block) => (
                        <section
                            key={block.key}
                            className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
                        >
                            <h2 className="border-b border-zinc-200 pb-2 text-base font-bold uppercase tracking-wide text-zinc-900 dark:border-zinc-700 dark:text-white">
                                {block.title}
                            </h2>
                            {block.body?.trim() ? (
                                <div className="mt-4 space-y-3 whitespace-pre-wrap text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                                    {block.body}
                                </div>
                            ) : (
                                <p className="mt-4 text-sm italic text-zinc-500">Conteúdo em breve.</p>
                            )}
                        </section>
                    ))}
                </div>
            </div>
        </MobileLayout>
    );
}
