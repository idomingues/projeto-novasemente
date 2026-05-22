import { appRoleLabel } from '@/lib/appRoleLabels';
import type { RecordDetailSection } from '@/types/recordDetail';

const ATTENDANCE_LABELS: Record<string, string> = {
    less_than_3_months: 'Menos de 3 meses',
    months_3_6: '3 a 6 meses',
    months_6_12: '6 meses a 1 ano',
    years_1_3: '1 a 3 anos',
    more_than_3_years: 'Mais de 3 anos',
};

export type VolunteerDetailData = {
    id: number;
    name: string | null;
    email: string | null;
    phone: string | null;
    birth_date?: string | null;
    has_whatsapp?: boolean | null;
    has_social_networks?: boolean | null;
    attendance_duration?: string | null;
    is_official_member?: boolean | null;
    member_record_at_nova_semente?: boolean | null;
    member_record_church?: string | null;
    has_previous_ministry_volunteer_experience?: boolean | null;
    previous_ministry_details?: string | null;
    ministry_involvement?: string | null;
    other_ministry_interest?: string | null;
    gifts_to_develop?: string | null;
    professional_area?: string | null;
    needs_pastoral_guidance?: boolean | null;
    lgpd_data_consent?: boolean | null;
    role?: string | null;
    active?: boolean | null;
    app_access_only?: boolean | null;
    created_at?: string | null;
    updated_at?: string | null;
    ministries?: { id: number; name: string }[] | null;
    user?: {
        id: number;
        email: string | null;
        name: string;
        roles?: string[];
    } | null;
};

function yn(v: unknown): string {
    if (v === true || v === 1 || v === '1') return 'Sim';
    if (v === false || v === 0 || v === '0') return 'Não';
    return '—';
}

function text(raw: string | null | undefined): string {
    if (raw === null || raw === undefined || String(raw).trim() === '') return '—';
    return String(raw).trim();
}

function formatDateBr(iso: string | null | undefined): string {
    if (!iso) return '—';
    const [y, m, d] = iso.split('-');
    if (!y || !m || !d) return iso;
    return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
}

function formatAttendance(raw: string | null | undefined): string {
    if (!raw) return '—';
    return ATTENDANCE_LABELS[raw] ?? raw;
}

function submittedAtLabel(iso: string | null | undefined): string {
    if (!iso) return '—';
    try {
        return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
    } catch {
        return iso;
    }
}

/** Seções da ficha de cadastro de voluntário (formulário público). */
export function volunteerDetailSections(v: VolunteerDetailData): RecordDetailSection[] {
    const ministries = (v.ministries ?? []).map((m) => m.name).join(', ') || '—';
    const roles = (v.user?.roles ?? []).map((r) => appRoleLabel(r)).join(', ') || '—';

    return [
        {
            title: 'Identificação e contatos',
            rows: [
                { label: 'Nome completo', value: text(v.name) },
                { label: 'E-mail do cadastro', value: text(v.email) },
                { label: 'Telefone', value: text(v.phone) },
                { label: 'Data de nascimento', value: formatDateBr(v.birth_date) },
                { label: 'Indicou WhatsApp?', value: yn(v.has_whatsapp) },
                { label: 'Redes sociais (formulário)', value: yn(v.has_social_networks) },
            ],
        },
        {
            title: 'Frequência e membro',
            rows: [
                { label: 'Há quanto tempo frequenta / serve', value: formatAttendance(v.attendance_duration) },
                { label: 'Membro com cartão oficial?', value: yn(v.is_official_member) },
                { label: 'Registro em Nova Semente', value: yn(v.member_record_at_nova_semente) },
                { label: 'Outra igreja / detalhe de registro', value: text(v.member_record_church) },
            ],
        },
        {
            title: 'Experiência e interesses',
            rows: [
                { label: 'Já serviu em ministério antes?', value: yn(v.has_previous_ministry_volunteer_experience) },
                { label: 'Ministérios em que já serviu', value: text(v.previous_ministry_details) },
                { label: 'Ministérios em que é atuante', value: text(v.ministry_involvement) },
                { label: 'Interesse em outros ministérios', value: text(v.other_ministry_interest) },
                { label: 'Dons ou habilidades a desenvolver', value: text(v.gifts_to_develop) },
                { label: 'Área profissional', value: text(v.professional_area) },
                { label: 'Consentimento LGPD', value: yn(v.lgpd_data_consent) },
            ],
        },
        {
            title: 'Departamentos e função',
            rows: [
                { label: 'Cargo (função)', value: text(v.role) },
                { label: 'Estado', value: v.active === false ? 'Inativo' : v.active === true ? 'Ativo' : '—' },
                { label: 'Departamentos', value: ministries },
                ...(v.app_access_only
                    ? [{ label: 'Tipo de cadastro', value: 'Usuário do app (sem ministérios no cadastro)' }]
                    : []),
            ],
        },
        {
            title: 'Conta no aplicativo',
            rows: v.user
                ? [
                      { label: 'Usuário', value: text(v.user.name) },
                      {
                          label: 'E-mail da conta',
                          value: v.user.email ? text(v.user.email) : '— (convite pendente)',
                      },
                      { label: 'Papéis no app', value: roles },
                  ]
                : [{ label: 'Conta', value: 'Sem conta associada' }],
        },
        {
            title: 'Registro',
            rows: [
                { label: 'Criado em', value: submittedAtLabel(v.created_at) },
                {
                    label: 'Última atualização',
                    value:
                        v.updated_at && v.updated_at !== v.created_at
                            ? submittedAtLabel(v.updated_at)
                            : '—',
                },
            ],
        },
    ];
}
