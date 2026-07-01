import AdminLayout from '@/Layouts/AdminLayout';
import FlashMessages from '@/Components/FlashMessages';
import PageHeader from '@/Components/PageHeader';
import PrimaryButton from '@/Components/PrimaryButton';
import { Head, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';

type FeatureRow = {
    key: string;
    label: string;
    enabled: boolean;
};

type FeatureGroup = {
    key: string;
    label: string;
    features: FeatureRow[];
};

type Props = {
    churchName: string;
    groups: FeatureGroup[];
    updateUrl: string;
};

export default function AppFeatures({ churchName, groups, updateUrl }: Props) {
    const formFeatureKeys = groups.flatMap((group) => group.features.map((feature) => feature.key));

    const initialEnabled = groups.flatMap((group) =>
        group.features.filter((feature) => feature.enabled).map((feature) => feature.key),
    );

    const form = useForm({
        enabled_features: initialEnabled,
        form_feature_keys: formFeatureKeys,
    });

    const toggleFeature = (key: string, enabled: boolean) => {
        if (enabled) {
            if (!form.data.enabled_features.includes(key)) {
                form.setData('enabled_features', [...form.data.enabled_features, key]);
            }
        } else {
            form.setData(
                'enabled_features',
                form.data.enabled_features.filter((item) => item !== key),
            );
        }
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        form.put(updateUrl, { preserveScroll: true });
    };

    return (
        <AdminLayout>
            <Head title="Funcionalidades do app" />
            <FlashMessages />
            <PageHeader
                title="Funcionalidades do app"
                subtitle={`Ative ou desative o que aparece no app para membros — igreja ${churchName}.`}
            />

            <div className="max-w-2xl space-y-6">
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Funcionalidades desativadas não aparecem no Início, na barra inferior nem no menu Mais para
                    membros. O painel de gestão continua acessível para a equipe.
                </p>

                <form onSubmit={submit} className="space-y-6">
                    {groups.map((group) => (
                        <section
                            key={group.key}
                            className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-700 dark:bg-zinc-900"
                        >
                            <h2 className="text-base font-semibold text-zinc-900 dark:text-white">{group.label}</h2>
                            <ul className="mt-4 space-y-3">
                                {group.features.map((feature) => {
                                    const checked = form.data.enabled_features.includes(feature.key);

                                    return (
                                        <li key={feature.key}>
                                            <label
                                                className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-zinc-200 px-4 py-3 transition hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800/50"
                                            >
                                                <span className="text-sm font-medium text-zinc-900 dark:text-white">
                                                    {feature.label}
                                                </span>
                                                <input
                                                    type="checkbox"
                                                    className="h-5 w-5 shrink-0 cursor-pointer rounded border-zinc-300 text-teal-600 focus:ring-teal-500 dark:border-zinc-600 dark:bg-zinc-800"
                                                    checked={checked}
                                                    onChange={(e) => toggleFeature(feature.key, e.target.checked)}
                                                />
                                            </label>
                                        </li>
                                    );
                                })}
                            </ul>
                        </section>
                    ))}

                    <PrimaryButton type="submit" disabled={form.processing}>
                        Salvar funcionalidades
                    </PrimaryButton>
                </form>
            </div>
        </AdminLayout>
    );
}
