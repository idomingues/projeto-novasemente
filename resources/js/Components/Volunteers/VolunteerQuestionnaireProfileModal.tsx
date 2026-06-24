import Modal from '@/Components/Modal';
import SecondaryButton from '@/Components/SecondaryButton';

export type VolunteerQuestionnaireProfile = {
    id: number;
    name: string | null;
    email: string | null;
    phone: string | null;
    birthDate: string | null;
    hasWhatsapp: boolean | null;
    hasSocialNetworks: boolean | null;
    socialNetworkProfiles: string | null;
    attendanceDuration: string | null;
    volunteerPhaseLabel: string | null;
    serviceEaseAreasLabel: string | null;
    serviceActivityTypesLabel: string | null;
    comfortableWithDigitalTools: boolean | null;
    serviceGreatestStrength: string | null;
    serviceGreatestChallenge: string | null;
    isOfficialMember: boolean | null;
    memberRecordAtNovaSemente: boolean | null;
    memberRecordChurch: string | null;
    hasPreviousMinistryVolunteerExperience: boolean | null;
    previousMinistryDetails: string | null;
    professionalArea: string | null;
    ministryInvolvement: string | null;
    otherMinistryInterest: string | null;
    giftsToDevelop: string | null;
    needsPastoralGuidance: boolean | null;
    lgpdDataConsent: boolean | null;
    role: string | null;
    appAccessOnly: boolean | null;
};

function boolLabel(v: boolean | null | undefined) {
    if (v === null || v === undefined) return 'Não informado';
    return v ? 'Sim' : 'Não';
}

function textLabel(v: string | null | undefined) {
    if (!v || v.trim() === '') return '—';
    return v;
}

function dateLabel(v: string | null | undefined) {
    if (!v || v.trim() === '') return '—';
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return v;
    return d.toLocaleDateString('pt-BR');
}

function attendanceLabel(raw: string | null | undefined) {
    if (!raw) return '—';
    const map: Record<string, string> = {
        less_than_3_months: 'Menos de 3 meses',
        months_0_6: '0 a 6 meses',
        months_3_6: '3 a 6 meses',
        months_6_12: '6 meses a 1 ano',
        years_1_2: '1 a 2 anos',
        years_1_3: '1 a 3 anos',
        more_than_2_years: 'Mais de 2 anos',
        more_than_3_years: 'Mais de 3 anos',
        more_than_5_years: 'Mais de 5 anos',
    };
    return map[raw] ?? raw;
}

function bulletListFromSemicolon(raw: string | null | undefined) {
    const trimmed = (raw ?? '').trim();
    if (trimmed === '') return '—';
    return trimmed
        .split('; ')
        .filter((part) => part.trim() !== '')
        .map((part) => `• ${part}`)
        .join('\n');
}

interface Props {
    show: boolean;
    onClose: () => void;
    profile: VolunteerQuestionnaireProfile | null;
    subtitle?: string | null;
}

export default function VolunteerQuestionnaireProfileModal({ show, onClose, profile, subtitle }: Props) {
    return (
        <Modal show={show && profile !== null} onClose={onClose} maxWidth="lg">
            {profile ? (
                <div className="space-y-4 p-6">
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Dados do voluntário</h2>
                            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                                {profile.name ?? 'Voluntário'}
                                {subtitle ? (
                                    <>
                                        {' '}
                                        <span className="text-zinc-400 dark:text-zinc-500">· {subtitle}</span>
                                    </>
                                ) : null}
                            </p>
                        </div>
                        <SecondaryButton type="button" onClick={onClose}>
                            Fechar
                        </SecondaryButton>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
                            <div className="text-xs text-zinc-500">E-mail</div>
                            <div className="mt-1 text-sm text-zinc-900 dark:text-white">{textLabel(profile.email)}</div>
                        </div>
                        <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
                            <div className="text-xs text-zinc-500">Telefone</div>
                            <div className="mt-1 text-sm text-zinc-900 dark:text-white">{textLabel(profile.phone)}</div>
                        </div>
                        <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
                            <div className="text-xs text-zinc-500">Data de nascimento</div>
                            <div className="mt-1 text-sm text-zinc-900 dark:text-white">{dateLabel(profile.birthDate)}</div>
                        </div>
                        <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
                            <div className="text-xs text-zinc-500">Área profissional</div>
                            <div className="mt-1 text-sm text-zinc-900 dark:text-white">{textLabel(profile.professionalArea)}</div>
                        </div>
                        <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
                            <div className="text-xs text-zinc-500">Este número tem WhatsApp?</div>
                            <div className="mt-1 text-sm text-zinc-900 dark:text-white">{boolLabel(profile.hasWhatsapp)}</div>
                        </div>
                        <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
                            <div className="text-xs text-zinc-500">Redes Sociais (Instagram, Facebook ou TikTok)</div>
                            <div className="mt-1 text-sm text-zinc-900 dark:text-white">{boolLabel(profile.hasSocialNetworks)}</div>
                        </div>
                        {profile.hasSocialNetworks ? (
                            <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
                                <div className="text-xs text-zinc-500">Perfil do Instagram/Facebook</div>
                                <div className="mt-1 text-sm text-zinc-900 dark:text-white">
                                    {textLabel(profile.socialNetworkProfiles)}
                                </div>
                            </div>
                        ) : null}
                        <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
                            <div className="text-xs text-zinc-500">Há quanto tempo você frequenta a Nova Semente?</div>
                            <div className="mt-1 text-sm text-zinc-900 dark:text-white">{attendanceLabel(profile.attendanceDuration)}</div>
                        </div>
                        <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
                            <div className="text-xs text-zinc-500">Você é membro oficial da igreja adventista?</div>
                            <div className="mt-1 text-sm text-zinc-900 dark:text-white">{boolLabel(profile.isOfficialMember)}</div>
                        </div>
                        <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
                            <div className="text-xs text-zinc-500">Seu registro de membro está na Nova Semente?</div>
                            <div className="mt-1 text-sm text-zinc-900 dark:text-white">{boolLabel(profile.memberRecordAtNovaSemente)}</div>
                        </div>
                        <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
                            <div className="text-xs text-zinc-500">Se não estiver, em qual igreja está?</div>
                            <div className="mt-1 text-sm text-zinc-900 dark:text-white">{textLabel(profile.memberRecordChurch)}</div>
                        </div>
                        <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
                            <div className="text-xs text-zinc-500">Você já foi voluntário em algum ministério da igreja?</div>
                            <div className="mt-1 text-sm text-zinc-900 dark:text-white">
                                {boolLabel(profile.hasPreviousMinistryVolunteerExperience)}
                            </div>
                        </div>
                        <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
                            <div className="text-xs text-zinc-500">Precisa de alguma orientação pastoral nesse momento?</div>
                            <div className="mt-1 text-sm text-zinc-900 dark:text-white">{boolLabel(profile.needsPastoralGuidance)}</div>
                        </div>
                        <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
                            <div className="text-xs text-zinc-500">Consentimento LGPD</div>
                            <div className="mt-1 text-sm text-zinc-900 dark:text-white">{boolLabel(profile.lgpdDataConsent)}</div>
                        </div>
                        <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
                            <div className="text-xs text-zinc-500">Função/cargo informado</div>
                            <div className="mt-1 text-sm text-zinc-900 dark:text-white">{textLabel(profile.role)}</div>
                        </div>
                        <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
                            <div className="text-xs text-zinc-500">Acesso somente app</div>
                            <div className="mt-1 text-sm text-zinc-900 dark:text-white">{boolLabel(profile.appAccessOnly)}</div>
                        </div>
                    </div>

                    {(profile.volunteerPhaseLabel ||
                        profile.serviceEaseAreasLabel ||
                        profile.serviceActivityTypesLabel ||
                        profile.serviceGreatestStrength ||
                        profile.serviceGreatestChallenge) && (
                        <div className="space-y-3">
                            <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">Sobre o serviço</h3>
                            {profile.volunteerPhaseLabel ? (
                                <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
                                    <div className="text-xs text-zinc-500">Fase no voluntariado da Nova Semente</div>
                                    <div className="mt-1 text-sm text-zinc-900 dark:text-white">
                                        {textLabel(profile.volunteerPhaseLabel)}
                                    </div>
                                </div>
                            ) : null}
                            {profile.serviceEaseAreasLabel ? (
                                <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
                                    <div className="text-xs text-zinc-500">Áreas de facilidade para servir</div>
                                    <div className="mt-1 whitespace-pre-wrap text-sm text-zinc-900 dark:text-white">
                                        {bulletListFromSemicolon(profile.serviceEaseAreasLabel)}
                                    </div>
                                </div>
                            ) : null}
                            {profile.serviceActivityTypesLabel ? (
                                <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
                                    <div className="text-xs text-zinc-500">
                                        Tipos de atividade em que rende melhor
                                    </div>
                                    <div className="mt-1 whitespace-pre-wrap text-sm text-zinc-900 dark:text-white">
                                        {bulletListFromSemicolon(profile.serviceActivityTypesLabel)}
                                    </div>
                                </div>
                            ) : null}
                            {profile.comfortableWithDigitalTools !== null &&
                            profile.comfortableWithDigitalTools !== undefined ? (
                                <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
                                    <div className="text-xs text-zinc-500">Conforto com ferramentas digitais</div>
                                    <div className="mt-1 text-sm text-zinc-900 dark:text-white">
                                        {boolLabel(profile.comfortableWithDigitalTools)}
                                    </div>
                                </div>
                            ) : null}
                            {profile.serviceGreatestStrength ? (
                                <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
                                    <div className="text-xs text-zinc-500">Maior ponto forte no serviço</div>
                                    <div className="mt-1 whitespace-pre-wrap text-sm text-zinc-900 dark:text-white">
                                        {textLabel(profile.serviceGreatestStrength)}
                                    </div>
                                </div>
                            ) : null}
                            {profile.serviceGreatestChallenge ? (
                                <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
                                    <div className="text-xs text-zinc-500">Maior desafio ao servir</div>
                                    <div className="mt-1 whitespace-pre-wrap text-sm text-zinc-900 dark:text-white">
                                        {textLabel(profile.serviceGreatestChallenge)}
                                    </div>
                                </div>
                            ) : null}
                        </div>
                    )}

                    <div className="space-y-3">
                        <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
                            <div className="text-xs text-zinc-500">Detalhes da experiência anterior</div>
                            <div className="mt-1 whitespace-pre-wrap text-sm text-zinc-900 dark:text-white">
                                {textLabel(profile.previousMinistryDetails)}
                            </div>
                        </div>
                        <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
                            <div className="text-xs text-zinc-500">Envolvimento em ministérios</div>
                            <div className="mt-1 whitespace-pre-wrap text-sm text-zinc-900 dark:text-white">
                                {textLabel(profile.ministryInvolvement)}
                            </div>
                        </div>
                        <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
                            <div className="text-xs text-zinc-500">Outros interesses ministeriais</div>
                            <div className="mt-1 whitespace-pre-wrap text-sm text-zinc-900 dark:text-white">
                                {textLabel(profile.otherMinistryInterest)}
                            </div>
                        </div>
                        <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
                            <div className="text-xs text-zinc-500">Dons a desenvolver</div>
                            <div className="mt-1 whitespace-pre-wrap text-sm text-zinc-900 dark:text-white">
                                {textLabel(profile.giftsToDevelop)}
                            </div>
                        </div>
                    </div>
                </div>
            ) : null}
        </Modal>
    );
}
