import MissionHubBackLink from '@/Components/Mission/MissionHubBackLink';
import MissionPageSection from '@/Components/Mission/MissionPageSection';
import MissionParticipateButton from '@/Components/Mission/MissionParticipateButton';
import MissionThailandHero from '@/Components/Mission/MissionThailandHero';
import MobileLayout from '@/Layouts/MobileLayout';
import { Head, Link } from '@inertiajs/react';
import type { ComponentType, ReactNode, SVGProps } from 'react';
import {
    ArrowTopRightOnSquareIcon,
    CalendarDaysIcon,
    CheckCircleIcon,
    HeartIcon,
    MapPinIcon,
    SparklesIcon,
    UserGroupIcon,
} from '@heroicons/react/24/outline';

type MenuIcon = ComponentType<SVGProps<SVGSVGElement> & { className?: string }>;

function InfoTile({ icon: Icon, label, value }: { icon: MenuIcon; label: string; value: string }) {
    return (
        <div className="rounded-xl border border-teal-200/60 bg-teal-50/40 p-3.5 dark:border-teal-800/40 dark:bg-teal-950/20">
            <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-600/10 text-teal-700 dark:bg-teal-400/10 dark:text-teal-300">
                    <Icon className="h-5 w-5" aria-hidden />
                </div>
                <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-teal-800/70 dark:text-teal-300/70">
                        {label}
                    </p>
                    <p className="mt-0.5 text-sm font-medium leading-snug text-zinc-900 dark:text-white">{value}</p>
                </div>
            </div>
        </div>
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

function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
    return (
        <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex cursor-pointer items-center gap-1.5 text-sm font-semibold text-teal-700 hover:underline dark:text-teal-300"
        >
            {children}
            <ArrowTopRightOnSquareIcon className="h-4 w-4" aria-hidden />
        </a>
    );
}

const purposeItems = [
    { emoji: '💙', label: 'Esperança' },
    { emoji: '🩺', label: 'Cuidado' },
    { emoji: '🌱', label: 'Dignidade' },
    { emoji: '✝', label: 'Amor de Cristo' },
];

const sectionNav = [
    { id: 'sobre', label: 'Sobre' },
    { id: 'objetivo', label: 'Objetivo' },
    { id: 'preparo', label: 'Preparo' },
    { id: 'participar', label: 'Participar' },
];

export default function MissionHome() {
    return (
        <MobileLayout>
            <Head title="Missão Tailândia & Mianmar" />
            <div className="mx-auto w-full max-w-3xl lg:max-w-6xl">
                <MissionHubBackLink />

                <div className="mt-4">
                    <MissionThailandHero variant="page" />
                </div>

                <nav
                    aria-label="Seções da página"
                    className="mt-4 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] lg:hidden [&::-webkit-scrollbar]:hidden"
                >
                    {sectionNav.map(({ id, label }) => (
                        <a
                            key={id}
                            href={`#${id}`}
                            className="shrink-0 cursor-pointer rounded-full border border-zinc-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-zinc-700 shadow-sm transition hover:border-teal-300 hover:text-teal-800 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-teal-600"
                        >
                            {label}
                        </a>
                    ))}
                </nav>

                <div className="mt-6 lg:mt-8 lg:grid lg:grid-cols-[minmax(0,1fr)_17rem] lg:items-start lg:gap-8 xl:grid-cols-[minmax(0,1fr)_18rem] xl:gap-10">
                    <div className="min-w-0 space-y-6 lg:space-y-7">
                        <MissionPageSection id="sobre" title="Sobre a Missão">
                            <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300 sm:text-[0.9375rem]">
                                A Missão Transcultural Tailândia & Mianmar é uma ação missionária voltada ao atendimento de
                                comunidades em situação de extrema vulnerabilidade, especialmente populações refugiadas.
                            </p>
                            <p className="mt-3 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300 sm:text-[0.9375rem]">
                                Ao longo da missão, atuaremos na frente médica, odontológica e assistencial, impactando
                                direta e indiretamente mais de 30 mil pessoas, promovendo impacto real por meio de ações
                                práticas e amor ao próximo.
                            </p>
                        </MissionPageSection>

                        <MissionPageSection title="Informações Gerais">
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
                                    value="Quem tiver coração ensinável e quiser servir"
                                />
                            </div>
                        </MissionPageSection>

                        <MissionPageSection id="objetivo" title="Objetivo da Missão">
                            <BulletList
                                items={[
                                    'Realizar atendimento assistencial, médico e odontológico',
                                    'Promover ações de assistência social',
                                    'Contribuir com a reforma da base missionária local',
                                    'Apoiar comunidades com acesso limitado a serviços básicos',
                                ]}
                            />
                        </MissionPageSection>

                        <MissionPageSection title="Propósito" accent="highlight">
                            <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Levar:</p>
                            <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                                {purposeItems.map(({ emoji, label }) => (
                                    <div
                                        key={label}
                                        className="flex flex-col items-center rounded-xl border border-amber-200/70 bg-white/90 px-3 py-4 text-center shadow-sm dark:border-amber-800/40 dark:bg-zinc-900/70"
                                    >
                                        <span className="text-2xl" aria-hidden>
                                            {emoji}
                                        </span>
                                        <span className="mt-2 text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                                            {label}
                                        </span>
                                    </div>
                                ))}
                            </div>
                            <p className="mt-4 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                                A populações que enfrentam realidades de extrema vulnerabilidade.
                            </p>
                        </MissionPageSection>

                        <MissionPageSection title="O que é uma Missão Transcultural?">
                            <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                                É uma experiência que envolve servir pessoas de outra cultura, respeitando costumes locais e
                                promovendo ajuda humanitária com sensibilidade, empatia e propósito.
                            </p>
                            <p className="mt-3 text-sm font-medium leading-relaxed text-zinc-800 dark:text-zinc-200">
                                Mais do que ajudar, é ser transformado por aquele que nos envia: Cristo.
                            </p>
                        </MissionPageSection>

                        <MissionPageSection id="preparo" title="Primeira vez em missão?">
                            <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                                Não se preocupe — você será orientado(a) em todas as etapas! Abaixo estão as principais
                                informações para sua preparação:
                            </p>
                        </MissionPageSection>

                        <MissionPageSection title="Documentação Necessária">
                            <BulletList
                                items={[
                                    'Passaporte válido (mínimo de 6 meses de validade)',
                                    'Visto: brasileiros não precisam de visto para turismo na Tailândia',
                                    'Comprovantes de viagem e hospedagem',
                                ]}
                            />
                        </MissionPageSection>

                        <MissionPageSection title="Vacinação Obrigatória">
                            <BulletList
                                items={[
                                    'Febre Amarela (obrigatória) — certificado internacional com data, lote e local de aplicação',
                                    'COVID-19 (recomendado)',
                                ]}
                            />
                            <div className="mt-4">
                                <ExternalLink href="https://meususdigital.saude.gov.br/detalhe-doc-vacina?tipo=carteira">
                                    Emitir certificado vacinal no Meu SUS Digital
                                </ExternalLink>
                            </div>
                        </MissionPageSection>

                        <MissionPageSection title="Atenção à Saúde">
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
                            <p className="mt-4 rounded-xl border border-amber-200/80 bg-amber-50/90 px-3.5 py-3 text-sm leading-relaxed text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
                                Alguns medicamentos exigem receita médica e documentação específica para transporte
                                internacional.
                            </p>
                            <div className="mt-3">
                                <ExternalLink href="https://www.gov.br/mre/pt-br/embaixada-helsinque/servicos-consulares/viagens-ao-brasil/viagem-com-medicamentos">
                                    Saiba mais sobre viagem com medicamentos
                                </ExternalLink>
                            </div>
                        </MissionPageSection>

                        <MissionPageSection title="Preparativos Essenciais">
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
                        </MissionPageSection>

                        <MissionPageSection title="Por que participar?">
                            <BulletList
                                items={[
                                    'Transformar vidas por meio do cuidado',
                                    'Crescimento pessoal e espiritual',
                                    'Viver na prática Mateus 28',
                                    'Fazer parte da resposta e solução — num mundo tão cheio de caos, temos que ser participantes da ordem',
                                ]}
                            />
                        </MissionPageSection>

                        <section
                            id="participar"
                            className="scroll-mt-28 rounded-2xl border border-teal-500/30 bg-gradient-to-br from-slate-900 via-teal-900 to-amber-900 p-6 text-center shadow-xl shadow-teal-950/25 dark:border-teal-600/30 lg:hidden"
                        >
                            <SparklesIcon className="mx-auto h-8 w-8 text-amber-300" aria-hidden />
                            <h2 className="mt-3 text-lg font-bold text-white">Pronto para viver essa missão?</h2>
                            <p className="mt-2 text-sm text-teal-100/90">Junte-se a nós e faça a diferença!</p>
                            <div className="mt-5">
                                <MissionParticipateButton
                                    variant="primary"
                                    className="!bg-amber-400 !text-amber-950 hover:!bg-amber-300 dark:!bg-amber-400 dark:!text-amber-950"
                                />
                            </div>
                        </section>
                    </div>

                    <aside className="hidden lg:block">
                        <div className="sticky top-28 space-y-4">
                            <nav
                                aria-label="Ir para seção"
                                className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
                            >
                                <p className="text-xs font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                                    Nesta página
                                </p>
                                <ul className="mt-3 space-y-1">
                                    {sectionNav.map(({ id, label }) => (
                                        <li key={id}>
                                            <a
                                                href={`#${id}`}
                                                className="block cursor-pointer rounded-lg px-2 py-1.5 text-sm font-medium text-zinc-700 transition hover:bg-teal-50 hover:text-teal-900 dark:text-zinc-300 dark:hover:bg-teal-950/40 dark:hover:text-teal-100"
                                            >
                                                {label}
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            </nav>

                            <div className="rounded-2xl border border-teal-500/25 bg-gradient-to-br from-slate-900 via-teal-900 to-amber-900 p-5 shadow-lg">
                                <SparklesIcon className="h-7 w-7 text-amber-300" aria-hidden />
                                <h2 className="mt-3 text-base font-bold text-white">Pronto para servir?</h2>
                                <p className="mt-2 text-sm leading-relaxed text-teal-100/90">
                                    Cadastre-se e acompanhe os próximos passos com a equipe.
                                </p>
                                <div className="mt-4">
                                    <MissionParticipateButton variant="primary" fullWidth className="!bg-amber-400 !text-amber-950 hover:!bg-amber-300" />
                                </div>
                                <Link
                                    href={route('mobile.mission.events')}
                                    className="mt-2 block cursor-pointer text-center text-sm font-semibold text-teal-200 hover:text-white"
                                >
                                    Ver eventos da missão
                                </Link>
                            </div>
                        </div>
                    </aside>
                </div>
            </div>
        </MobileLayout>
    );
}
