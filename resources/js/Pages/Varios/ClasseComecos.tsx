import AdminLayout from '@/Layouts/AdminLayout';
import { Head } from '@inertiajs/react';
import { BuildingOffice2Icon, GlobeAltIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';

interface Props {
    presencialUrl: string;
    onlineUrl: string;
}

export default function VariosClasseComecos({ presencialUrl, onlineUrl }: Props) {
    const linkClasses = 'block group';
    const cardClasses =
        'relative overflow-hidden rounded-2xl p-5 sm:p-6 shadow-lg active:scale-[0.98] transition-all duration-200 hover:shadow-xl min-h-[120px] sm:min-h-[140px] flex flex-col justify-center';

    return (
        <AdminLayout>
            <Head title="Classe Começos" />
            <div className="max-w-2xl mx-auto space-y-6 sm:space-y-8">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white">
                        Classe Começos
                    </h1>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1 sm:mt-2">
                        Conheça a Bíblia de maneira profunda. Escolha como deseja participar:
                    </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    <a href={presencialUrl} target="_blank" rel="noopener noreferrer" className={linkClasses}>
                        <div
                            className={`${cardClasses} bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-zinc-900/10`}
                        >
                            <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-4 min-w-0">
                                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-white/10 dark:bg-zinc-900/10 flex items-center justify-center flex-shrink-0">
                                        <BuildingOffice2Icon className="w-6 h-6 sm:w-8 sm:h-8" />
                                    </div>
                                    <div className="min-w-0">
                                        <h2 className="text-base sm:text-lg font-bold">Presencial</h2>
                                        <p className="text-sm text-zinc-300 dark:text-zinc-600 mt-0.5">
                                            Participe na igreja
                                        </p>
                                    </div>
                                </div>
                                <ArrowTopRightOnSquareIcon className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0 opacity-80 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                            </div>
                        </div>
                    </a>

                    <a href={onlineUrl} target="_blank" rel="noopener noreferrer" className={linkClasses}>
                        <div
                            className={`${cardClasses} bg-zinc-800 dark:bg-zinc-800 text-white shadow-zinc-900/10 border border-zinc-700 dark:border-zinc-700`}
                        >
                            <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-4 min-w-0">
                                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                                        <GlobeAltIcon className="w-6 h-6 sm:w-8 sm:h-8" />
                                    </div>
                                    <div className="min-w-0">
                                        <h2 className="text-base sm:text-lg font-bold">On-line</h2>
                                        <p className="text-sm text-zinc-300 mt-0.5">De qualquer lugar</p>
                                    </div>
                                </div>
                                <ArrowTopRightOnSquareIcon className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0 opacity-80 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                            </div>
                        </div>
                    </a>
                </div>

                <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 text-center">
                    &quot;E, assim, a fé vem pelo ouvir, e o ouvir, pela palavra de Cristo&quot; — Rm 10:17
                </p>
            </div>
        </AdminLayout>
    );
}
