import AdminLayout from '@/Layouts/AdminLayout';
import FlashMessages from '@/Components/FlashMessages';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PageHeader from '@/Components/PageHeader';
import PrimaryButton from '@/Components/PrimaryButton';
import SelectInput from '@/Components/SelectInput';
import TextInput from '@/Components/TextInput';
import { Head, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';

type HandlerOption = { value: number; label: string };

type Props = {
    churchName: string;
    solicitationsHandlerVolunteerId: number | null;
    solicitationsHandlerOptions: HandlerOption[];
    updateSolicitationsHandlerUrl: string;
    youtubeLiveUrl: string | null;
    updateYoutubeLiveUrl: string;
    libraryMeditationUrl: string | null;
    updateLibraryMeditationUrl: string;
    libraryLessonUrl: string | null;
    updateLibraryLessonUrl: string;
};

export default function SettingsIndex({
    churchName,
    solicitationsHandlerVolunteerId,
    solicitationsHandlerOptions,
    updateSolicitationsHandlerUrl,
    youtubeLiveUrl,
    updateYoutubeLiveUrl,
    libraryMeditationUrl,
    updateLibraryMeditationUrl,
    libraryLessonUrl,
    updateLibraryLessonUrl,
}: Props) {
    const form = useForm({
        solicitations_handler_volunteer_id:
            solicitationsHandlerVolunteerId != null ? String(solicitationsHandlerVolunteerId) : '',
    });

    const liveForm = useForm({
        youtube_live_url: youtubeLiveUrl ?? '',
    });

    const meditationForm = useForm({
        library_meditation_url: libraryMeditationUrl ?? 'https://mais.cpb.com.br/?post_type=meditacao&p=66895',
    });
    const lessonForm = useForm({
        library_lesson_url: libraryLessonUrl ?? 'https://mais.cpb.com.br/licao/vida-de-oracao-2o-trimestre-2026/',
    });

    const submitHandler: FormEventHandler = (e) => {
        e.preventDefault();
        form.put(updateSolicitationsHandlerUrl, { preserveScroll: true });
    };

    const submitLive: FormEventHandler = (e) => {
        e.preventDefault();
        liveForm.put(updateYoutubeLiveUrl, { preserveScroll: true });
    };

    const submitMeditation: FormEventHandler = (e) => {
        e.preventDefault();
        meditationForm.put(updateLibraryMeditationUrl, { preserveScroll: true });
    };

    const submitLesson: FormEventHandler = (e) => {
        e.preventDefault();
        lessonForm.put(updateLibraryLessonUrl, { preserveScroll: true });
    };

    return (
        <AdminLayout>
            <Head title="Configurações" />
            <FlashMessages />
            <PageHeader title="Configurações" />

            <div className="max-w-2xl space-y-8">
                <section className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-6 shadow-sm">
                    <h2 className="text-base font-semibold text-zinc-900 dark:text-white">Atendimento Pastoral</h2>
                    <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                        Defina o <strong>líder de ministério</strong> que recebe notificações no painel e por e-mail quando um
                        membro envia um pedido formal (batismo, apresentação de bebé, visita pastoral, etc.). A pessoa
                        escolhida deve ter o papel «líder de ministério» e conta na app — aparece na lista abaixo.
                    </p>
                    <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-500">
                        Quem já tinha acesso ao atendimento pastoral por permissões (admin, secretaria, pastor, outros líderes) mantém o
                        acesso; este contato é o responsável principal para alertas de novos pedidos.
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
                                    ministérios ao usuário em Voluntários / usuários.
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

                <section className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-6 shadow-sm">
                    <h2 className="text-base font-semibold text-zinc-900 dark:text-white">App mobile — Culto ao vivo</h2>
                    <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                        Igreja ativa no selector acima: <strong className="text-zinc-900 dark:text-white">{churchName}</strong>.
                        O primeiro cartão na página <strong className="text-zinc-900 dark:text-white">Assistir culto</strong> do
                        app será <strong className="text-zinc-900 dark:text-white">AO VIVO</strong> e abre este link no
                        YouTube (vídeo ou transmissão).
                    </p>
                    <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-500">
                        Formato: link de vídeo ou live (<code className="text-xs">watch?v=…</code>, <code className="text-xs">youtu.be/…</code>,{' '}
                        <code className="text-xs">youtube.com/live/…</code> ou <code className="text-xs">embed/…</code>). Deixe em branco para
                        ocultar o cartão AO VIVO.
                    </p>

                    <form onSubmit={submitLive} className="mt-6 space-y-4">
                        <div>
                            <InputLabel htmlFor="youtube_live_url" value="URL do culto ao vivo (YouTube)" />
                            <TextInput
                                id="youtube_live_url"
                                type="url"
                                className="mt-1 block w-full"
                                value={liveForm.data.youtube_live_url}
                                onChange={(e) => liveForm.setData('youtube_live_url', e.target.value)}
                                placeholder="https://www.youtube.com/watch?v=…"
                            />
                            <InputError message={liveForm.errors.youtube_live_url} className="mt-1" />
                        </div>
                        <div className="flex justify-end">
                            <PrimaryButton type="submit" disabled={liveForm.processing}>
                                Salvar
                            </PrimaryButton>
                        </div>
                    </form>
                </section>

                <section className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-6 shadow-sm">
                    <h2 className="text-base font-semibold text-zinc-900 dark:text-white">App mobile — Biblioteca</h2>
                    <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                        Nas abas <strong>Meditação</strong> e <strong>Lição</strong>, o app abre um único link configurado aqui.
                        Se o site permitir, o app também tenta mostrar o texto dentro do nosso layout (melhor esforço) e mantém o botão
                        para abrir a página original.
                    </p>

                    <div className="mt-6 space-y-6">
                        <form onSubmit={submitMeditation} className="space-y-4">
                            <div>
                                <InputLabel htmlFor="library_meditation_url" value="URL da meditação" />
                                <TextInput
                                    id="library_meditation_url"
                                    type="url"
                                    className="mt-1 block w-full"
                                    value={meditationForm.data.library_meditation_url}
                                    onChange={(e) => meditationForm.setData('library_meditation_url', e.target.value)}
                                    placeholder="https://…"
                                />
                                <InputError message={meditationForm.errors.library_meditation_url} className="mt-1" />
                            </div>
                            <div className="flex justify-end">
                                <PrimaryButton type="submit" disabled={meditationForm.processing}>
                                    Salvar
                                </PrimaryButton>
                            </div>
                        </form>

                        <form onSubmit={submitLesson} className="space-y-4">
                            <div>
                                <InputLabel htmlFor="library_lesson_url" value="URL da lição" />
                                <TextInput
                                    id="library_lesson_url"
                                    type="url"
                                    className="mt-1 block w-full"
                                    value={lessonForm.data.library_lesson_url}
                                    onChange={(e) => lessonForm.setData('library_lesson_url', e.target.value)}
                                    placeholder="https://…"
                                />
                                <InputError message={lessonForm.errors.library_lesson_url} className="mt-1" />
                            </div>
                            <div className="flex justify-end">
                                <PrimaryButton type="submit" disabled={lessonForm.processing}>
                                    Salvar
                                </PrimaryButton>
                            </div>
                        </form>
                    </div>
                </section>
            </div>
        </AdminLayout>
    );
}
