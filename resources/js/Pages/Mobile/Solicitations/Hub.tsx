import MobileLayout from '@/Layouts/MobileLayout';
import { Head, Link } from '@inertiajs/react';
import {
    BookOpenIcon,
    ChevronRightIcon,
    ClipboardDocumentListIcon,
    EllipsisHorizontalCircleIcon,
    HandRaisedIcon,
    SparklesIcon,
    UserGroupIcon,
} from '@heroicons/react/24/outline';
import type { ComponentType, SVGProps } from 'react';

interface TypeItem {
    type: string;
    label: string;
}

interface Props {
    types: TypeItem[];
    mineUrl: string;
    createUrls: Record<string, string>;
}

type IconComponent = ComponentType<SVGProps<SVGSVGElement> & { className?: string }>;

function iconForSolicitationType(type: string): IconComponent {
    switch (type) {
        case 'baptism':
            return SparklesIcon;
        case 'baby_presentation':
            return HandRaisedIcon;
        case 'pastor_visit':
            return UserGroupIcon;
        case 'bible_study':
            return BookOpenIcon;
        case 'other':
        default:
            return EllipsisHorizontalCircleIcon;
    }
}

export default function Hub({ types, mineUrl, createUrls }: Props) {
    return (
        <MobileLayout>
            <Head title="Solicitações" />
            <div className="space-y-4">
                <h1 className="text-xl font-bold text-zinc-900 dark:text-white">Solicitações</h1>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Envie um pedido à igreja. Precisa de ter sessão iniciada. Pode acompanhar e conversar em «Os meus pedidos».
                </p>

                <Link
                    href={mineUrl}
                    className="flex items-center gap-4 p-4 rounded-2xl bg-brand-50 dark:bg-brand-950/40 border border-brand-200 dark:border-brand-800 hover:border-brand-300 dark:hover:border-brand-700 transition-colors"
                >
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-brand-100 dark:bg-brand-900/50">
                        <ClipboardDocumentListIcon className="w-6 h-6 text-brand-700 dark:text-brand-300" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <span className="font-semibold text-zinc-900 dark:text-white block">Os meus pedidos</span>
                        <span className="text-sm text-zinc-600 dark:text-zinc-400">Ver estado e conversar com a igreja</span>
                    </div>
                    <ChevronRightIcon className="w-5 h-5 text-zinc-400 shrink-0" />
                </Link>

                <div className="grid grid-cols-1 gap-2">
                    {types.map((t) => {
                        const TypeIcon = iconForSolicitationType(t.type);
                        return (
                            <Link
                                key={t.type}
                                href={createUrls[t.type]}
                                className="flex items-center gap-4 p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 active:bg-zinc-50 dark:active:bg-zinc-800 transition-colors"
                            >
                                <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-zinc-100 dark:bg-zinc-800">
                                    <TypeIcon className="w-6 h-6 text-zinc-600 dark:text-zinc-400" aria-hidden />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <span className="font-semibold text-zinc-900 dark:text-white block">{t.label}</span>
                                </div>
                                <ChevronRightIcon className="w-5 h-5 text-zinc-400 shrink-0" />
                            </Link>
                        );
                    })}
                </div>
            </div>
        </MobileLayout>
    );
}
