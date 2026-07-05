import FlashMessages from '@/Components/FlashMessages';
import MissionFormBody, { type MissionFormData, type MissionOptions } from '@/Components/Mission/MissionFormBody';
import MissionSubmissionSuccess, {
    type MissionSubmissionResult,
} from '@/Components/Mission/MissionSubmissionSuccess';
import MissionHubBackLink from '@/Components/Mission/MissionHubBackLink';
import MobileLayout from '@/Layouts/MobileLayout';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { FormEvent, FormEventHandler, useMemo, useState } from 'react';

type MissionDraft = {
    id: number;
    stepIndex: number;
    stepId: string | null;
    photoUrl: string | null;
    fields: Partial<Omit<MissionFormData, 'photo'>>;
};

interface Props {
    churchName: string;
    options: MissionOptions;
    storeUrl: string;
    saveStepUrl?: string;
    appAccountStoreUrl: string;
    layout: 'mobile' | 'default';
    formRevision?: number;
    submission?: MissionSubmissionResult | null;
    canResume?: boolean;
    draft?: MissionDraft | null;
    isEditing?: boolean;
    offerAppAccount?: boolean;
}

export function emptyMissionForm(): MissionFormData {
    return {
        photo: null,
        full_name: '',
        birth_date: '',
        email: '',
        phone: '',
        full_address: '',
        profession: '',
        profession_other: '',
        has_belief: null,
        belief_which: '',
        belief_which_other: '',
        participates_religion: null,
        religion_which: '',
        religion_which_other: '',
        baptized: null,
        seeks_in_community: '',
        seeks_in_community_other: '',
        studied_bible: '',
        studied_bible_structured: null,
        first_time_nova_semente: null,
        first_contact_via: '',
        first_contact_via_other: '',
        wants_bible_study_partner: '',
        spiritual_journey: '',
        comfortable_environment: '',
        group_project_preference: '',
        interest_areas: [],
        learning_style: '',
        personalized_bible_study_interest: '',
        mission_social_projects_interest: '',
        start_area_preference: '',
        talents_for_god: '',
        team_support_notes: '',
        lgpd_consent: false,
        wants_app_account: null,
        app_email: '',
        app_password: '',
        app_password_confirmation: '',
    };
}

export default function MissionForm({
    churchName,
    options,
    storeUrl,
    saveStepUrl,
    appAccountStoreUrl,
    layout,
    formRevision,
    submission = null,
    canResume = false,
    draft = null,
    isEditing = false,
    offerAppAccount = false,
}: Props) {
    const isMobile = layout === 'mobile';
    const [showForm, setShowForm] = useState(!submission);
    const initialValues = useMemo(
        () => ({
            ...emptyMissionForm(),
            ...(draft?.fields ?? {}),
        }),
        [draft],
    );
    const form = useForm(initialValues);
    const authUser = (usePage().props as { auth?: { user?: { id: number } | null } }).auth?.user;
    const canSaveProgress = Boolean(authUser && saveStepUrl);
    const afterLoginRoute = isMobile ? route('mobile.home') : route('dashboard');
    const enterAppHref = authUser
        ? afterLoginRoute
        : `${route('login')}?redirect=${encodeURIComponent(afterLoginRoute)}`;

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        const skipAppAccount = (e as FormEvent & { skipAppAccount?: boolean }).skipAppAccount === true;

        form.transform((d) => ({
            ...d,
            seeks_in_community: d.seeks_in_community ? [d.seeks_in_community] : [],
            email: d.email.trim(),
            wants_app_account: skipAppAccount ? false : d.wants_app_account,
            app_email: skipAppAccount ? '' : (d.app_email.trim() || d.email.trim()),
            app_password: skipAppAccount ? '' : d.app_password,
            app_password_confirmation: skipAppAccount ? '' : d.app_password_confirmation,
        }));
        form.post(storeUrl, {
            preserveScroll: true,
            forceFormData: true,
            onFinish: () => form.transform((d) => d),
        });
    };

    const startNewRegistration = () => {
        form.reset();
        form.clearErrors();
        setShowForm(true);
        router.get(isMobile ? route('mobile.mission.form') : route('mission.form'), {}, { preserveScroll: true });
    };

    const content = (
        <>
            <Head title="Missão" />
            <FlashMessages />
            <FormHeader
                churchName={churchName}
                isMobile={isMobile}
                showForm={showForm && !submission}
                isEditing={isEditing}
            />
            {submission && !showForm ? (
                <MissionSubmissionSuccess
                    submission={submission}
                    enterAppHref={enterAppHref}
                    onNewRegistration={startNewRegistration}
                />
            ) : (
                <>
                    {isEditing ? (
                        <p className="mb-4 rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-950 dark:border-teal-800 dark:bg-teal-950/40 dark:text-teal-100">
                            Seu cadastro já está registrado. Revise e atualize as informações abaixo quando precisar.
                        </p>
                    ) : canResume && draft ? (
                        <p className="mb-4 rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-950 dark:border-teal-800 dark:bg-teal-950/40 dark:text-teal-100">
                            Você tem um cadastro em andamento. Continue de onde parou.
                        </p>
                    ) : null}
                    <MissionFormBody
                        form={form}
                        options={options}
                        onSubmit={submit}
                        processing={form.processing}
                        formRevision={formRevision}
                        saveStepUrl={saveStepUrl}
                        canSaveProgress={canSaveProgress}
                        initialStepIndex={draft?.stepIndex ?? 0}
                        initialPhotoUrl={draft?.photoUrl ?? null}
                        isEditing={isEditing}
                        offerAppAccount={offerAppAccount}
                    />
                </>
            )}
        </>
    );

    if (isMobile) {
        return <MobileLayout>{content}</MobileLayout>;
    }

    return (
        <AdminLayout>
            <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-10">{content}</div>
        </AdminLayout>
    );
}

function FormHeader({
    churchName,
    isMobile,
    showForm,
    isEditing = false,
}: {
    churchName: string;
    isMobile: boolean;
    showForm: boolean;
    isEditing?: boolean;
}) {
    return (
        <header className={isMobile ? 'mb-5' : 'mb-8'}>
            {isMobile ? (
                <div className="mb-3">
                    <MissionHubBackLink />
                </div>
            ) : null}
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-3xl">
                Cadastro missionário
            </h1>
            {showForm ? (
                <>
                    <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                        {isEditing
                            ? `Revise ou atualize seu cadastro missionário na ${churchName}.`
                            : `Conte um pouco sobre você para a equipe Missão da ${churchName} te acolher. São etapas curtas; ao final você vê a confirmação do envio.`}
                    </p>
                    {!isEditing ? (
                        <>
                            <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">Leva cerca de 5–8 minutos.</p>
                            <p className="mt-2 text-xs text-red-600 dark:text-red-400">
                                <span className="font-semibold">*</span> Obrigatória
                            </p>
                        </>
                    ) : null}
                </>
            ) : (
                <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                    Cadastro missionário da {churchName}.
                </p>
            )}
        </header>
    );
}
