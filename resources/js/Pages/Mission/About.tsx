import AdminLayout from '@/Layouts/AdminLayout';
import FlashMessages from '@/Components/FlashMessages';
import MissionAdminTabs from '@/Components/Mission/MissionAdminTabs';
import PageHeader from '@/Components/PageHeader';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import Textarea from '@/Components/Textarea';
import PrimaryButton from '@/Components/PrimaryButton';
import InputError from '@/Components/InputError';
import { Head, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';

type AboutBlock = {
    key: string;
    title: string;
    body: string;
};

interface Props {
    blocks: AboutBlock[];
    canManage: boolean;
}

export default function MissionAboutAdmin({ blocks, canManage }: Props) {
    const { data, setData, put, processing, errors } = useForm({
        blocks: blocks.map((b) => ({ key: b.key, title: b.title, body: b.body })),
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        put(route('mission.content.about.update'));
    };

    const updateBlock = (index: number, field: 'title' | 'body', value: string) => {
        const next = [...data.blocks];
        next[index] = { ...next[index], [field]: value };
        setData('blocks', next);
    };

    return (
        <AdminLayout>
            <Head title="Missão — Quem somos" />
            <FlashMessages />
            <div className="space-y-6">
                <PageHeader
                    title="Missão"
                    subtitle="Edite os três blocos exibidos em Quem somos no app."
                />
                <MissionAdminTabs active="quem-somos" />

                <form onSubmit={submit} className="space-y-6">
                    {data.blocks.map((block, index) => (
                        <section
                            key={block.key}
                            className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
                        >
                            <div className="mb-4">
                                <InputLabel value="Título do bloco" />
                                <TextInput
                                    className="mt-1 w-full"
                                    value={block.title}
                                    onChange={(e) => updateBlock(index, 'title', e.target.value)}
                                    disabled={!canManage}
                                    required
                                />
                                <InputError message={(errors as Record<string, string>)[`blocks.${index}.title`]} />
                            </div>
                            <div>
                                <InputLabel value="Conteúdo" />
                                <Textarea
                                    className="mt-1 w-full"
                                    rows={8}
                                    value={block.body}
                                    onChange={(e) => updateBlock(index, 'body', e.target.value)}
                                    disabled={!canManage}
                                />
                            </div>
                        </section>
                    ))}
                    {canManage ? (
                        <PrimaryButton type="submit" disabled={processing}>
                            Salvar conteúdo
                        </PrimaryButton>
                    ) : null}
                </form>
            </div>
        </AdminLayout>
    );
}
