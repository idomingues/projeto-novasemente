import FlashMessages from '@/Components/FlashMessages';
import MissionFormBody, { type MissionFormData, type MissionOptions } from '@/Components/Mission/MissionFormBody';
import MobileLayout from '@/Layouts/MobileLayout';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';

interface Props {
    churchName: string;
    options: MissionOptions;
    storeUrl: string;
    layout: 'mobile' | 'default';
}

function emptyForm(fromMobile: boolean): MissionFormData {
    return {
        from_mobile: fromMobile,
        photo_file: null,
        full_name: '',
        email: '',
        birth_date: '',
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
        seeks_in_community: [],
        seeks_in_community_other: '',
        studied_bible: '',
        studied_bible_structured: null,
        first_time_nova_semente: null,
        first_contact_via: '',
        first_contact_via_other: '',
        wants_bible_study_partner: '',
        if_not_how_long: '',
        insight_duration: '',
        participated_groups: [],
        participated_groups_other: '',
        engagement_level: '',
        closer_to_god_text: '',
        belonging_people: '',
        belonging_location: '',
        belonging_availability: '',
        belonging_spirituality: '',
        social_actions_interest: '',
        profile_type: '',
        ministry_preference: '',
        social_action_type: '',
        weekday_availability: '',
        time_per_week: '',
        work_preference: '',
        can_contact_week: null,
        contact_period: '',
        contact_format: '',
        nps_score: '',
        lgpd_consent: false,
    };
}

export default function MissionForm({ churchName, options, storeUrl, layout }: Props) {
    const isMobile = layout === 'mobile';
    const form = useForm(emptyForm(isMobile));

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        const payload = { ...form.data };
        if (payload.profession === 'Outro' && payload.profession_other.trim()) {
            payload.profession = payload.profession_other.trim();
        }
        form.transform(() => payload);
        form.post(storeUrl, {
            forceFormData: true,
            preserveScroll: true,
            onFinish: () => form.transform((d) => d),
        });
    };

    const content = (
        <>
            <Head title="Missão" />
            <FlashMessages />
            <FormHeader churchName={churchName} isMobile={isMobile} />
            <MissionFormBody form={form} options={options} onSubmit={submit} processing={form.processing} />
        </>
    );

    if (isMobile) {
        return <MobileLayout>{content}</MobileLayout>;
    }

    return (
        <AdminLayout>
            <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">{content}</div>
        </AdminLayout>
    );
}

function FormHeader({ churchName, isMobile }: { churchName: string; isMobile: boolean }) {
    return (
        <div className={isMobile ? 'mb-6' : 'mb-8'}>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Missão — Insight e Inflexão</h1>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                Cadastro missionário da {churchName}. Preencha com calma; você pode avançar por etapas.
            </p>
        </div>
    );
}
