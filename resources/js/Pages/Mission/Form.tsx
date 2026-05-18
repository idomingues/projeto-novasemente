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
    formRevision?: number;
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

export default function MissionForm({ churchName, options, storeUrl, layout, formRevision }: Props) {
    const isMobile = layout === 'mobile';
    const form = useForm(emptyMissionForm());

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

    const content = (
        <>
            <Head title="Missão" />
            <FlashMessages />
            <FormHeader churchName={churchName} isMobile={isMobile} />
            <MissionFormBody
                form={form}
                options={options}
                onSubmit={submit}
                processing={form.processing}
                formRevision={formRevision}
            />
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

function FormHeader({ churchName, isMobile }: { churchName: string; isMobile: boolean }) {
    return (
        <header className={isMobile ? 'mb-5' : 'mb-8'}>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-3xl">
                Missão
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                Cadastro missionário da {churchName}. Este formulário não coleta automaticamente seu nome ou e-mail — apenas o
                que você preencher abaixo.
            </p>
            <p className="mt-2 text-xs text-red-600 dark:text-red-400">
                <span className="font-semibold">*</span> Obrigatória
            </p>
        </header>
    );
}
