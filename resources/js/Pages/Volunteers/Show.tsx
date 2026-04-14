import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link } from '@inertiajs/react';
import type { ReactNode } from 'react';
import Card from '@/Components/Card';
import PageHeader from '@/Components/PageHeader';
import { activeInactivePillClass } from '@/lib/statusBadges';
import { appRoleLabel } from '@/lib/appRoleLabels';
import { getMinistryIcon } from '@/lib/ministryIcons';

interface Ministry {
    id: number;
    name: string;
}

interface VolunteerUser {
    id: number;
    email: string | null;
    name: string;
    roles: string[];
    ministry_ids: number[];
}

export interface VolunteerDetail {
    id: number;
    name: string | null;
    email: string | null;
    phone: string | null;
    birth_date: string | null;
    has_whatsapp: boolean | null;
    has_social_networks: boolean | null;
    attendance_duration: string | null;
    is_official_member: boolean | null;
    member_record_at_nova_semente: boolean | null;
    member_record_church: string | null;
    has_previous_ministry_volunteer_experience: boolean | null;
    previous_ministry_details: string | null;
    ministry_involvement: string | null;
    other_ministry_interest: string | null;
    gifts_to_develop: string | null;
    professional_area: string | null;
    needs_pastoral_guidance: boolean | null;
    lgpd_data_consent: boolean | null;
    role: string | null;
    active: boolean;
    created_at: string | null;
    updated_at: string | null;
    ministries: Ministry[];
    user: VolunteerUser | null;
}

interface Props {
    volunteer: VolunteerDetail;
}

const ATTENDANCE_LABELS: Record<string, string> = {
    less_than_3_months: 'Menos de 3 meses',
    months_3_6: '3 a 6 meses',
    months_6_12: '6 meses a 1 ano',
    years_1_3: '1 a 3 anos',
    more_than_3_years: 'Mais de 3 anos',
};

function formatBool(v: boolean | null | undefined): string {
    if (v === null || v === undefined) return '—';
    return v ? 'Sim' : 'Não';
}

function formatAttendance(raw: string | null): string {
    if (!raw) return '—';
    return ATTENDANCE_LABELS[raw] ?? raw;
}

function formatText(raw: string | null): string {
    if (raw === null || raw === undefined || raw.trim() === '') return '—';
    return raw;
}

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div className="min-w-0">
            <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">{label}</p>
            <div className="mt-1 text-sm text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap break-words">{children}</div>
        </div>
    );
}

function SectionTitle({ children }: { children: ReactNode }) {
    return (
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-white border-b border-zinc-200 dark:border-zinc-800 pb-2 mb-4">
            {children}
        </h2>
    );
}

export default function Show({ volunteer: v }: Props) {
    const titleName = v.name?.trim() || 'Voluntário';

    return (
        <AdminLayout>
            <Head title={`Voluntário — ${titleName}`} />

            <PageHeader title="Detalhe do voluntário">
                <Link
                    href={route('volunteers.index')}
                    className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors shrink-0"
                >
                    Voltar à lista
                </Link>
            </PageHeader>

            <div className="space-y-6">
                <Card>
                    <SectionTitle>Identificação e contactos</SectionTitle>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <DetailRow label="Nome completo">{formatText(v.name)}</DetailRow>
                        <DetailRow label="E-mail (cadastro)">{formatText(v.email)}</DetailRow>
                        <DetailRow label="Telefone">{formatText(v.phone)}</DetailRow>
                        <DetailRow label="Data de nascimento">
                            {v.birth_date ? new Date(v.birth_date).toLocaleDateString('pt-PT') : '—'}
                        </DetailRow>
                        <DetailRow label="Indicou WhatsApp?">{formatBool(v.has_whatsapp)}</DetailRow>
                        <DetailRow label="Redes sociais (indicação no formulário)">{formatBool(v.has_social_networks)}</DetailRow>
                    </div>
                </Card>

                <Card>
                    <SectionTitle>Frequência e membro</SectionTitle>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <DetailRow label="Há quanto tempo frequenta / serve">{formatAttendance(v.attendance_duration)}</DetailRow>
                        <DetailRow label="Membro com cartão oficial?">{formatBool(v.is_official_member)}</DetailRow>
                        <DetailRow label="Registo em Nova Semente (membro)">{formatBool(v.member_record_at_nova_semente)}</DetailRow>
                        <DetailRow label="Outra igreja / detalhe de registo">{formatText(v.member_record_church)}</DetailRow>
                    </div>
                </Card>

                <Card>
                    <SectionTitle>Experiência e interesses</SectionTitle>
                    <div className="grid grid-cols-1 gap-6">
                        <DetailRow label="Já serviu / voluntariou em ministério antes?">
                            {formatBool(v.has_previous_ministry_volunteer_experience)}
                        </DetailRow>
                        <DetailRow label="Detalhes da experiência anterior">{formatText(v.previous_ministry_details)}</DetailRow>
                        <DetailRow label="Envolvimento / atuação em ministérios">{formatText(v.ministry_involvement)}</DetailRow>
                        <DetailRow label="Outro ministério ou área de interesse">{formatText(v.other_ministry_interest)}</DetailRow>
                        <DetailRow label="Dons ou habilidades a desenvolver">{formatText(v.gifts_to_develop)}</DetailRow>
                        <DetailRow label="Área profissional">{formatText(v.professional_area)}</DetailRow>
                        <DetailRow label="Deseja orientação pastoral?">{formatBool(v.needs_pastoral_guidance)}</DetailRow>
                        <DetailRow label="Consentimento de dados (LGPD)">{formatBool(v.lgpd_data_consent)}</DetailRow>
                    </div>
                </Card>

                <Card>
                    <SectionTitle>Departamentos e função</SectionTitle>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <DetailRow label="Cargo (função)">{formatText(v.role)}</DetailRow>
                        <div>
                            <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">Estado</p>
                            <span className={`mt-1 inline-block ${activeInactivePillClass(v.active)}`}>
                                {v.active ? 'Ativo' : 'Inativo'}
                            </span>
                        </div>
                        <div className="md:col-span-2">
                            <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-2">
                                Departamentos
                            </p>
                            {v.ministries.length === 0 ? (
                                <span className="text-sm text-zinc-600 dark:text-zinc-300">—</span>
                            ) : (
                                <div className="flex flex-wrap gap-1.5">
                                    {v.ministries.map((min) => {
                                        const Icon = getMinistryIcon(min.name);
                                        return (
                                            <span
                                                key={min.id}
                                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-xs text-zinc-800 dark:text-zinc-200"
                                            >
                                                <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                                                {min.name}
                                            </span>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </Card>

                <Card>
                    <SectionTitle>Conta no aplicativo</SectionTitle>
                    {!v.user ? (
                        <p className="text-sm text-zinc-600 dark:text-zinc-300">Sem conta associada.</p>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <DetailRow label="Utilizador">{formatText(v.user.name)}</DetailRow>
                            <DetailRow label="E-mail da conta">{v.user.email ? v.user.email : '— (convite pendente)'}</DetailRow>
                            <div className="md:col-span-2">
                                <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-2">
                                    Papéis no app
                                </p>
                                {(v.user.roles?.length ?? 0) === 0 ? (
                                    <span className="text-sm text-zinc-600 dark:text-zinc-300">—</span>
                                ) : (
                                    <div className="flex flex-wrap gap-1">
                                        {v.user.roles.map((rn) => (
                                            <span
                                                key={rn}
                                                className="inline-flex text-xs px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200"
                                            >
                                                {appRoleLabel(rn)}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </Card>

                <p className="text-xs text-zinc-500 dark:text-zinc-400 px-1">
                    Registo criado em{' '}
                    {v.created_at ? new Date(v.created_at).toLocaleString('pt-PT') : '—'}
                    {v.updated_at && v.updated_at !== v.created_at ? (
                        <>
                            {' '}
                            · Última atualização {new Date(v.updated_at).toLocaleString('pt-PT')}
                        </>
                    ) : null}
                </p>
            </div>
        </AdminLayout>
    );
}
