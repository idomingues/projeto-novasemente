import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link } from '@inertiajs/react';
import {
    ClockIcon,
    PhoneIcon,
    BellAlertIcon,
    ClipboardDocumentListIcon,
    PlayCircleIcon,
    AcademicCapIcon,
    MusicalNoteIcon,
    PhotoIcon,
    HeartIcon,
    ChevronRightIcon,
} from '@heroicons/react/24/outline';

interface LatestMusica {
    id: number;
    title: string;
    youtube_url: string;
    youtube_thumb_url: string | null;
}

interface LatestPrayerRequest {
    id: number;
    name_or_nickname: string;
    request: string;
    created_at: string;
}

interface Props {
    latestMusicas?: LatestMusica[];
    latestPrayerRequests?: LatestPrayerRequest[];
}

const FOTOS_DRIVE_URL = 'https://drive.google.com/drive/folders/1dYN1Qg2JCfDU1gL5JC3Je0eVvNm8J1dp?usp=share_link';

const items = [
    { name: 'Escala', description: 'Escala de voluntários', route: 'varios.schedule', icon: ClipboardDocumentListIcon },
    { name: 'Cultos e horários', description: 'Dias e horários dos cultos', route: 'varios.services', icon: ClockIcon },
    { name: 'Classe Começos', description: 'Estudo bíblico presencial ou on-line', route: 'varios.classe-comecos', icon: AcademicCapIcon },
    { name: 'Música', description: 'Vídeos de música no YouTube', route: 'musica.index', icon: MusicalNoteIcon },
    { name: 'Pedidos de oração', description: 'Solicite ou veja pedidos de oração', route: 'prayer.index', icon: HeartIcon },
    { name: 'Fotos', description: 'Álbum de fotos no Google Drive', externalUrl: FOTOS_DRIVE_URL, icon: PhotoIcon },
    { name: 'Acervo', description: 'Playlists do YouTube da Nova Semente', route: 'acervo.index', icon: PlayCircleIcon },
    { name: 'Fale conosco', description: 'E-mail e WhatsApp da igreja', route: 'varios.contact', icon: PhoneIcon },
    { name: 'Notificações', description: 'Avisos de eventos e notícias', route: 'varios.notifications', icon: BellAlertIcon },
];

export default function MoreIndex({ latestMusicas = [], latestPrayerRequests = [] }: Props) {
    const hasLatest = latestMusicas.length > 0 || latestPrayerRequests.length > 0;

    return (
        <AdminLayout>
            <Head title="Mais" />
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Mais</h1>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                        Acesso rápido a cultos, contato, oração e notificações.
                    </p>
                </div>

                {hasLatest && (
                    <section>
                        <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-3">
                            Últimos itens
                        </h2>
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {latestMusicas.length > 0 && (
                                <Link
                                    href={route('musica.index')}
                                    className="flex items-center gap-3 p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                                >
                                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-100 dark:bg-primary-900/30">
                                        <MusicalNoteIcon className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="font-semibold text-zinc-900 dark:text-white truncate">Música</p>
                                        <p className="text-sm text-zinc-500 dark:text-zinc-400 truncate">
                                            {latestMusicas[0].title}
                                            {latestMusicas.length > 1 && ` e mais ${latestMusicas.length - 1}`}
                                        </p>
                                    </div>
                                    <ChevronRightIcon className="w-5 h-5 text-zinc-400 flex-shrink-0" />
                                </Link>
                            )}
                            {latestPrayerRequests.length > 0 && (
                                <Link
                                    href={route('prayer.index')}
                                    className="flex items-center gap-3 p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                                >
                                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-100 dark:bg-primary-900/30">
                                        <HeartIcon className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="font-semibold text-zinc-900 dark:text-white truncate">Pedidos de oração</p>
                                        <p className="text-sm text-zinc-500 dark:text-zinc-400 truncate">
                                            {latestPrayerRequests[0].name_or_nickname}: {latestPrayerRequests[0].request}
                                            {latestPrayerRequests.length > 1 && ` (+${latestPrayerRequests.length - 1})`}
                                        </p>
                                    </div>
                                    <ChevronRightIcon className="w-5 h-5 text-zinc-400 flex-shrink-0" />
                                </Link>
                            )}
                        </div>
                    </section>
                )}

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {items.map((item) => {
                        const { name, description, icon: Icon } = item;
                        const className = 'flex items-center gap-4 p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors';
                        const content = (
                            <>
                                <div className="w-12 h-12 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center flex-shrink-0">
                                    <Icon className="w-6 h-6 text-zinc-600 dark:text-zinc-400" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <span className="font-semibold text-zinc-900 dark:text-white block">{name}</span>
                                    <span className="text-sm text-zinc-500 dark:text-zinc-400">{description}</span>
                                </div>
                            </>
                        );
                        if ('externalUrl' in item && item.externalUrl) {
                            return (
                                <a
                                    key={name}
                                    href={item.externalUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={className}
                                >
                                    {content}
                                </a>
                            );
                        }
                        return (
                            <Link key={name} href={route((item as { route: string }).route)} className={className}>
                                {content}
                            </Link>
                        );
                    })}
                </div>
            </div>
        </AdminLayout>
    );
}
