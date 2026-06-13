import MissionTripSignupForm, { type MissionTripSignupConfig } from '@/Components/Mission/MissionTripSignupForm';
import MissionTripSignupSuccessModal from '@/Components/Mission/MissionTripSignupSuccessModal';
import MobileLayout from '@/Layouts/MobileLayout';
import { Head, Link, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import {
    CalendarDaysIcon,
    GlobeAsiaAustraliaIcon,
    HeartIcon,
    MapPinIcon,
    UserGroupIcon,
} from '@heroicons/react/24/outline';

interface Props extends MissionTripSignupConfig {
    missionHomeUrl: string;
    missionCadastroUrl: string;
}

const highlights = [
    { icon: MapPinIcon, label: 'Destinos', value: 'Tailândia e Mianmar' },
    { icon: CalendarDaysIcon, label: 'Período', value: '14 a 24 de outubro de 2026' },
    { icon: UserGroupIcon, label: 'Público-alvo', value: '30 mil refugiados' },
];

export default function MissionTripSignup({ storeUrl, professions, missionHomeUrl, missionCadastroUrl }: Props) {
    const flash = (usePage().props as { flash?: { trip_signup_success?: boolean; trip_signup_name?: string | null } })
        .flash;
    const [successOpen, setSuccessOpen] = useState(false);

    useEffect(() => {
        if (flash?.trip_signup_success) {
            setSuccessOpen(true);
        }
    }, [flash?.trip_signup_success]);

    return (
        <MobileLayout>
            <Head title="Inscrição — Missão Tailândia & Mianmar" />
            <div className="mx-auto w-full max-w-2xl space-y-6 lg:max-w-3xl">
                <div>
                    <Link
                        href={missionHomeUrl}
                        className="cursor-pointer text-sm font-medium text-primary-600 hover:underline dark:text-primary-400"
                    >
                        ← Missão Tailândia & Mianmar
                    </Link>
                    <h1 className="mt-3 text-2xl font-bold tracking-tight text-zinc-900 dark:text-white lg:text-3xl">
                        Inscrição — Missão Tailândia & Mianmar
                    </h1>
                    <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                        Missão transcultural Nova Semente 2026 — assistência médica, odontológica e social, além da
                        reforma da base missionária.
                    </p>
                </div>

                <section className="rounded-2xl border border-teal-500/20 bg-gradient-to-br from-slate-900 via-teal-950 to-amber-950 p-5 shadow-lg sm:p-6">
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-amber-100">
                        <GlobeAsiaAustraliaIcon className="h-4 w-4 text-amber-300" aria-hidden />
                        Missão SENT
                    </div>
                    <p className="mt-4 text-sm leading-relaxed text-teal-100/90">
                        Levar esperança, cuidado, dignidade e o amor de Cristo a comunidades em situação de extrema
                        vulnerabilidade.
                    </p>
                    <div className="mt-5 grid gap-3 sm:grid-cols-3">
                        {highlights.map(({ icon: Icon, label, value }) => (
                            <div
                                key={label}
                                className="rounded-xl border border-white/10 bg-white/5 px-3 py-3 backdrop-blur-sm"
                            >
                                <div className="flex items-center gap-2 text-amber-200">
                                    <Icon className="h-4 w-4 shrink-0" aria-hidden />
                                    <span className="text-[0.65rem] font-semibold uppercase tracking-wide text-teal-200/80">
                                        {label}
                                    </span>
                                </div>
                                <p className="mt-1 text-sm font-semibold text-white">{value}</p>
                            </div>
                        ))}
                    </div>
                    <p className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-amber-100/90">
                        <HeartIcon className="h-4 w-4 text-amber-300" aria-hidden />
                        Vá ou envie. Be SENT.
                    </p>
                </section>

                <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-6">
                    <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Formulário de inscrição</h2>
                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                        Preencha seus dados para manifestar interesse em participar da missão.
                    </p>
                    <div className="mt-5">
                        <MissionTripSignupForm config={{ storeUrl, professions }} />
                    </div>
                </section>
            </div>

            <MissionTripSignupSuccessModal
                show={successOpen}
                onClose={() => setSuccessOpen(false)}
                missionHomeUrl={missionHomeUrl}
                missionCadastroUrl={missionCadastroUrl}
                participantName={flash?.trip_signup_name ?? ''}
            />
        </MobileLayout>
    );
}
