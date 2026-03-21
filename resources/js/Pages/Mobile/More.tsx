import MobileLayout from '@/Layouts/MobileLayout';
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
    MapPinIcon,
} from '@heroicons/react/24/outline';
import PrayingHandsIcon from '@/Components/PrayingHandsIcon';

interface Props {
    latestMusicas?: unknown[];
    latestPrayerRequests?: unknown[];
}

const items = [
    { name: 'Quem somos', description: 'História e significado do nome', route: 'mobile.quem-somos', icon: UserGroupIcon },
    { name: 'Nossas crenças', description: '28 princípios de fé (IASD)', route: 'mobile.beliefs', icon: BookOpenIcon },
    { name: 'Escala', description: 'Escala de voluntários', route: 'varios.schedule', icon: ClipboardDocumentListIcon },
    { name: 'Cultos e horários', description: 'Dias e horários dos cultos', route: 'mobile.services', icon: ClockIcon },
    { name: 'Classe Começos', description: 'Estudo bíblico presencial ou on-line', route: 'varios.classe-comecos', icon: AcademicCapIcon },
    { name: 'Música', description: 'Vídeos de música no YouTube', route: 'mobile.musica', icon: MusicalNoteIcon },
    {
        name: 'Pedidos de oração',
        description: 'Solicite ou veja pedidos de oração',
        route: 'mobile.prayer',
        icon: PrayingHandsIcon,
    },
    { name: 'Fotos', description: 'Galeria em breve', route: 'mobile.fotos', icon: PhotoIcon },
    { name: 'Localização', description: 'Endereço e mapa da igreja', route: 'mobile.location', icon: MapPinIcon },
    { name: 'Acervo', description: 'Playlists do YouTube da Nova Semente', route: 'acervo.index', icon: PlayCircleIcon },
    { name: 'Fale conosco', description: 'E-mail, redes e WhatsApp', route: 'mobile.contact', icon: PhoneIcon },
    { name: 'Notificações', description: 'Avisos de eventos e notícias', route: 'varios.notifications', icon: BellAlertIcon },
];

export default function MobileMore(_: Props) {
    return (
        <MobileLayout>
            <Head title="Mais" />
            <div className="space-y-4">
                <h1 className="text-xl font-bold text-zinc-900 dark:text-white">Mais</h1>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Acesso rápido a cultos, contato e notificações.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 lg:gap-4">
                    {items.map((item) => {
                        const { name, description, icon: Icon } = item;
                        const className = 'flex items-center gap-4 p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 active:bg-zinc-50 dark:active:bg-zinc-800 transition-colors';
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
                        return (
                            <Link key={name} href={route(item.route)} className={className}>
                                {content}
                            </Link>
                        );
                    })}
                </div>
            </div>
        </MobileLayout>
    );
}
