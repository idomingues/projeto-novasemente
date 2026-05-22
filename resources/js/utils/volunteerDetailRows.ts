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
    photo_url?: string | null;
    email: string | null;
    display_email?: string | null;
    phone: string | null;
    display_phone?: string | null;
    has_app_account?: boolean;
    app_login_ready?: boolean;
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
        phone?: string | null;
        photo_url?: string | null;
        is_ministry_leader?: boolean;
        status?: 'active' | 'inactive' | string | null;
        birth_date?: string | null;
        notify_via_app?: boolean;
        notify_via_email?: boolean;
        notify_via_whatsapp?: boolean;
        roles?: string[];
        led_ministries?: { id: number; name: string }[];
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

function appAccessLabel(v: VolunteerDetailData): string {
    if (!v.has_app_account) {
        return 'Sem conta no aplicativo (apenas ficha de voluntário)';
    }
    if (v.app_login_ready) {
        return 'Pode entrar no app com o e-mail acima';
    }
    return 'Conta criada — falta e-mail de login ou convite pendente';
}

/** Seções da ficha: voluntário e conta no app numa visão só (sem telas separadas). */
export function volunteerDetailSections(v: VolunteerDetailData): RecordDetailSection[] {
    const serveMinistries = (v.ministries ?? []).map((m) => m.name).join(', ') || '—';
    const roles = (v.user?.roles ?? []).map((r) => appRoleLabel(r)).join(', ') || '—';
    const ledMinistries =
        (v.user?.led_ministries ?? []).map((m) => m.name).join(', ') ||
        (v.user?.is_ministry_leader ? '—' : '');
    const showMemberNovaSemente =
        v.is_official_member === true || v.is_official_member === 1 || v.is_official_member === '1';
    const showOtherChurch =
        showMemberNovaSemente &&
        (v.member_record_at_nova_semente === false ||
            v.member_record_at_nova_semente === 0 ||
            v.member_record_at_nova_semente === '0');

    const profileRows: { label: string; value: string }[] = [
        { label: 'Nome', value: text(v.user?.name ?? v.name) },
        { label: 'E-mail (login no app)', value: text(v.display_email ?? v.user?.email ?? v.email) },
        { label: 'Telefone', value: text(v.display_phone ?? v.phone ?? v.user?.phone) },
        { label: 'Acesso ao aplicativo', value: appAccessLabel(v) },
    ];

    if (v.has_app_account) {
        const accountStatus =
            v.user?.status === 'inactive' ? 'Inativa (não pode entrar no app)' : 'Ativa';
        profileRows.push({ label: 'Situação da conta no app', value: accountStatus });
        profileRows.push({ label: 'Papéis no app', value: roles });
        if (v.user?.is_ministry_leader || (v.user?.led_ministries?.length ?? 0) > 0) {
            profileRows.push({
                label: 'Líder de departamento',
                value: v.user?.is_ministry_leader ? 'Sim' : '—',
            });
            if ((v.user?.led_ministries?.length ?? 0) > 0) {
                profileRows.push({ label: 'Departamentos que lidera', value: ledMinistries || '—' });
            }
        }
    }

    profileRows.push(
        { label: 'Data de nascimento', value: formatDateBr(v.birth_date) },
        { label: 'Este número tem WhatsApp?', value: yn(v.has_whatsapp) },
        {
            label: 'Redes sociais (Instagram, Facebook ou TikTok)',
            value: yn(v.has_social_networks),
        },
    );

    return [
        {
            title: 'Perfil (voluntário e conta no app)',
            rows: profileRows,
        },
        {
            title: 'Nova Semente',
            rows: [
                {
                    label: 'Há quanto tempo frequenta a Nova Semente?',
                    value: formatAttendance(v.attendance_duration),
                },
                { label: 'Membro oficial da igreja adventista?', value: yn(v.is_official_member) },
                ...(showMemberNovaSemente
                    ? [
                          {
                              label: 'Registro de membro está na Nova Semente?',
                              value: yn(v.member_record_at_nova_semente),
                          },
                      ]
                    : []),
                ...(showOtherChurch
                    ? [{ label: 'Em qual igreja está o registro de membro?', value: text(v.member_record_church) }]
                    : []),
            ],
        },
        {
            title: 'Experiência e ministérios',
            rows: [
                {
                    label: 'Já foi voluntário em algum ministério da igreja?',
                    value: yn(v.has_previous_ministry_volunteer_experience),
                },
                ...(v.has_previous_ministry_volunteer_experience === true ||
                v.has_previous_ministry_volunteer_experience === 1 ||
                v.has_previous_ministry_volunteer_experience === '1'
                    ? [
                          {
                              label: 'Ministérios em que já serviu',
                              value: text(v.previous_ministry_details),
                          },
                      ]
                    : []),
                {
                    label: 'É atuante de algum ministério da Nova Semente?',
                    value: v.ministry_involvement === 'Não' ? 'Não' : text(v.ministry_involvement),
                },
                {
                    label: 'Gostaria de servir em outro ministério?',
                    value: v.other_ministry_interest === 'Não' ? 'Não' : text(v.other_ministry_interest),
                },
                {
                    label: 'Dons ou habilidades a desenvolver no servir',
                    value: text(v.gifts_to_develop),
                },
                { label: 'Área de atuação profissional', value: text(v.professional_area) },
                { label: 'Consentimento para uso de dados (LGPD)', value: yn(v.lgpd_data_consent) },
            ],
        },
        {
            title: 'Departamentos e função',
            rows: [
                { label: 'Cargo (função)', value: text(v.role) },
                {
                    label: 'Ativo nas escalas',
                    value:
                        v.active === false
                            ? 'Não — oculto na seleção de escalas'
                            : v.active === true
                              ? 'Sim — pode ser escalado'
                              : '—',
                },
                { label: 'Departamentos em que serve', value: serveMinistries },
                ...(v.app_access_only
                    ? [{ label: 'Observação', value: 'Conta no app sem departamentos de serviço vinculados' }]
                    : []),
            ],
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
