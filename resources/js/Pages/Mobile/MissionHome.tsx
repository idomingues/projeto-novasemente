import MissionHubBackLink from '@/Components/Mission/MissionHubBackLink';
import PrimaryButton from '@/Components/PrimaryButton';
import MobileLayout from '@/Layouts/MobileLayout';
import { Head, Link } from '@inertiajs/react';
import type { ReactNode } from 'react';
import {
    ArrowTopRightOnSquareIcon,
    CalendarDaysIcon,
    CheckCircleIcon,
    GlobeAsiaAustraliaIcon,
    HeartIcon,
    MapPinIcon,
    SparklesIcon,
    UserGroupIcon,
} from '@heroicons/react/24/outline';

function SectionCard({
    title,
    children,
    className = '',
}: {
    title: string;
    children: ReactNode;
    className?: string;
}) {
    return (
        <section
            className={`rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 ${className}`}
        >
            <h2 className="border-b border-zinc-200 pb-2 text-base font-bold uppercase tracking-wide text-zinc-900 dark:border-zinc-700 dark:text-white">
                {title}
            </h2>
            <div className="mt-4">{children}</div>
        </section>
    );
}

function BulletList({ items }: { items: string[] }) {
    return (
        <ul className="space-y-2.5">
            {items.map((item) => (
                <li key={item} className="flex gap-2.5 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                    <CheckCircleIcon className="mt-0.5 h-5 w-5 shrink-0 text-teal-600 dark:text-teal-400" aria-hidden />
                    <span>{item}</span>
                </li>
            ))}
        </ul>
    );
}

function InfoTile({ icon: Icon, label, value }: { icon: typeof MapPinIcon; label: string; value: string }) {
    return (
        <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/80 p-3.5 dark:border-zinc-700 dark:bg-zinc-800/50">
            <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-700 dark:bg-primary-950/50 dark:text-primary-300">
                    <Icon className="h-5 w-5" aria-hidden />
                </div>
                <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{label}</p>
                    <p className="mt-0.5 text-sm font-medium leading-snug text-zinc-900 dark:text-white">{value}</p>
                </div>
            </div>
        </div>
    );
}

const purposeItems = [
    { emoji: '💙', label: 'Esperança' },
    { emoji: '🩺', label: 'Cuidado' },
    { emoji: '🌱', label: 'Dignidade' },
    { emoji: '✝', label: 'Amor de Cristo' },
];

export default function MissionHome() {
    return (
        <MobileLayout>
            <Head title="Missão Tailândia & Mianmar" />
            <div className="space-y-6">
                <MissionHubBackLink />

                <header className="overflow-hidden rounded-2xl border border-teal-200/80 bg-gradient-to-br from-teal-50 via-white to-emerald-50/90 p-6 shadow-sm dark:border-teal-900/50 dark:from-teal-950/50 dark:via-zinc-900 dark:to-emerald-950/30">
                    <div className="flex items-center gap-2 text-sm font-semibold text-teal-800 dark:text-teal-200">
                        <GlobeAsiaAustraliaIcon className="h-5 w-5" aria-hidden />
                        Missão Transcultural
                    </div>
                    <h1 className="mt-3 text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
                        Tailândia & Mianmar
                    </h1>
                    <p className="mt-3 text-sm italic leading-relaxed text-zinc-600 dark:text-zinc-300">
                        &quot;Be the change you want to see in the world.&quot;
                    </p>
                </header>

                <SectionCard title="Sobre a Missão">
                    <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                        A Missão Transcultural Tailândia & Mianmar é uma ação missionária voltada ao atendimento de
                        comunidades em situação de extrema vulnerabilidade, especialmente populações refugiadas.
                    </p>
                    <p className="mt-3 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                        Ao longo da missão, atuaremos na frente médica, odontológica e assistencial, impactando direta
                        e indiretamente mais de 30 mil pessoas, promovendo impacto real por meio de ações práticas e
                        amor ao próximo.
                    </p>
                </SectionCard>

                <SectionCard title="Informações Gerais">
                    <div className="grid gap-3 sm:grid-cols-2">
                        <InfoTile icon={MapPinIcon} label="Destino" value="Tailândia e Mianmar" />
                        <InfoTile icon={CalendarDaysIcon} label="Período" value="14/10/2026 a 24/10/2026" />
                        <InfoTile
                            icon={HeartIcon}
                            label="Público-alvo"
                            value="Comunidades vulneráveis e refugiados"
                        />
                        <InfoTile
                            icon={UserGroupIcon}
                            label="Participantes"
                            value="Todos que tenham coração ensinável e queiram servir"
                        />
                    </div>
                </SectionCard>

                <SectionCard title="Objetivo da Missão">
                    <BulletList
                        items={[
                            'Realizar atendimento assistencial, médico e odontológico',
                            'Promover ações de assistência social',
                            'Contribuir com a reforma da base missionária local',
                            'Apoiar comunidades com acesso limitado a serviços básicos',
                        ]}
                    />
                </SectionCard>

                <SectionCard
                    title="Propósito"
                    className="border-teal-200/80 bg-gradient-to-br from-teal-50/80 via-white to-emerald-50/60 dark:border-teal-900/40 dark:from-teal-950/30 dark:via-zinc-900 dark:to-emerald-950/20"
                >
                    <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Levar:</p>
                    <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                        {purposeItems.map(({ emoji, label }) => (
                            <div
                                key={label}
                                className="flex flex-col items-center rounded-xl border border-teal-200/70 bg-white/80 px-3 py-4 text-center dark:border-teal-800/50 dark:bg-zinc-900/60"
                            >
                                <span className="text-2xl" aria-hidden>
                                    {emoji}
                                </span>
                                <span className="mt-2 text-xs font-semibold text-zinc-800 dark:text-zinc-200">{label}</span>
                            </div>
                        ))}
                    </div>
                    <p className="mt-4 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                        A populações que enfrentam realidades de extrema vulnerabilidade.
                    </p>
                </SectionCard>

                <SectionCard title="O que é uma Missão Transcultural?">
                    <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                        É uma experiência que envolve servir pessoas de outra cultura, respeitando costumes locais e
                        promovendo ajuda humanitária com sensibilidade, empatia e propósito.
                    </p>
                    <p className="mt-3 text-sm font-medium leading-relaxed text-zinc-800 dark:text-zinc-200">
                        Mais do que ajudar, é ser transformado por aquele que nos envia: Cristo.
                    </p>
                </SectionCard>

                <SectionCard title="Primeira vez em missão?">
                    <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                        Não se preocupe — você será orientado(a) em todas as etapas! Abaixo estão as principais
                        informações para sua preparação:
                    </p>
                </SectionCard>

                <SectionCard title="Documentação Necessária">
                    <BulletList
                        items={[
                            'Passaporte válido (mínimo de 6 meses de validade)',
                            'Visto: brasileiros não precisam de visto para turismo na Tailândia',
                            'Comprovantes de viagem e hospedagem',
                        ]}
                    />
                </SectionCard>

                <SectionCard title="Vacinação Obrigatória">
                    <BulletList
                        items={[
                            'Febre Amarela (obrigatória) — certificado internacional com data, lote e local de aplicação',
                            'COVID-19 (recomendado)',
                        ]}
                    />
                    <a
                        href="https://meususdigital.saude.gov.br/detalhe-doc-vacina?tipo=carteira"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-4 inline-flex cursor-pointer items-center gap-1.5 text-sm font-semibold text-primary-600 hover:underline dark:text-primary-400"
                    >
                        Emitir certificado vacinal no Meu SUS Digital
                        <ArrowTopRightOnSquareIcon className="h-4 w-4" aria-hidden />
                    </a>
                </SectionCard>

                <SectionCard title="Atenção à Saúde">
                    <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                        Antes da viagem, é essencial avaliar:
                    </p>
                    <BulletList
                        items={[
                            'Você possui alguma condição de saúde?',
                            'Faz uso contínuo de medicação?',
                            'O medicamento é de uso controlado?',
                        ]}
                    />
                    <p className="mt-4 rounded-xl border border-amber-200/80 bg-amber-50/80 px-3.5 py-3 text-sm leading-relaxed text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
                        Alguns medicamentos exigem receita médica e documentação específica para transporte
                        internacional.
                    </p>
                    <a
                        href="https://www.gov.br/mre/pt-br/embaixada-helsinque/servicos-consulares/viagens-ao-brasil/viagem-com-medicamentos"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 inline-flex cursor-pointer items-center gap-1.5 text-sm font-semibold text-primary-600 hover:underline dark:text-primary-400"
                    >
                        Saiba mais sobre viagem com medicamentos
                        <ArrowTopRightOnSquareIcon className="h-4 w-4" aria-hidden />
                    </a>
                </SectionCard>

                <SectionCard title="Preparativos Essenciais">
                    <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Itens importantes:</p>
                    <BulletList
                        items={[
                            'Adaptadores de tomada',
                            'Cartões internacionais habilitados',
                            'Chip ou plano de internet internacional',
                            'Documentos impressos e digitais',
                        ]}
                    />
                    <p className="mt-4 text-sm font-medium text-zinc-800 dark:text-zinc-200">Roupas e clima:</p>
                    <BulletList
                        items={[
                            'Estaremos em período chuvoso',
                            'Leve roupas leves, confortáveis e adequadas ao clima',
                            'Inclua capa de chuva e calçados apropriados',
                            'No grupo do WhatsApp, enviaremos detalhes de tudo que é necessário. Aqui você encontra informações gerais.',
                        ]}
                    />
                </SectionCard>

                <SectionCard title="Por que participar?">
                    <BulletList
                        items={[
                            'Transformar vidas por meio do cuidado',
                            'Crescimento pessoal e espiritual',
                            'Viver na prática Mateus 28',
                            'Fazer parte da resposta e solução — num mundo tão cheio de caos, temos que ser participantes da ordem',
                        ]}
                    />
                </SectionCard>

                <section className="rounded-2xl border border-teal-200/80 bg-gradient-to-br from-teal-600 to-emerald-600 p-6 text-center shadow-lg shadow-teal-600/20 dark:border-teal-800 dark:from-teal-700 dark:to-emerald-700 dark:shadow-teal-950/40">
                    <SparklesIcon className="mx-auto h-8 w-8 text-white/90" aria-hidden />
                    <h2 className="mt-3 text-lg font-bold text-white">Pronto para viver essa missão?</h2>
                    <p className="mt-2 text-sm text-teal-50">Junte-se a nós e faça a diferença!</p>
                    <Link href={route('mobile.mission.form')} className="mt-5 inline-block">
                        <PrimaryButton type="button" className="!bg-white !text-teal-800 hover:!bg-teal-50 dark:!bg-white dark:!text-teal-900">
                            Quero participar
                        </PrimaryButton>
                    </Link>
                </section>
            </div>
        </MobileLayout>
    );
}
