import AdminLayout from '@/Layouts/AdminLayout';
import FlashMessages from '@/Components/FlashMessages';
import MissionAdminTabs from '@/Components/Mission/MissionAdminTabs';
import PageHeader from '@/Components/PageHeader';
import InputLabel from '@/Components/InputLabel';
import Textarea from '@/Components/Textarea';
import PrimaryButton from '@/Components/PrimaryButton';
import InputError from '@/Components/InputError';
import { Head, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';

interface Props {
    whatsappDefaultMessage: string;
    canManage: boolean;
}

export default function MissionSettings({ whatsappDefaultMessage, canManage }: Props) {
    const { data, setData, put, processing, errors } = useForm({
        whatsapp_default_message: whatsappDefaultMessage,
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        put(route('mission.content.settings.update'));
    };

    return (
        <AdminLayout>
            <Head title="Missão — Configuração" />
            <FlashMessages />
            <div className="space-y-6">
                <PageHeader
                    title="Missão"
                    subtitle="Mensagem padrão usada ao enviar WhatsApp a partir da ficha de cadastro."
                />
                <MissionAdminTabs active="configuracao" />

                <form onSubmit={submit} className="space-y-6">
                    <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
                        <div>
                            <InputLabel value="Mensagem padrão para WhatsApp" />
                            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                                Ao enviar mensagem na ficha de um cadastro, o texto começa com «Olá, [nome],» seguido desta
                                mensagem. Você pode ajustar o texto antes de enviar.
                            </p>
                            <Textarea
                                className="mt-3 w-full"
                                rows={8}
                                value={data.whatsapp_default_message}
                                onChange={(e) => setData('whatsapp_default_message', e.target.value)}
                                disabled={!canManage}
                                placeholder="Ex.: estamos entrando em contato da equipe Missão para dar continuidade ao seu cadastro…"
                            />
                            <InputError message={errors.whatsapp_default_message} className="mt-1" />
                        </div>
                    </section>
                    {canManage ? (
                        <PrimaryButton type="submit" disabled={processing}>
                            Salvar configurações
                        </PrimaryButton>
                    ) : null}
                </form>
            </div>
        </AdminLayout>
    );
}
