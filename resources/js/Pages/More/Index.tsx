import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link } from '@inertiajs/react';
import {
    ClockIcon,
    PhoneIcon,
    BellAlertIcon,
    ClipboardDocumentListIcon,
    PlayCircleIcon,
    AcademicCapIcon,
} from '@heroicons/react/24/outline';

const items = [
    { name: 'Escala', description: 'Escala de voluntários', route: 'varios.schedule', icon: ClipboardDocumentListIcon },
    { name: 'Cultos e horários', description: 'Dias e horários dos cultos', route: 'varios.services', icon: ClockIcon },
    { name: 'Classe Começos', description: 'Estudo bíblico presencial ou on-line', route: 'varios.classe-comecos', icon: AcademicCapIcon },
    { name: 'Acervo', description: 'Playlists do YouTube da Nova Semente', route: 'acervo.index', icon: PlayCircleIcon },
    { name: 'Fale conosco', description: 'E-mail e WhatsApp da igreja', route: 'varios.contact', icon: PhoneIcon },
    { name: 'Notificações', description: 'Avisos de eventos e notícias', route: 'varios.notifications', icon: BellAlertIcon },
];

export default function MoreIndex() {
    return (
        <AdminLayout>
            <Head title="Vários" />
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Vários</h1>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                        Acesso rápido a cultos, contato e notificações.
                    </p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {items.map(({ name, description, route: routeName, icon: Icon }) => (
                        <Link
                            key={routeName}
                            href={route(routeName)}
                            className="flex items-center gap-4 p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                        >
                            <div className="w-12 h-12 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center flex-shrink-0">
                                <Icon className="w-6 h-6 text-zinc-600 dark:text-zinc-400" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <span className="font-semibold text-zinc-900 dark:text-white block">
                                    {name}
                                </span>
                                <span className="text-sm text-zinc-500 dark:text-zinc-400">
                                    {description}
                                </span>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </AdminLayout>
    );
}
