import MobileLayout from '@/Layouts/MobileLayout';
import { Head, Link } from '@inertiajs/react';

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

export default function MobileNews({ posts }: Props) {
    return (
        <MobileLayout>
            <Head title="Notícias" />
            <div className="space-y-4">
                <h1 className="text-xl font-bold text-zinc-900 dark:text-white">Notícias</h1>
                {posts.data.length === 0 ? (
                    <p className="text-zinc-500 dark:text-zinc-400 text-center py-8">
                        Nenhuma notícia publicada.
                    </p>
                ) : (
                    <ul className="space-y-4">
                        {posts.data.map((p) => (
                            <li
                                key={p.id}
                                className="rounded-2xl overflow-hidden bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800"
                            >
                                {p.image_url && (
                                    <img
                                        src={p.image_url}
                                        alt=""
                                        className="w-full h-40 object-cover"
                                    />
                                )}
                                <div className="p-4">
                                    <h2 className="font-semibold text-zinc-900 dark:text-white text-lg">
                                        {p.title}
                                    </h2>
                                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                                        {p.published_at
                                            ? new Date(p.published_at).toLocaleDateString('pt-BR', {
                                                  day: '2-digit',
                                                  month: 'long',
                                                  year: 'numeric',
                                              })
                                            : ''}
                                    </p>
                                    <div
                                        className="mt-3 text-zinc-600 dark:text-zinc-300 text-sm prose prose-sm dark:prose-invert max-w-none line-clamp-4"
                                        dangerouslySetInnerHTML={{
                                            __html: p.excerpt || p.body.slice(0, 300) + (p.body.length > 300 ? '…' : ''),
                                        }}
                                    />
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
                {posts.links && posts.links.length > 1 && (
                    <div className="flex justify-center gap-2 flex-wrap pt-4">
                        {posts.links.map((link, i) =>
                            link.url ? (
                                <Link
                                    key={i}
                                    href={link.url}
                                    className={`min-w-[2.5rem] py-2 px-3 rounded-xl text-sm font-medium ${
                                        link.active
                                            ? 'bg-primary-600 text-white'
                                            : 'bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300'
                                    }`}
                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                    preserveState
                                />
                            ) : (
                                <span
                                    key={i}
                                    className="min-w-[2.5rem] py-2 px-3 rounded-xl text-sm font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-400 cursor-default"
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
