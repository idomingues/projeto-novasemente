import MobileLayout from '@/Layouts/MobileLayout';
import { Head, Link } from '@inertiajs/react';

export default function MobileQuemSomos() {
    return (
        <MobileLayout>
            <Head title="Quem somos" />
            <div className="space-y-5">
                <div>
                    <Link
                        href={route('mobile.more')}
                        className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:underline"
                    >
                        ← Mais
                    </Link>
                    <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-primary-600 dark:text-primary-400">
                        Sobre a NS
                    </p>
                    <h1 className="mt-1 text-xl font-bold text-zinc-900 dark:text-white">Quem somos</h1>
                    <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                        História e significado do nome da comunidade Nova Semente.
                    </p>
                </div>

                <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                    <h2 className="border-b border-zinc-200 pb-2 text-base font-bold uppercase tracking-wide text-zinc-900 dark:border-zinc-700 dark:text-white">
                        Nova Semente
                    </h2>
                    <div className="mt-4 space-y-4 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                        <p>
                            A Nova Semente nasceu como um projeto evangelístico da Igreja Adventista do Sétimo Dia com
                            o propósito de implantar uma igreja na região central de São Paulo que pudesse ser uma luz
                            e uma ponte para a sociedade contemporânea.
                        </p>
                        <p>
                            A Nova Semente é uma Igreja Adventista do Sétimo Dia com uma comunidade presencial vibrante
                            e com seguidores virtuais espalhados por todo o mundo.
                        </p>
                        <p>
                            Seja de perto ou de longe, você é convidado a fazer parte desta comunidade e participar
                            deste grande movimento, de espalhar a Semente do evangelho a todas as pessoas.
                        </p>
                    </div>
                </section>

                <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                    <h2 className="border-b border-zinc-200 pb-2 text-base font-bold uppercase tracking-wide text-zinc-900 dark:border-zinc-700 dark:text-white">
                        O nome
                    </h2>
                    <p className="mt-4 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                        A ideia parte da história de Zaqueu. Diz que ele teve que subir em um sicômoro pra ver Jesus. A
                        ideia da semente é que sejamos novos sicômoros, novos instrumentos, através dos quais as
                        pessoas poderão conhecer a Jesus.
                    </p>
                </section>
            </div>
        </MobileLayout>
    );
}
