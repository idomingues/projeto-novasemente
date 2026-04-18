import AdminLayout from '@/Layouts/AdminLayout';
import FlashMessages from '@/Components/FlashMessages';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PageHeader from '@/Components/PageHeader';
import PrimaryButton from '@/Components/PrimaryButton';
import SelectInput from '@/Components/SelectInput';
import { Head, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';

type HandlerOption = { value: number; label: string };

type Props = {
    solicitationsHandlerVolunteerId: number | null;
    solicitationsHandlerOptions: HandlerOption[];
    updateSolicitationsHandlerUrl: string;
};

export default function SettingsIndex({
    solicitationsHandlerVolunteerId,
    solicitationsHandlerOptions,
    updateSolicitationsHandlerUrl,
}: Props) {
    const form = useForm({
        solicitations_handler_volunteer_id:
            solicitationsHandlerVolunteerId != null ? String(solicitationsHandlerVolunteerId) : '',
    });

    const submitHandler: FormEventHandler = (e) => {
        e.preventDefault();
        form.put(updateSolicitationsHandlerUrl, { preserveScroll: true });
    };

    return (
        <AdminLayout>
            <Head title="Configurações" />
            <FlashMessages />
            <PageHeader title="Configurações" />

            <div className="max-w-2xl space-y-8">
                <section className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-6 shadow-sm">
                    <h2 className="text-base font-semibold text-zinc-900 dark:text-white">Atendimento</h2>
                    <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                        Defina o <strong>líder de ministério</strong> que recebe notificações no painel e por e-mail quando um
                        membro envia um pedido formal (batismo, apresentação de bebé, visita pastoral, etc.). A pessoa
                        escolhida deve ter o papel «líder de ministério» e conta na app — aparece na lista abaixo.
                    </p>
                    <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-500">
                        Quem já tinha acesso ao atendimento por permissões (admin, secretaria, pastor, outros líderes) mantém o
                        acesso; este contacto é o responsável principal para alertas de novos pedidos.
                    </p>

                    <form onSubmit={submitHandler} className="mt-6 space-y-4">
                        <div>
                            <InputLabel htmlFor="solicitations_handler_volunteer_id" value="Responsável pelas solicitações" />
                            <SelectInput
                                id="solicitations_handler_volunteer_id"
                                className="mt-1 block w-full"
                                value={form.data.solicitations_handler_volunteer_id}
                                onChange={(e) => form.setData('solicitations_handler_volunteer_id', e.target.value)}
                            >
                                <option value="">— Nenhum (sem e-mail automático para novos pedidos) —</option>
                                {solicitationsHandlerOptions.map((o) => (
                                    <option key={o.value} value={String(o.value)}>
                                        {o.label}
                                    </option>
                                ))}
                            </SelectInput>
                            <InputError message={form.errors.solicitations_handler_volunteer_id} className="mt-1" />
                            {solicitationsHandlerOptions.length === 0 && (
                                <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
                                    Nenhum líder de ministério com serviço nesta igreja encontrado. Atribua o papel e
                                    ministérios ao utilizador em Voluntários / utilizadores.
                                </p>
                            )}
                        </div>
                        <div className="flex justify-end">
                            <PrimaryButton type="submit" disabled={form.processing}>
                                Salvar
                            </PrimaryButton>
                        </div>
                    </form>
                </section>
            </div>
        </AdminLayout>
    );
}
