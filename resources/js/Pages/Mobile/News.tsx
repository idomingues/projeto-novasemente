import MobileLayout from '@/Layouts/MobileLayout';
import { Head, Link } from '@inertiajs/react';
import { NewspaperIcon } from '@heroicons/react/24/outline';

interface PaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

interface Post {
    id: number;
    title: string;
    slug: string;
    excerpt: string | null;
    body: string;
    image_url: string | null;
    published_at: string | null;
}

interface Props {
    posts: {
        data: Post[];
        links: PaginationLink[];
        current_page: number;
        last_page: number;
    };
}

function formatDate(iso: string | null): string {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
}

export default function MobileNews({ posts }: Props) {
    return (
        <MobileLayout>
            <Head title="Notícias" />
            <div className="space-y-6">
                {/* Cabeçalho da seção */}
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center shadow-lg shadow-blue-500/25">
                        <NewspaperIcon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-zinc-900 dark:text-white tracking-tight">
                            Notícias
                        </h1>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">
                            Fique por dentro do que acontece
                        </p>
                    </div>
                </div>

                {posts.data.length === 0 ? (
                    <div className="rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm p-12 text-center">
                        <div className="w-16 h-16 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto mb-4">
                            <NewspaperIcon className="w-8 h-8 text-zinc-400 dark:text-zinc-500" />
                        </div>
                        <p className="text-zinc-600 dark:text-zinc-400 font-medium">Nenhuma notícia publicada</p>
                        <p className="text-sm text-zinc-500 dark:text-zinc-500 mt-1">As novidades aparecerão aqui.</p>
                    </div>
                ) : (
                    <ul className="space-y-5">
                        {posts.data.map((p) => (
                            <li
                                key={p.id}
                                className="rounded-2xl overflow-hidden bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm active:scale-[0.99] transition-transform"
                            >
                                {p.image_url ? (
                                    <div className="relative aspect-[16/10] overflow-hidden bg-zinc-200 dark:bg-zinc-800">
                                        <img
                                            src={p.image_url}
                                            alt=""
                                            className="w-full h-full object-cover"
                                        />
                                        <span className="absolute bottom-2 left-3 px-2.5 py-1 rounded-lg bg-black/60 text-white text-xs font-medium backdrop-blur-sm">
                                            {formatDate(p.published_at)}
                                        </span>
                                    </div>
                                ) : (
                                    <div className="h-32 bg-gradient-to-br from-zinc-200 to-zinc-300 dark:from-zinc-700 dark:to-zinc-800 flex items-center justify-center">
                                        <NewspaperIcon className="w-12 h-12 text-zinc-400 dark:text-zinc-500" />
                                    </div>
                                )}
                                <div className="p-4">
                                    <h2 className="font-semibold text-zinc-900 dark:text-white text-lg leading-snug line-clamp-2">
                                        {p.title}
                                    </h2>
                                    {!p.image_url && (
                                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1.5">
                                            {formatDate(p.published_at)}
                                        </p>
                                    )}
                                    <div
                                        className="mt-3 text-zinc-600 dark:text-zinc-300 text-sm leading-relaxed line-clamp-3"
                                        dangerouslySetInnerHTML={{
                                            __html: p.excerpt || p.body.slice(0, 280) + (p.body.length > 280 ? '…' : ''),
                                        }}
                                    />
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
                {posts.links && posts.links.length > 1 && (
                    <div className="flex justify-center gap-2 flex-wrap pt-2">
                        {posts.links.map((link, i) =>
                            link.url ? (
                                <Link
                                    key={i}
                                    href={link.url}
                                    className={`min-w-[2.5rem] py-2.5 px-3.5 rounded-xl text-sm font-medium transition-colors ${
                                        link.active
                                            ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25'
                                            : 'bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700/50'
                                    }`}
                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                    preserveState
                                />
                            ) : (
                                <span
                                    key={i}
                                    className="min-w-[2.5rem] py-2.5 px-3.5 rounded-xl text-sm font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-400 cursor-default"
                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                />
                            )
                        )}
                    </div>
                )}
            </div>
        </MobileLayout>
    );
}
