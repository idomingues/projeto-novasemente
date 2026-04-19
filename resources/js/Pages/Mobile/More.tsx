import MobileLayout from '@/Layouts/MobileLayout';
import { Head, Link, usePage } from '@inertiajs/react';
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
    ChatBubbleLeftRightIcon,
    CubeIcon,
    InboxIcon,
    UserPlusIcon,
    FilmIcon,
    HandRaisedIcon,
} from '@heroicons/react/24/outline';
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

const baseItems: MoreMenuItem[] = [
    { name: 'Quem somos', description: 'História e significado do nome', route: 'mobile.quem-somos', icon: UserGroupIcon },
    { name: 'Nossas crenças', description: '28 princípios de fé (IASD)', route: 'mobile.beliefs', icon: BookOpenIcon },
    { name: 'Nossos pastores', description: 'Conheça a equipe pastoral', route: 'mobile.pastors', icon: UserCircleIcon },
    {
        name: 'Agendar com pastor',
        description: 'Os meus pedidos e novo agendamento',
        route: 'mobile.pastoral-appointments.request',
        icon: ClockIcon,
    },
    { name: 'Escala', description: 'Escala de voluntários', route: 'varios.schedule', icon: ClipboardDocumentListIcon },
    { name: 'Cultos e horários', description: 'Dias e horários dos cultos', route: 'mobile.services', icon: ClockIcon },
    { name: 'Culto', description: 'Vídeos do culto online', route: 'mobile.culto', icon: FilmIcon },
    { name: 'Dízimos e Ofertas', description: 'Contribuições e ofertas', route: 'mobile.offerings', icon: HandRaisedIcon },
    { name: 'Classe Começos', description: 'Estudo bíblico presencial ou on-line', route: 'varios.classe-comecos', icon: AcademicCapIcon },
    { name: 'Música', description: 'Vídeos de música no YouTube', route: 'mobile.musica', icon: MusicalNoteIcon },
    {
        name: 'Fotos',
        description: 'Álbum de fotos (Google Drive)',
        externalHref: PHOTOS_DRIVE_FOLDER_URL,
        icon: PhotoIcon,
    },
    { name: 'Localização', description: 'Endereço e mapa da igreja', route: 'mobile.location', icon: MapPinIcon },
    { name: 'Acervo', description: 'Playlists do YouTube da Nova Semente', route: 'mobile.acervo', icon: PlayCircleIcon },
    {
        name: 'Falar com líder',
        description: 'Conversa com líder de ministério (membro logado)',
        route: 'mobile.contact',
        icon: PhoneIcon,
    },
    { name: 'Notificações', description: 'Avisos de eventos e notícias', route: 'varios.notifications', icon: BellAlertIcon },
    { name: 'Suporte do app', description: 'Problema ou sugestão sobre a aplicação', route: 'mobile.support.index', icon: ChatBubbleLeftRightIcon },
    {
        name: 'Solicitações',
        description: 'Batismo, apresentação, visita pastoral',
        route: 'mobile.solicitations.hub',
        icon: InboxIcon,
    },
];

export default function MobileMore(_: Props) {
    const page = usePage();
    const permissions = (page.props as { auth?: { permissions?: string[] } }).auth?.permissions ?? [];
    const canInventory =
        permissions.includes('inventory.view') || permissions.includes('inventory.manage');

    const items: MoreMenuItem[] = canInventory
        ? [
              ...baseItems.slice(0, 3),
              {
                  name: 'Inventário',
                  description: 'Consultar itens e ler código de barras',
                  route: 'mobile.inventory',
                  icon: CubeIcon,
              },
              ...baseItems.slice(3),
          ]
        : baseItems;

    return (
        <MobileLayout>
            <Head title="Mais" />
            <div className="space-y-4">
                <h1 className="text-xl font-bold text-zinc-900 dark:text-white">Mais</h1>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Acesso rápido a cultos, contato e notificações.
                </p>

                <Link
                    href={route('volunteers.public-signup.page')}
                    className="block rounded-2xl border border-zinc-300 dark:border-zinc-600 bg-zinc-50 dark:bg-zinc-900/70 p-4 shadow-sm hover:bg-white dark:hover:bg-zinc-900 hover:border-zinc-400 dark:hover:border-zinc-500 transition-colors"
                >
                    <div className="flex items-start gap-3">
                        <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 bg-zinc-900 dark:bg-white">
                            <UserPlusIcon className="w-5 h-5 text-white dark:text-zinc-900" aria-hidden />
                        </div>
                        <div className="min-w-0 flex-1">
                            <h2 className="text-base font-bold text-zinc-900 dark:text-white leading-tight">
                                Cadastro de voluntário
                            </h2>
                            <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
                                Quero servir em ministérios (formulário completo)
                            </p>
                        </div>
                    </div>
                </Link>

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
        </MobileLayout>
    );
}
