import Checkbox from '@/Components/Checkbox';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import SelectInput from '@/Components/SelectInput';
import TextInput from '@/Components/TextInput';
import Textarea from '@/Components/Textarea';
import { useForm } from '@inertiajs/react';

type CommunicationFormReturn = ReturnType<typeof useForm<CommunicationRequestFormData>>;

export type CommunicationRequestFormData = {
    demand_type: string;
    priority: string;
    event_date: string;
    ministry_id: '' | number;
    preferred_date: string;
    message: string;
    art_channels: string[];
    coverage_event: string;
    coverage_support: string[];
    technical_event: string;
    technical_support: string[];
    attachment_files: File[];
};

type SelectOption = { value: string; label: string };

type Props = {
    form: CommunicationFormReturn;
    demandTypeOptions: SelectOption[];
    priorityOptions: SelectOption[];
    artChannelOptions: SelectOption[];
    coverageSupportOptions: SelectOption[];
    maxAttachments: number;
    ministryOptions: SelectOption[];
    idPrefix?: string;
};

function toggleInList(list: string[], item: string): string[] {
    return list.includes(item) ? list.filter((x) => x !== item) : [...list, item];
}

function MultiCheckboxGroup({
    label,
    options,
    selected,
    onToggle,
    error,
}: {
    label: string;
    options: SelectOption[];
    selected: string[];
    onToggle: (value: string) => void;
    error?: string;
}) {
    return (
        <div className="rounded-xl border border-zinc-200 bg-zinc-50/60 p-3 dark:border-zinc-700 dark:bg-zinc-900/40">
            <InputLabel value={label} />
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {options.map((o) => (
                    <label
                        key={o.value}
                        className="flex cursor-pointer items-start gap-2 rounded-lg px-1 py-0.5 text-sm text-zinc-800 hover:bg-white/80 dark:text-zinc-200 dark:hover:bg-zinc-800/60"
                    >
                        <Checkbox checked={selected.includes(o.value)} onChange={() => onToggle(o.value)} />
                        <span>{o.label}</span>
                    </label>
                ))}
            </div>
            <InputError className="mt-2" message={error} />
        </div>
    );
}

export default function CommunicationRequestFormFields({
    form,
    demandTypeOptions,
    priorityOptions,
    artChannelOptions,
    coverageSupportOptions,
    maxAttachments,
    ministryOptions,
    idPrefix = 'comm',
}: Props) {
    const demandType = form.data.demand_type;

    return (
        <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
                <div>
                    <InputLabel htmlFor={`${idPrefix}_demand_type`} value="Tipo de demanda" />
                    <SelectInput
                        id={`${idPrefix}_demand_type`}
                        value={form.data.demand_type}
                        className="mt-1 block w-full"
                        onChange={(e) => form.setData('demand_type', e.target.value)}
                    >
                        <option value="">Selecione…</option>
                        {demandTypeOptions.map((o) => (
                            <option key={o.value} value={o.value}>
                                {o.label}
                            </option>
                        ))}
                    </SelectInput>
                    <InputError className="mt-2" message={form.errors.demand_type} />
                </div>
                <div>
                    <InputLabel htmlFor={`${idPrefix}_priority`} value="Prioridade" />
                    <SelectInput
                        id={`${idPrefix}_priority`}
                        value={form.data.priority}
                        className="mt-1 block w-full"
                        onChange={(e) => form.setData('priority', e.target.value)}
                    >
                        <option value="">Selecione…</option>
                        {priorityOptions.map((o) => (
                            <option key={o.value} value={o.value}>
                                {o.label}
                            </option>
                        ))}
                    </SelectInput>
                    <InputError className="mt-2" message={form.errors.priority} />
                </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                <div>
                    <InputLabel htmlFor={`${idPrefix}_event_date`} value="Data da programação/evento (opcional)" />
                    <TextInput
                        id={`${idPrefix}_event_date`}
                        type="date"
                        value={form.data.event_date}
                        className="mt-1 block w-full"
                        onChange={(e) => form.setData('event_date', e.target.value)}
                    />
                    <InputError className="mt-2" message={form.errors.event_date} />
                </div>
                <div>
                    <InputLabel htmlFor={`${idPrefix}_ministry_id`} value="Departamento (opcional)" />
                    <SelectInput
                        id={`${idPrefix}_ministry_id`}
                        value={form.data.ministry_id === '' ? '' : String(form.data.ministry_id)}
                        className="mt-1 block w-full"
                        disabled={ministryOptions.length === 0}
                        onChange={(e) => {
                            const v = e.target.value;
                            const id = v === '' ? '' : Number(v);
                            form.setData('ministry_id', id === '' || Number.isNaN(id) ? '' : id);
                        }}
                    >
                        <option value="">
                            {ministryOptions.length === 0
                                ? 'Nenhum departamento vinculado à sua conta'
                                : 'Selecione…'}
                        </option>
                        {ministryOptions.map((o) => (
                            <option key={o.value} value={o.value}>
                                {o.label}
                            </option>
                        ))}
                    </SelectInput>
                    {ministryOptions.length === 0 ? (
                        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                            Peça à secretaria para vincular você a um departamento no cadastro de usuário.
                        </p>
                    ) : null}
                    <InputError className="mt-2" message={form.errors.ministry_id} />
                </div>
            </div>

            <div>
                <InputLabel htmlFor={`${idPrefix}_preferred_date`} value="Prazo desejado (opcional)" />
                <TextInput
                    id={`${idPrefix}_preferred_date`}
                    type="date"
                    value={form.data.preferred_date}
                    className="mt-1 block w-full max-w-xs"
                    onChange={(e) => form.setData('preferred_date', e.target.value)}
                />
                <InputError className="mt-2" message={form.errors.preferred_date} />
            </div>

            {demandType === 'art_creation' ? (
                <MultiCheckboxGroup
                    label="Canal onde será utilizado"
                    options={artChannelOptions}
                    selected={form.data.art_channels}
                    onToggle={(value) => form.setData('art_channels', toggleInList(form.data.art_channels, value))}
                    error={form.errors['art_channels.0'] ?? form.errors.art_channels}
                />
            ) : null}

            {demandType === 'programming_coverage' ? (
                <div className="space-y-4 rounded-xl border border-sky-200/80 bg-sky-50/50 p-4 dark:border-sky-900/50 dark:bg-sky-950/20">
                    <div>
                        <InputLabel htmlFor={`${idPrefix}_coverage_event`} value="Qual programação/evento?" />
                        <TextInput
                            id={`${idPrefix}_coverage_event`}
                            value={form.data.coverage_event}
                            className="mt-1 block w-full"
                            placeholder="Ex.: Culto de domingo, retiro de jovens"
                            onChange={(e) => form.setData('coverage_event', e.target.value)}
                        />
                        <InputError className="mt-2" message={form.errors.coverage_event} />
                    </div>
                    <MultiCheckboxGroup
                        label="Qual apoio precisa?"
                        options={coverageSupportOptions}
                        selected={form.data.coverage_support}
                        onToggle={(value) =>
                            form.setData('coverage_support', toggleInList(form.data.coverage_support, value))
                        }
                        error={form.errors['coverage_support.0'] ?? form.errors.coverage_support}
                    />
                </div>
            ) : null}

            {demandType === 'technical_team' ? (
                <div className="space-y-4 rounded-xl border border-violet-200/80 bg-violet-50/50 p-4 dark:border-violet-900/50 dark:bg-violet-950/20">
                    <div>
                        <InputLabel htmlFor={`${idPrefix}_technical_event`} value="Qual programação/evento?" />
                        <TextInput
                            id={`${idPrefix}_technical_event`}
                            value={form.data.technical_event}
                            className="mt-1 block w-full"
                            placeholder="Ex.: Culto especial, conferência"
                            onChange={(e) => form.setData('technical_event', e.target.value)}
                        />
                        <InputError className="mt-2" message={form.errors.technical_event} />
                    </div>
                    <MultiCheckboxGroup
                        label="Qual apoio precisa?"
                        options={coverageSupportOptions}
                        selected={form.data.technical_support}
                        onToggle={(value) =>
                            form.setData('technical_support', toggleInList(form.data.technical_support, value))
                        }
                        error={form.errors['technical_support.0'] ?? form.errors.technical_support}
                    />
                </div>
            ) : null}

            <div>
                <InputLabel htmlFor={`${idPrefix}_message`} value="Descrição" />
                <Textarea
                    id={`${idPrefix}_message`}
                    value={form.data.message}
                    className="mt-1 block w-full"
                    rows={6}
                    placeholder="Objetivo, público, contexto, referências visuais, textos sugeridos, etc."
                    onChange={(e) => form.setData('message', e.target.value)}
                />
                <InputError className="mt-2" message={form.errors.message} />
            </div>

            <div>
                <InputLabel
                    htmlFor={`${idPrefix}_attachments`}
                    value={`Materiais de apoio (opcional, até ${maxAttachments} arquivos)`}
                />
                <input
                    id={`${idPrefix}_attachments`}
                    type="file"
                    multiple
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip"
                    className="mt-1 block w-full text-sm text-zinc-600 file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-900 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white dark:text-zinc-300 dark:file:bg-zinc-100 dark:file:text-zinc-900"
                    onChange={(e) => {
                        const files = Array.from(e.target.files ?? []).slice(0, maxAttachments);
                        form.setData('attachment_files', files);
                    }}
                />
                {form.data.attachment_files.length > 0 ? (
                    <ul className="mt-2 list-inside list-disc text-xs text-zinc-500 dark:text-zinc-400">
                        {form.data.attachment_files.map((f: File) => (
                            <li key={`${f.name}-${f.size}`}>{f.name}</li>
                        ))}
                    </ul>
                ) : (
                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                        Logos, fotos, referências, textos (imagens, PDF, Office, ZIP).
                    </p>
                )}
                <InputError className="mt-2" message={form.errors['attachment_files.0'] ?? form.errors.attachment_files} />
            </div>
        </div>
    );
}
