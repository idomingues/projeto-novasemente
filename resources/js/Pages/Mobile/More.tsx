import MobileLayout from '@/Layouts/MobileLayout';
import { Head, Link } from '@inertiajs/react';
import {
    ClockIcon,
    PhoneIcon,
    BanknotesIcon,
    BellAlertIcon,
} from '@heroicons/react/24/outline';

const items = [
    { name: 'Cultos e horários', description: 'Dias e horários dos cultos', route: 'mobile.services', icon: ClockIcon },
    { name: 'Fale conosco', description: 'E-mail e WhatsApp da igreja', route: 'mobile.contact', icon: PhoneIcon },
    { name: 'Ofertas e doação', description: 'PIX e ofertas', route: 'mobile.offerings', icon: BanknotesIcon },
    { name: 'Notificações', description: 'Avisos de eventos e notícias', route: 'mobile.notifications', icon: BellAlertIcon },
];

export default function MobileMore() {
    return (
        <MobileLayout>
            <Head title="Mais" />
            <div className="space-y-4">
                <h1 className="text-xl font-bold text-zinc-900 dark:text-white">Mais</h1>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Acesso rápido a cultos, contato, ofertas e notificações.
                </p>
                <div className="space-y-2">
                    {items.map(({ name, description, route: routeName, icon: Icon }) => (
                        <Link
                            key={routeName}
                            href={route(routeName)}
                            className="flex items-center gap-4 p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 active:bg-zinc-50 dark:active:bg-zinc-800"
                        >
                            <div className="w-12 h-12 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0">
                                <Icon className="w-6 h-6 text-primary-600 dark:text-primary-400" />
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
        </MobileLayout>
    );
}
