import MobileLayout from '@/Layouts/MobileLayout';
import SobreOAppModal from '@/Components/Mobile/SobreOAppModal';
import SobreOAppPanel from '@/Components/Mobile/SobreOAppPanel';
import { useMinWidthMd } from '@/hooks/useMinWidthMd';
import { Head, Link, router } from '@inertiajs/react';

interface Props {
    backRoute: string;
    backLabel: string;
}

export default function MobileSobreOApp({ backRoute, backLabel }: Props) {
    const isDesktop = useMinWidthMd();

    const goBack = () => {
        router.visit(route(backRoute));
    };

    if (isDesktop) {
        return (
            <MobileLayout>
                <Head title="Sobre o APP" />
                <SobreOAppModal show onClose={goBack} />
            </MobileLayout>
        );
    }

    return (
        <MobileLayout>
            <Head title="Sobre o APP" />
            <div className="space-y-5">
                <div>
                    <Link
                        href={route(backRoute)}
                        className="text-sm font-medium text-primary-600 hover:underline dark:text-primary-400"
                    >
                        ← {backLabel}
                    </Link>
                    <h1 className="mt-2 text-2xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-3xl">
                        Sobre o APP
                    </h1>
                    <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                        Versão, lojas e links oficiais da Nova Semente.
                    </p>
                </div>

                <SobreOAppPanel />
            </div>
        </MobileLayout>
    );
}
