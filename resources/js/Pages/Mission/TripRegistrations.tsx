import AdminLayout from '@/Layouts/AdminLayout';
import Card from '@/Components/Card';
import FlashMessages from '@/Components/FlashMessages';
import ListSearchHint from '@/Components/ListSearchHint';
import MissionAdminTabs from '@/Components/Mission/MissionAdminTabs';
import MissionSignupQrCode from '@/Components/Mission/MissionSignupQrCode';
import MissionTripRegistrationDetailModal, {
    type MissionTripRegistrationRow,
} from '@/Components/Mission/MissionTripRegistrationDetailModal';
import PageHeader from '@/Components/PageHeader';
import TextInput from '@/Components/TextInput';
import { useDebouncedServerSearch } from '@/hooks/useDebouncedServerSearch';
import { Head, router } from '@inertiajs/react';
import { ArrowDownTrayIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { useCallback, useState } from 'react';

interface Paginated<T> {
    data: T[];
    links: { url: string | null; label: string; active: boolean }[];
    total?: number;
}

interface Props {
    registrations: Paginated<MissionTripRegistrationRow>;
    filters: {
        search: string;
    };
    exportUrl: string;
    signupUrl: string;
}

export default function MissionTripRegistrations({ registrations, filters, exportUrl, signupUrl }: Props) {
    const [selected, setSelected] = useState<MissionTripRegistrationRow | null>(null);
    const closeDetail = useCallback(() => setSelected(null), []);

    const { value: searchValue, setValue: setSearchValue, isBelowMinimum } = useDebouncedServerSearch({
        serverValue: filters.search,
        onApply: useCallback((term: string | undefined) => {
            router.get(
                route('mission.trip-registrations.index'),
                term ? { search: term } : {},
                { preserveState: true, replace: true },
            );
        }, []),
    });

    return (
        <AdminLayout>
            <Head title="Missão — Tailândia & Mianmar" />
            <FlashMessages />
            <div className="space-y-6">
                <PageHeader
                    title="Missão"
                    subtitle="Inscrições do formulário Tailândia & Mianmar (out/2026). Cadastros do programa Missão ficam na aba «Cadastros»."
                />

                <MissionAdminTabs active="tailandia-mianmar" />

                <Card className="p-5 sm:p-6">
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                        <div className="min-w-0">
                            <h2 className="text-base font-semibold text-zinc-900 dark:text-white">QR code de inscrição</h2>
                            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                                Baixe o QR code para usar em artes, banners, redes sociais e materiais impressos. O PNG
                                é gerado em alta resolução (2048×2048 px).
                            </p>
                        </div>
                        <MissionSignupQrCode value={signupUrl} variant="admin" exportable />
                    </div>
                </Card>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="relative min-w-0 flex-1 sm:max-w-md">
                        <MagnifyingGlassIcon
                            className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400"
                            aria-hidden
                        />
                        <TextInput
                            type="search"
                            value={searchValue}
                            onChange={(e) => setSearchValue(e.target.value)}
                            placeholder="Nome, e-mail, telefone ou Instagram"
                            className="w-full pl-10"
                            aria-label="Buscar inscrições"
                        />
                        <ListSearchHint show={isBelowMinimum} className="mt-1" />
                    </div>

                    <a
                        href={exportUrl}
                        className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-zinc-600 dark:hover:bg-zinc-800"
                    >
                        <ArrowDownTrayIcon className="h-5 w-5" aria-hidden />
                        Exportar Excel
                    </a>
                </div>

                <Card className="overflow-x-auto">
                    {registrations.data.length === 0 ? (
                        <div className="space-y-2 p-6 text-sm text-zinc-500">
                            <p>Nenhuma inscrição encontrada.</p>
                            <p>
                                As inscrições do formulário Tailândia & Mianmar aparecem aqui — não na aba
                                «Cadastros» nem em «Usuários».
                            </p>
                            <a
                                href={signupUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex cursor-pointer font-semibold text-teal-700 hover:underline dark:text-teal-300"
                            >
                                Abrir página de inscrição
                            </a>
                        </div>
                    ) : (
                        <table className="min-w-full text-sm">
                            <thead>
                                <tr className="border-b border-zinc-200 text-left dark:border-zinc-700">
                                    <th className="p-3">Inscrito</th>
                                    <th className="p-3">Contato</th>
                                    <th className="p-3">Profissão</th>
                                    <th className="p-3">Passaporte</th>
                                    <th className="p-3">Inscrito em</th>
                                </tr>
                            </thead>
                            <tbody>
                                {registrations.data.map((row) => (
                                    <tr
                                        key={row.id}
                                        className="cursor-pointer border-b border-zinc-100 transition hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800/50"
                                        onClick={() => setSelected(row)}
                                    >
                                        <td className="p-3">
                                            <div className="font-medium text-zinc-900 dark:text-white">{row.fullName}</div>
                                            {row.instagram ? (
                                                <div className="text-xs text-zinc-500">{row.instagram}</div>
                                            ) : null}
                                        </td>
                                        <td className="p-3">
                                            <div>{row.email}</div>
                                            <div className="text-xs text-zinc-500">{row.phone}</div>
                                        </td>
                                        <td className="p-3">{row.professionLabel}</td>
                                        <td className="p-3">{row.hasPassportLabel}</td>
                                        <td className="p-3 text-zinc-600 dark:text-zinc-400">{row.createdAtLabel ?? '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </Card>

                {registrations.links.length > 3 ? (
                    <nav className="flex flex-wrap gap-1" aria-label="Paginação">
                        {registrations.links.map((link) => (
                            <button
                                key={`${link.label}-${link.url ?? 'null'}`}
                                type="button"
                                disabled={!link.url}
                                onClick={() => link.url && router.get(link.url, {}, { preserveState: true })}
                                className={[
                                    'cursor-pointer rounded-lg px-3 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-40',
                                    link.active
                                        ? 'bg-teal-600 font-semibold text-white'
                                        : 'border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200',
                                ].join(' ')}
                                dangerouslySetInnerHTML={{ __html: link.label }}
                            />
                        ))}
                    </nav>
                ) : null}
            </div>

            {selected ? (
                <MissionTripRegistrationDetailModal registration={selected} onClose={closeDetail} />
            ) : null}
        </AdminLayout>
    );
}
