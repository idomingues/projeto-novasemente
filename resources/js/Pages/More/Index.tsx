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
    BookOpenIcon,
    UserGroupIcon,
    UserCircleIcon,
    MapPinIcon,
    InboxIcon,
} from '@heroicons/react/24/outline';
import PrayingHandsIcon from '@/Components/PrayingHandsIcon';
import { PHOTOS_DRIVE_FOLDER_URL } from '@/constants/externalLinks';
import type { ComponentType, SVGProps } from 'react';

type MenuIcon = ComponentType<SVGProps<SVGSVGElement> & { className?: string }>;

type MoreMenuItem =
    | { name: string; description: string; route: string; icon: MenuIcon; externalHref?: never }
    | { name: string; description: string; externalHref: string; icon: MenuIcon; route?: never };

interface Props {
    latestMusicas?: unknown[];
    latestPrayerRequests?: unknown[];
}

const items: MoreMenuItem[] = [
    { name: 'Quem somos', description: 'História e significado do nome', route: 'mobile.quem-somos', icon: UserGroupIcon },
    { name: 'Nossas crenças', description: '28 princípios de fé (IASD)', route: 'mobile.beliefs', icon: BookOpenIcon },
    { name: 'Nossos pastores', description: 'Conheça a equipa pastoral', route: 'mobile.pastors', icon: UserCircleIcon },
    { name: 'Escala', description: 'Escala de voluntários', route: 'varios.schedule', icon: ClipboardDocumentListIcon },
    { name: 'Cultos e horários', description: 'Dias e horários dos cultos', route: 'mobile.services', icon: ClockIcon },
    { name: 'Classe Começos', description: 'Estudo bíblico presencial ou on-line', route: 'varios.classe-comecos', icon: AcademicCapIcon },
    { name: 'Música', description: 'Vídeos de música no YouTube', route: 'musica.index', icon: MusicalNoteIcon },
    {
        name: 'Pedidos de oração',
        description: 'Solicite ou veja pedidos de oração',
        route: 'prayer.index',
        icon: PrayingHandsIcon,
    },
    {
        name: 'Fotos',
        description: 'Álbum de fotos (Google Drive)',
        externalHref: PHOTOS_DRIVE_FOLDER_URL,
        icon: PhotoIcon,
    },
    { name: 'Localização', description: 'Endereço e mapa da igreja', route: 'mobile.location', icon: MapPinIcon },
    { name: 'Acervo', description: 'Playlists do YouTube da Nova Semente', route: 'mobile.acervo', icon: PlayCircleIcon },
    { name: 'Fale conosco', description: 'E-mail, redes e WhatsApp', route: 'mobile.contact', icon: PhoneIcon },
    { name: 'Notificações', description: 'Avisos de eventos e notícias', route: 'varios.notifications', icon: BellAlertIcon },
    {
        name: 'Solicitações',
        description: 'Batismo, apresentação, visita, estudo, outros',
        route: 'mobile.solicitations.hub',
        icon: InboxIcon,
    },
];

export default function MoreIndex(_: Props) {
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

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {items.map((item) => {
                        const { name, description, icon: Icon } = item;
                        const className = 'flex items-center gap-4 p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors';
                        const content = (
                            <>
                                <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-zinc-100 dark:bg-zinc-800">
                                    <Icon className="w-6 h-6 text-zinc-600 dark:text-zinc-400" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <span className="font-semibold text-zinc-900 dark:text-white block">{name}</span>
                                    <span className="text-sm text-zinc-500 dark:text-zinc-400">{description}</span>
                                </div>
                            </>
                        );
                        if ('externalHref' in item && item.externalHref) {
                            return (
                                <a
                                    key={name}
                                    href={item.externalHref}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={className}
                                >
                                    {content}
                                </a>
                            );
                        }
                        return (
                            <Link key={name} href={route(item.route!)} className={className}>
                                {content}
                            </Link>
                        );
                    })}
                </div>
            </div>
        </AdminLayout>
    );
}
