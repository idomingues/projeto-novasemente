import AdminLayout from '@/Layouts/AdminLayout';
import { Head, useForm } from '@inertiajs/react';
import { useState, FormEventHandler } from 'react';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import Textarea from '@/Components/Textarea';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import InputError from '@/Components/InputError';

type VersionRow = {
    id: number;
    version: string;
    releasedAt: string | null;
    notes: string | null;
    createdAt: string | null;
};

interface Props {
    versions: VersionRow[];
    latestVersion?: string | null;
}

export default function AppVersionsIndex({ versions, latestVersion }: Props) {
    const { data, setData, post, processing, errors, reset } = useForm({
        version: '',
        released_at: '',
        notes: '',
    });

    const [showAllNotes, setShowAllNotes] = useState<Record<number, boolean>>({});

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('app-versions.store'), {
            onSuccess: () => reset(),
        });
    };

    const latest = latestVersion ?? versions[0]?.version ?? null;

    return (
        <AdminLayout>
            <Head title="Versões do App" />
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Versões do App</h1>
                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                        Cadastre novas versões e visualize o histórico (a última fica no topo).
                    </p>
                </div>

                <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
                    <form onSubmit={submit} className="space-y-4">
                        <div>
                            <InputLabel value="Número da versão" />
                            <TextInput
                                value={data.version}
                                onChange={(e) => setData('version', e.target.value)}
                                className="mt-1 block w-full"
                                placeholder="Ex.: 1.2.3"
                            />
                            <InputError message={errors.version} className="mt-1" />
                        </div>

                        <div>
                            <InputLabel value="Data de lançamento (opcional)" />
                            <TextInput
                                type="date"
                                value={data.released_at}
                                onChange={(e) => setData('released_at', e.target.value)}
                                className="mt-1 block w-full"
                            />
                            <InputError message={errors.released_at} className="mt-1" />
                        </div>

                        <div>
                            <InputLabel value="Histórico / notas (opcional)" />
                            <Textarea
                                value={data.notes}
                                onChange={(e) => setData('notes', e.target.value)}
                                rows={5}
                            />
                            <InputError message={errors.notes} className="mt-1" />
                        </div>

                        <div className="flex gap-2">
                            <SecondaryButton
                                type="button"
                                className="flex-1"
                                disabled={processing}
                                onClick={() => reset()}
                            >
                                Limpar
                            </SecondaryButton>
                            <PrimaryButton type="submit" className="flex-1" disabled={processing}>
                                Cadastrar versão
                            </PrimaryButton>
                        </div>
                    </form>
                </div>

                <div className="space-y-3">
                    {versions.length === 0 ? (
                        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
                            Nenhuma versão cadastrada ainda.
                        </div>
                    ) : (
                        versions.map((v) => {
                            const isLatest = latest && v.version === latest;
                            const notes = v.notes ?? '';
                            const expanded = !!showAllNotes[v.id];

                            return (
                                <div
                                    key={v.id}
                                    className={`rounded-2xl border p-4 ${
                                        isLatest
                                            ? 'border-zinc-900 dark:border-white/70 bg-zinc-50 dark:bg-zinc-950'
                                            : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900'
                                    }`}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                                <div className="text-sm font-semibold text-zinc-900 dark:text-white truncate">
                                                    Versão {v.version}
                                                </div>
                                                {isLatest && (
                                                    <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-900 dark:text-white rounded-full bg-zinc-100 dark:bg-white/10 px-2 py-1">
                                                        Última
                                                    </span>
                                                )}
                                            </div>
                                            <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                                                Lançamento: {v.releasedAt ? new Date(v.releasedAt).toLocaleDateString('pt-BR') : '—'}
                                            </div>
                                        </div>
                                    </div>

                                    {notes.trim() ? (
                                        <div className="mt-3">
                                            <div className="text-sm text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap">
                                                {expanded ? notes : notes.slice(0, 240) + (notes.length > 240 ? '...' : '')}
                                            </div>
                                            {notes.length > 240 && (
                                                <button
                                                    type="button"
                                                    className="mt-1 text-xs font-semibold text-primary-600 dark:text-primary-400 hover:underline"
                                                    onClick={() => setShowAllNotes((prev) => ({ ...prev, [v.id]: !expanded }))}
                                                >
                                                    {expanded ? 'Mostrar menos' : 'Mostrar mais'}
                                                </button>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">Sem notas.</div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </AdminLayout>
    );
}

