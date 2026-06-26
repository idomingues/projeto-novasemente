import AdminLayout from '@/Layouts/AdminLayout';
import FlashMessages from '@/Components/FlashMessages';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PageHeader from '@/Components/PageHeader';
import PrimaryButton from '@/Components/PrimaryButton';
import SelectInput from '@/Components/SelectInput';
import TextInput from '@/Components/TextInput';
import NewsPdfFilePicker from '@/Components/News/NewsPdfFilePicker';
import { Head, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';

type HandlerOption = { value: number; label: string };

type Props = {
    churchName: string;
    canEditSolicitationsHandler?: boolean;
    canEditYoutubeLive?: boolean;
    canEditLibraryUrls?: boolean;
    solicitationsHandlerVolunteerId: number | null;
    solicitationsHandlerOptions: HandlerOption[];
    updateSolicitationsHandlerUrl: string;
    youtubeLiveUrl: string | null;
    updateYoutubeLiveUrl: string;
    libraryMeditationUrl: string | null;
    updateLibraryMeditationUrl: string;
    libraryLessonUrl: string | null;
    updateLibraryLessonUrl: string;
    librarySunsetMeditationPdfUrl?: string | null;
    librarySunsetMeditationSegmentCount?: number;
    librarySunsetMeditationYear?: number | null;
    updateLibrarySunsetMeditationUrl?: string;
    canEditTreasurerEmail?: boolean;
    treasurerNotificationEmail: string | null;
    updateTreasurerEmailUrl: string;
    canEditTalentsModeratorEmail?: boolean;
    talentsModeratorNotificationEmail: string | null;
    updateTalentsModeratorEmailUrl: string;
};

export default function SettingsIndex({
    churchName,
    canEditSolicitationsHandler = true,
    canEditYoutubeLive = true,
    canEditLibraryUrls = true,
    solicitationsHandlerVolunteerId,
    solicitationsHandlerOptions,
    updateSolicitationsHandlerUrl,
    youtubeLiveUrl,
    updateYoutubeLiveUrl,
    libraryMeditationUrl,
    updateLibraryMeditationUrl,
    libraryLessonUrl,
    updateLibraryLessonUrl,
    librarySunsetMeditationPdfUrl = null,
    librarySunsetMeditationSegmentCount = 0,
    librarySunsetMeditationYear = null,
    updateLibrarySunsetMeditationUrl = '',
    canEditTreasurerEmail = false,
    treasurerNotificationEmail,
    updateTreasurerEmailUrl,
    canEditTalentsModeratorEmail = false,
    talentsModeratorNotificationEmail,
    updateTalentsModeratorEmailUrl,
}: Props) {
    const form = useForm({
        solicitations_handler_volunteer_id:
            solicitationsHandlerVolunteerId != null ? String(solicitationsHandlerVolunteerId) : '',
    });

    const liveForm = useForm({
        youtube_live_url: youtubeLiveUrl ?? '',
    });

    const meditationForm = useForm({
        library_meditation_url: libraryMeditationUrl ?? 'https://mais.cpb.com.br/meditacoes-diarias/',
    });
    const lessonForm = useForm({
        library_lesson_url: libraryLessonUrl ?? 'https://mais.cpb.com.br/licao/vida-de-oracao-2o-trimestre-2026/',
    });
    const sunsetForm = useForm({
        library_sunset_meditation_pdf_file: null as File | null,
        library_sunset_meditation_year: librarySunsetMeditationYear ?? new Date().getFullYear(),
    });

    const treasurerForm = useForm({
        treasurer_notification_email: treasurerNotificationEmail ?? '',
    });

    const talentsModeratorForm = useForm({
        talents_moderator_notification_email: talentsModeratorNotificationEmail ?? '',
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

    const submitSunsetMeditation: FormEventHandler = (e) => {
        e.preventDefault();
        if (!updateLibrarySunsetMeditationUrl) return;
        if (!sunsetForm.data.library_sunset_meditation_pdf_file && !librarySunsetMeditationPdfUrl) {
            sunsetForm.setError('library_sunset_meditation_pdf_file', 'Envie o arquivo PDF.');
            return;
        }
        if (!sunsetForm.data.library_sunset_meditation_pdf_file) {
            return;
        }
        sunsetForm.post(updateLibrarySunsetMeditationUrl, {
            forceFormData: true,
            preserveScroll: true,
        });
    };

    const submitTreasurer: FormEventHandler = (e) => {
        e.preventDefault();
        treasurerForm.put(updateTreasurerEmailUrl, { preserveScroll: true });
    };

    const submitTalentsModerator: FormEventHandler = (e) => {
        e.preventDefault();
        talentsModeratorForm.put(updateTalentsModeratorEmailUrl, { preserveScroll: true });
    };

    return (
        <AdminLayout>
            <Head title="Configurações" />
            <FlashMessages />
            <PageHeader title="Configurações" />

            <div className="max-w-2xl space-y-8">
                {canEditSolicitationsHandler ? (
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
                ) : null}

                {canEditYoutubeLive ? (
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
                ) : null}

                {canEditTreasurerEmail ? (
                <section className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-6 shadow-sm">
                    <h2 className="text-base font-semibold text-zinc-900 dark:text-white">Doações — e-mail do tesoureiro</h2>
                    <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                        Igreja ativa: <strong className="text-zinc-900 dark:text-white">{churchName}</strong>.
                        A cada doação confirmada em campanhas, enviamos um e-mail automático para este endereço.
                    </p>
                    <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-zinc-600 dark:text-zinc-400">
                        <li>O e-mail inclui: valor, nome do doador (ou «Anônimo») e data.</li>
                        <li>O comprovante <strong>não</strong> vai no e-mail — fica apenas no painel interno.</li>
                        <li>Informe os doadores no app sobre este aviso automático (texto de transparência no fluxo de doação).</li>
                    </ul>
                    <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-500">
                        Deixe em branco para não enviar avisos automáticos por e-mail.
                    </p>

                    <form onSubmit={submitTreasurer} className="mt-6 space-y-4">
                        <div>
                            <InputLabel htmlFor="treasurer_notification_email" value="E-mail do tesoureiro" />
                            <TextInput
                                id="treasurer_notification_email"
                                type="email"
                                className="mt-1 block w-full"
                                value={treasurerForm.data.treasurer_notification_email}
                                onChange={(e) => treasurerForm.setData('treasurer_notification_email', e.target.value)}
                                placeholder="tesoureiro@igreja.org"
                            />
                            <InputError message={treasurerForm.errors.treasurer_notification_email} className="mt-1" />
                        </div>
                        <div className="flex justify-end">
                            <PrimaryButton type="submit" disabled={treasurerForm.processing}>
                                Salvar
                            </PrimaryButton>
                        </div>
                    </form>
                </section>
                ) : null}

                {canEditTalentsModeratorEmail ? (
                <section className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-6 shadow-sm">
                    <h2 className="text-base font-semibold text-zinc-900 dark:text-white">Central de Serviços — e-mail do aprovador</h2>
                    <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                        Igreja ativa: <strong className="text-zinc-900 dark:text-white">{churchName}</strong>.
                        Quando um membro publica um talento ou serviço, enviamos um e-mail para este endereço com o
                        resumo e um link para <strong className="text-zinc-900 dark:text-white">aprovar ou rejeitar</strong> no painel.
                    </p>
                    <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-500">
                        Deixe em branco para não enviar ao e-mail configurado (moderadores com permissão ainda recebem
                        aviso na caixa de entrada do app, se ativado no perfil).
                    </p>

                    <form onSubmit={submitTalentsModerator} className="mt-6 space-y-4">
                        <div>
                            <InputLabel htmlFor="talents_moderator_notification_email" value="E-mail do aprovador" />
                            <TextInput
                                id="talents_moderator_notification_email"
                                type="email"
                                className="mt-1 block w-full"
                                value={talentsModeratorForm.data.talents_moderator_notification_email}
                                onChange={(e) =>
                                    talentsModeratorForm.setData('talents_moderator_notification_email', e.target.value)
                                }
                                placeholder="moderacao@igreja.org"
                            />
                            <InputError message={talentsModeratorForm.errors.talents_moderator_notification_email} className="mt-1" />
                        </div>
                        <div className="flex justify-end">
                            <PrimaryButton type="submit" disabled={talentsModeratorForm.processing}>
                                Salvar
                            </PrimaryButton>
                        </div>
                    </form>
                </section>
                ) : null}

                {canEditLibraryUrls ? (
                <section className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-6 shadow-sm">
                    <h2 className="text-base font-semibold text-zinc-900 dark:text-white">App mobile — Biblioteca</h2>
                    <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                        Nas abas <strong>Meditação</strong>, <strong>Lição</strong> e <strong>Meditação Por do Sol</strong>, o app abre
                        conteúdo configurado aqui. Meditação e Lição usam links externos; Meditação Por do Sol usa o PDF semanal da CPB.
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

                        <form onSubmit={submitSunsetMeditation} className="space-y-4 border-t border-zinc-100 pt-6 dark:border-zinc-800">
                            <div>
                                <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">Meditação Por do Sol</h3>
                                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                                    Envie o PDF anual com uma meditação para cada sexta-feira. O app abre automaticamente a meditação da
                                    próxima sexta-feira e permite escolher outras datas.
                                </p>
                                {librarySunsetMeditationPdfUrl ? (
                                    <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                                        Publicado: {librarySunsetMeditationSegmentCount} meditações
                                        {librarySunsetMeditationYear ? ` (${librarySunsetMeditationYear})` : ''}.{' '}
                                        <a
                                            href={librarySunsetMeditationPdfUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="font-medium text-primary-600 underline-offset-2 hover:underline dark:text-primary-400"
                                        >
                                            Ver PDF atual
                                        </a>
                                    </p>
                                ) : null}
                            </div>
                            <div>
                                <InputLabel htmlFor="library_sunset_meditation_year" value="Ano do material" />
                                <TextInput
                                    id="library_sunset_meditation_year"
                                    type="number"
                                    min={2000}
                                    max={2100}
                                    className="mt-1 block w-full"
                                    value={String(sunsetForm.data.library_sunset_meditation_year ?? '')}
                                    onChange={(e) =>
                                        sunsetForm.setData(
                                            'library_sunset_meditation_year',
                                            e.target.value === '' ? new Date().getFullYear() : Number(e.target.value),
                                        )
                                    }
                                />
                                <InputError message={sunsetForm.errors.library_sunset_meditation_year} className="mt-1" />
                            </div>
                            <NewsPdfFilePicker
                                inputId="library_sunset_meditation_pdf_file"
                                file={sunsetForm.data.library_sunset_meditation_pdf_file}
                                existingUrl={librarySunsetMeditationPdfUrl}
                                error={sunsetForm.errors.library_sunset_meditation_pdf_file}
                                onFileChange={(file) => sunsetForm.setData('library_sunset_meditation_pdf_file', file)}
                            />
                            <div className="flex justify-end">
                                <PrimaryButton type="submit" disabled={sunsetForm.processing}>
                                    {librarySunsetMeditationPdfUrl ? 'Atualizar PDF' : 'Publicar PDF'}
                                </PrimaryButton>
                            </div>
                        </form>
                    </div>
                </section>
                ) : null}
            </div>
        </AdminLayout>
    );
}
