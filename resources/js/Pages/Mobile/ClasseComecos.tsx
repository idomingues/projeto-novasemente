import MobileLayout from '@/Layouts/MobileLayout';
import { Head } from '@inertiajs/react';
import { BuildingOffice2Icon, GlobeAltIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';

interface Props {
    presencialUrl: string;
    onlineUrl: string;
}

export default function MobileClasseComecos({ presencialUrl, onlineUrl }: Props) {
    return (
        <MobileLayout>
            <Head title="Classe Começos" />
            <div className="space-y-6">
                <div>
                    <h1 className="text-xl font-bold text-zinc-900 dark:text-white">Classe Começos</h1>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                        Conheça a Bíblia de maneira profunda. Escolha como deseja participar:
                    </p>
                </div>

                <div className="space-y-4">
                    <a
                        href={presencialUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block group"
                    >
                        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-800 dark:from-emerald-700 dark:to-emerald-900 p-6 shadow-lg shadow-emerald-900/20 active:scale-[0.98] transition-transform">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
                                        <BuildingOffice2Icon className="w-8 h-8 text-white" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold text-white">Presencial</h2>
                                        <p className="text-sm text-emerald-100 mt-0.5">
                                            Participe na igreja
                                        </p>
                                    </div>
                                </div>
                                <ArrowTopRightOnSquareIcon className="w-6 h-6 text-white/80 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                            </div>
                        </div>
                    </a>

                    <a
                        href={onlineUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block group"
                    >
                        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 dark:from-blue-700 dark:to-blue-900 p-6 shadow-lg shadow-blue-900/20 active:scale-[0.98] transition-transform">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
                                        <GlobeAltIcon className="w-8 h-8 text-white" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold text-white">On-line</h2>
                                        <p className="text-sm text-blue-100 mt-0.5">
                                            De qualquer lugar
                                        </p>
                                    </div>
                                </div>
                                <ArrowTopRightOnSquareIcon className="w-6 h-6 text-white/80 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                            </div>
                        </div>
                    </a>
                </div>

                <p className="text-xs text-zinc-500 dark:text-zinc-400 text-center">
                    &quot;E, assim, a fé vem pelo ouvir, e o ouvir, pela palavra de Cristo&quot; — Rm 10:17
                </p>
            </div>
        </MobileLayout>
    );
}
