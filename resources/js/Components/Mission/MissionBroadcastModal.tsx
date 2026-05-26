import Checkbox from '@/Components/Checkbox';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import Modal from '@/Components/Modal';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import TextInput from '@/Components/TextInput';
import Textarea from '@/Components/Textarea';
import { type MissionRosterFilters, missionVolunteersQuery } from '@/utils/missionRosterFilters';
import { useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';

type Props = {
    show: boolean;
    onClose: () => void;
    storeUrl: string;
    filteredTotal: number;
    filters: MissionRosterFilters;
};

export default function MissionBroadcastModal({ show, onClose, storeUrl, filteredTotal, filters }: Props) {
    const rosterQuery = missionVolunteersQuery(filters, filters.search);

    const form = useForm({
        title: '',
        body: '',
        send_email: true,
        send_app: true,
        ...rosterQuery,
    });

    const close = () => {
        form.reset();
        form.clearErrors();
        onClose();
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        form.post(storeUrl, {
            preserveScroll: true,
            onSuccess: () => close(),
        });
    };

    return (
        <Modal show={show} onClose={close} maxWidth="lg">
            <form onSubmit={submit} className="p-6">
                <h2 className="pr-8 text-lg font-semibold text-zinc-900 dark:text-white">Notificar cadastros do filtro</h2>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                    A mensagem será enviada para os <strong>{filteredTotal}</strong> cadastro(s) que aparecem no filtro atual
                    {filters.overdue ? ' (apenas atrasados)' : ''}.
                </p>

                <div className="mt-4 space-y-4">
                    <div>
                        <InputLabel value="Título" />
                        <TextInput
                            className="mt-1 w-full"
                            value={form.data.title}
                            onChange={(e) => form.setData('title', e.target.value)}
                            placeholder="Ex.: Lembrete da equipe Missão"
                            required
                        />
                        <InputError message={form.errors.title} className="mt-1" />
                    </div>
                    <div>
                        <InputLabel value="Mensagem" />
                        <Textarea
                            className="mt-1 w-full"
                            rows={6}
                            value={form.data.body}
                            onChange={(e) => form.setData('body', e.target.value)}
                            placeholder="Escreva a comunicação para os cadastros filtrados…"
                            required
                        />
                        <InputError message={form.errors.body} className="mt-1" />
                    </div>
                    <div className="space-y-2 rounded-xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-900/50">
                        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Canais</p>
                        <label className="flex items-center gap-2 text-sm">
                            <Checkbox
                                checked={form.data.send_email}
                                onChange={(e) => form.setData('send_email', e.target.checked)}
                            />
                            Enviar por e-mail (quando houver e-mail cadastrado)
                        </label>
                        <label className="flex items-center gap-2 text-sm">
                            <Checkbox
                                checked={form.data.send_app}
                                onChange={(e) => form.setData('send_app', e.target.checked)}
                            />
                            Notificação no app (conta com app ativo)
                        </label>
                        <InputError message={form.errors.send_email} className="!mt-1" />
                    </div>
                </div>

                <div className="mt-6 flex flex-wrap justify-end gap-2">
                    <SecondaryButton type="button" onClick={close}>
                        Cancelar
                    </SecondaryButton>
                    <PrimaryButton type="submit" disabled={form.processing || filteredTotal === 0}>
                        {form.processing ? 'Enviando…' : 'Enviar notificação'}
                    </PrimaryButton>
                </div>
            </form>
        </Modal>
    );
}
