import MobileLayout from '@/Layouts/MobileLayout';
import { Head } from '@inertiajs/react';

interface Props {
    title?: string;
    embedUrl: string;
    folderUrl: string;
}

export default function MobilePhotos({ title = 'Fotos', embedUrl, folderUrl }: Props) {
    return (
        <MobileLayout>
            <Head title={title} />

            <div className="space-y-3">
                <div className="flex items-end justify-between gap-3">
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
                        {title}
                    </h1>

                    <a
                        href={folderUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-semibold text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white underline underline-offset-4"
                    >
                        Abrir no Drive
                    </a>
                </div>

                <div className="rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                    <iframe
                        title="Álbum de fotos (Google Drive)"
                        src={embedUrl}
                        className="w-full h-[70dvh] min-h-[520px] bg-white"
                        referrerPolicy="no-referrer"
                        loading="lazy"
                        allowFullScreen
                    />
                </div>

                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Se não aparecer nada aqui, confirme se a pasta do Drive está como &quot;Qualquer pessoa com o link pode
                    ver&quot;.
                </p>
            </div>
        </MobileLayout>
    );
}

