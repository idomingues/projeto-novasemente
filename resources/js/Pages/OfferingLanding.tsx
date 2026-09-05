import CampaignSevenMeContribute from '@/Components/Donations/CampaignSevenMeContribute';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, usePage } from '@inertiajs/react';

interface Props {
    churchName: string;
    churchLogoUrl: string | null;
    titheUrl: string;
    offeringUrl: string;
}

export default function OfferingLanding({ churchName, churchLogoUrl, titheUrl, offeringUrl }: Props) {
    const { defaultBrandLogoUrl } = usePage().props as { defaultBrandLogoUrl?: string };
    const logoSrc = churchLogoUrl || defaultBrandLogoUrl || '/logo-ns.png';

    return (
        <GuestLayout>
            <Head title="Oferta" />
            <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-4 py-10 md:max-w-2xl">
                <header className="text-center">
                    <img
                        src={logoSrc}
                        alt=""
                        className="mx-auto h-14 w-14 rounded-full object-cover object-center dark:invert"
                    />
                    <p className="mt-4 text-sm font-medium text-zinc-500 dark:text-zinc-400">{churchName}</p>
                    <h1 className="mt-1 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-white sm:text-4xl">
                        Como deseja contribuir?
                    </h1>
                </header>

                <div className="mt-8 grid gap-3 md:grid-cols-2">
                    <CampaignSevenMeContribute
                        href={titheUrl}
                        title="Dízimo"
                        subtitle="Doar pelo 7me"
                        tone="brand"
                    />
                    <CampaignSevenMeContribute
                        href={offeringUrl}
                        title="Oferta e Pacto"
                        subtitle="Doar pelo 7me"
                        tone="emerald"
                    />
                </div>
            </div>
        </GuestLayout>
    );
}
