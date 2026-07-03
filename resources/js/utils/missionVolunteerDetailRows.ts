/** Campos retornados por `MissionVolunteerPayload::serializeForFrontend`. */
export type MissionVolunteerDetail = {
    id: number;
    fullName: string;
    photoUrl?: string | null;
    email?: string | null;
    birthDate?: string | null;
    phone?: string | null;
    fullAddress?: string | null;
    profession?: string | null;
    hasBelief?: boolean | null;
    beliefWhich?: string | null;
    beliefWhichOther?: string | null;
    participatesReligion?: boolean | null;
    religionWhich?: string | null;
    religionWhichOther?: string | null;
    baptized?: boolean | null;
    seeksInCommunity?: string[] | null;
    seeksInCommunityOther?: string | null;
    studiedBible?: string | null;
    studiedBibleStructured?: boolean | null;
    firstTimeNovaSemente?: boolean | null;
    firstContactVia?: string | null;
    firstContactViaOther?: string | null;
    wantsBibleStudyPartner?: string | null;
    spiritualJourney?: string | null;
    comfortableEnvironment?: string | null;
    groupProjectPreference?: string | null;
    interestAreas?: string[] | null;
    learningStyle?: string | null;
    personalizedBibleStudyInterest?: string | null;
    missionSocialProjectsInterest?: string | null;
    startAreaPreference?: string | null;
    talentsForGod?: string | null;
    teamSupportNotes?: string | null;
    lgpdConsent?: boolean | null;
    phaseId?: number | null;
    phaseName?: string | null;
    createdAt?: string | null;
};

import type { RecordDetailSection } from '@/types/recordDetail';

export type MissionDetailSection = RecordDetailSection;

function yn(v: unknown): string {
    if (v === true) return 'Sim';
    if (v === false) return 'Não';
    return '—';
}

function formatDateBr(iso: string | null | undefined): string {
    if (!iso) return '—';
    const [y, m, d] = iso.split('-');
    if (!y || !m || !d) return iso;
    return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
}

function formatChoice(choice: string | null | undefined, other: string | null | undefined): string {
    if (!choice) return '—';
    if (choice === 'Outra' && other?.trim()) {
        return `Outra: ${other.trim()}`;
    }
    return choice;
}

function beliefAnswer(v: MissionVolunteerDetail): string {
    if (v.hasBelief === false) return 'Não';
    if (v.hasBelief === true) {
        return formatChoice(v.beliefWhich, v.beliefWhichOther);
    }
    return '—';
}

function religionAnswer(v: MissionVolunteerDetail): string {
    if (v.participatesReligion === false) return 'Não';
    if (v.participatesReligion === true) {
        return formatChoice(v.religionWhich, v.religionWhichOther);
    }
    return '—';
}

function seeksAnswer(v: MissionVolunteerDetail): string {
    const raw = v.seeksInCommunity ?? [];
    const choice = raw[0] ?? '';
    if (!choice) return '—';
    return formatChoice(choice, v.seeksInCommunityOther);
}

function submittedAtLabel(iso: string | null | undefined): string {
    if (!iso) return '—';
    try {
        return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
    } catch {
        return iso;
    }
}

function joinedList(values: string[] | null | undefined): string {
    const items = (values ?? []).map((value) => value.trim()).filter(Boolean);

    return items.length > 0 ? items.join(', ') : '—';
}

function textAnswer(value: string | null | undefined): string {
    return value?.trim() || '—';
}

/** Seções alinhadas às perguntas do formulário Missão. */
export function missionVolunteerDetailSections(v: MissionVolunteerDetail): MissionDetailSection[] {
    return [
        {
            title: 'Dados pessoais',
            rows: [
                { label: '1. Nome completo', value: v.fullName || '—' },
                { label: '2. Data de nascimento', value: formatDateBr(v.birthDate) },
                { label: '3. Telefone', value: v.phone?.trim() || '—' },
                { label: '4. Endereço completo', value: v.fullAddress?.trim() || '—' },
                ...(v.email?.trim() ? [{ label: 'E-mail', value: v.email.trim() }] : []),
            ],
        },
        {
            title: 'Profissão',
            rows: [{ label: '5. Profissão', value: v.profession?.trim() || '—' }],
        },
        {
            title: 'Fé e crença',
            rows: [
                { label: '6. Você tem alguma crença?', value: yn(v.hasBelief) },
                ...(v.hasBelief === true
                    ? [{ label: '7. Qual crença?', value: beliefAnswer(v) }]
                    : []),
            ],
        },
        {
            title: 'Religião',
            rows: [
                { label: '8. Participa de alguma religião?', value: yn(v.participatesReligion) },
                ...(v.participatesReligion === true
                    ? [{ label: '9. Qual religião?', value: religionAnswer(v) }]
                    : []),
            ],
        },
        {
            title: 'Batismo',
            rows: [{ label: '10. Você é batizado(a)?', value: yn(v.baptized) }],
        },
        {
            title: 'Comunidade e Bíblia',
            rows: [
                { label: '11. O que busca na comunidade?', value: seeksAnswer(v) },
                { label: '12. Já estudou a Bíblia?', value: v.studiedBible?.trim() || '—' },
                { label: '13. Estudo bíblico estruturado?', value: yn(v.studiedBibleStructured) },
            ],
        },
        {
            title: 'Nova Semente',
            rows: [
                { label: '14. Primeira vez na Nova Semente?', value: yn(v.firstTimeNovaSemente) },
                {
                    label: '15. Como nos conheceu?',
                    value: formatChoice(v.firstContactVia, v.firstContactViaOther),
                },
                { label: '16. Parceiro(a) de estudo bíblico?', value: v.wantsBibleStudyPartner?.trim() || '—' },
            ],
        },
        {
            title: 'Caminhada e convivência',
            rows: [
                { label: '17. Caminhada espiritual hoje', value: textAnswer(v.spiritualJourney) },
                { label: '18. Ambiente em que se sente mais confortável', value: textAnswer(v.comfortableEnvironment) },
                { label: '19. Preferência ao participar de grupo ou projeto', value: textAnswer(v.groupProjectPreference) },
            ],
        },
        {
            title: 'Interesses e aprendizado',
            rows: [
                { label: '20. Atividades que despertam mais interesse', value: joinedList(v.interestAreas) },
                { label: '21. Como aprende melhor', value: textAnswer(v.learningStyle) },
                {
                    label: '22. Interesse em estudo bíblico personalizado',
                    value: textAnswer(v.personalizedBibleStudyInterest),
                },
                {
                    label: '23. Participação em projetos missionários ou ações sociais',
                    value: textAnswer(v.missionSocialProjectsInterest),
                },
                { label: '24. Área para começar na Nova Semente', value: textAnswer(v.startAreaPreference) },
            ],
        },
        {
            title: 'Observações',
            rows: [
                { label: '25. Habilidades, experiências ou talentos', value: textAnswer(v.talentsForGod) },
                { label: '26. O que a equipe deve saber ou como pode ajudar', value: textAnswer(v.teamSupportNotes) },
                { label: 'Consentimento LGPD', value: yn(v.lgpdConsent) },
            ],
        },
        {
            title: 'Gestão',
            rows: [
                { label: 'Fase atual', value: v.phaseName?.trim() || '—' },
                { label: 'Enviado em', value: submittedAtLabel(v.createdAt) },
            ],
        },
    ];
}
