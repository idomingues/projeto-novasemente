import FlashMessages from '@/Components/FlashMessages';
import MissionFormBody, { type MissionFormData, type MissionOptions } from '@/Components/Mission/MissionFormBody';
import MissionSubmissionSuccess, {
    type MissionSubmissionResult,
} from '@/Components/Mission/MissionSubmissionSuccess';
import MissionHubBackLink from '@/Components/Mission/MissionHubBackLink';
import MobileLayout from '@/Layouts/MobileLayout';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { FormEventHandler, useState } from 'react';

interface Props {
    churchName: string;
    options: MissionOptions;
    storeUrl: string;
    appAccountStoreUrl: string;
    layout: 'mobile' | 'default';
    formRevision?: number;
    submission?: MissionSubmissionResult | null;
}

export function emptyMissionForm(): MissionFormData {
    return {
        photo: null,
        full_name: '',
        birth_date: '',
        phone: '',
        full_address: '',
        profession: '',
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
        lgpd_consent: false,
    };
}

export default function MissionForm({
    churchName,
    options,
    storeUrl,
    appAccountStoreUrl,
    layout,
    formRevision,
    submission = null,
}: Props) {
    const isMobile = layout === 'mobile';
    const [showForm, setShowForm] = useState(!submission);
    const form = useForm(emptyMissionForm());
    const authUser = (usePage().props as { auth?: { user?: { id: number } | null } }).auth?.user;
    const afterLoginRoute = isMobile ? route('mobile.home') : route('dashboard');
    const enterAppHref = authUser
        ? afterLoginRoute
        : `${route('login')}?redirect=${encodeURIComponent(afterLoginRoute)}`;

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        form.transform((d) => ({
            ...d,
            seeks_in_community: d.seeks_in_community ? [d.seeks_in_community] : [],
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
            <FormHeader churchName={churchName} isMobile={isMobile} showForm={showForm && !submission} />
            {submission && !showForm ? (
                <MissionSubmissionSuccess
                    submission={submission}
                    appAccountStoreUrl={appAccountStoreUrl}
                    enterAppHref={enterAppHref}
                    onNewRegistration={startNewRegistration}
                />
            ) : (
                <MissionFormBody
                    form={form}
                    options={options}
                    onSubmit={submit}
                    processing={form.processing}
                    formRevision={formRevision}
                />
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
}: {
    churchName: string;
    isMobile: boolean;
    showForm: boolean;
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
                        Cadastro missionário da {churchName}. Preencha todas as etapas e, ao final, você verá a confirmação do
                        envio.
                    </p>
                    <p className="mt-2 text-xs text-red-600 dark:text-red-400">
                        <span className="font-semibold">*</span> Obrigatória
                    </p>
                </>
            ) : (
                <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                    Cadastro missionário da {churchName}.
                </p>
            )}
        </header>
    );
}
