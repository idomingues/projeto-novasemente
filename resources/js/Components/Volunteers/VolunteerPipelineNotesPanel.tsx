import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import Textarea from '@/Components/Textarea';
import { confirmAction } from '@/utils/confirmDialog';
import {
    applyVolunteerModalFormErrors,
    submitVolunteerModalDelete,
    submitVolunteerModalPost,
    type VolunteerLeaderNoteJson,
} from '@/utils/volunteerPipelineModalSave';
import { TrashIcon } from '@heroicons/react/24/outline';
import { useState, type FormEventHandler } from 'react';

export type { VolunteerLeaderNoteJson as VolunteerPipelineNote };

function formatDateTime(iso: string): string {
    try {
        return new Date(iso).toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
        });
    } catch {
        return iso;
    }
}

type Props = {
    notes: VolunteerLeaderNoteJson[];
    canAddNote: boolean;
    storeNoteUrl: string;
    csrf: string;
    onNotesChange: (notes: VolunteerLeaderNoteJson[]) => void;
    onSuccessMessage?: (message: string) => void;
    /** Recarrega a ficha quando o POST não devolve JSON (ex.: redirect). */
    onRefresh?: () => Promise<void>;
};

export default function VolunteerPipelineNotesPanel({
    notes,
    canAddNote,
    storeNoteUrl,
    csrf,
    onNotesChange,
    onSuccessMessage,
    onRefresh,
}: Props) {
    const [body, setBody] = useState('');
    const [bodyError, setBodyError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [deletingId, setDeletingId] = useState<number | null>(null);

    const submitNote: FormEventHandler = async (e) => {
        e.preventDefault();
        if (!canAddNote || saving) return;
        setBodyError(null);
        setSaving(true);
        try {
            const result = await submitVolunteerModalPost(storeNoteUrl, { body: body.trim() }, csrf);
            if (!result.ok) {
                applyVolunteerModalFormErrors(result.errors, (field, message) => {
                    if (field === 'body') setBodyError(message);
                });
                if (result.message && !result.errors.body) {
                    setBodyError(result.message);
                }
                return;
            }
            setBody('');
            if (result.note) {
                onNotesChange([result.note, ...notes]);
            } else if (onRefresh) {
                await onRefresh();
            }
            onSuccessMessage?.('Anotação registrada.');
        } finally {
            setSaving(false);
        }
    };

    const deleteNote = async (note: VolunteerLeaderNoteJson) => {
        if (!note.destroyUrl || deletingId != null) return;
        const ok = await confirmAction({
            title: 'Excluir anotação?',
            text: 'Esta nota será removida do histórico do voluntário.',
            confirmButtonText: 'Excluir',
            danger: true,
        });
        if (!ok) return;
        setDeletingId(note.id);
        try {
            const result = await submitVolunteerModalDelete(note.destroyUrl, csrf);
            if (!result.ok) {
                return;
            }
            onNotesChange(notes.filter((n) => n.id !== note.id));
            onSuccessMessage?.('Anotação excluída.');
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <div className="space-y-4">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Notas internas da equipe de voluntariado (histórico abaixo).
            </p>
            <ul className="max-h-[min(45vh,320px)] space-y-2 overflow-y-auto text-sm">
                {notes.length === 0 ? (
                    <li className="text-zinc-500">Ainda sem notas.</li>
                ) : (
                    notes.map((n) => (
                        <li
                            key={n.id}
                            className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
                        >
                            <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0 flex-1 text-xs text-zinc-500">
                                    {n.authorName} · {formatDateTime(n.createdAt)}
                                </div>
                                {n.destroyUrl ? (
                                    <button
                                        type="button"
                                        onClick={() => void deleteNote(n)}
                                        disabled={deletingId === n.id}
                                        className="inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:text-red-300 dark:hover:bg-red-950/40"
                                        title="Excluir anotação"
                                        aria-label="Excluir anotação"
                                    >
                                        <TrashIcon className="h-4 w-4" aria-hidden />
                                        {deletingId === n.id ? '…' : 'Excluir'}
                                    </button>
                                ) : null}
                            </div>
                            <div className="mt-1 whitespace-pre-wrap text-zinc-800 dark:text-zinc-200">{n.body}</div>
                        </li>
                    ))
                )}
            </ul>
            {canAddNote ? (
                <form onSubmit={submitNote} className="space-y-2 border-t border-zinc-200 pt-4 dark:border-zinc-700">
                    <InputLabel value="Nova anotação" />
                    <Textarea
                        value={body}
                        onChange={(e) => {
                            setBody(e.target.value);
                            if (bodyError) setBodyError(null);
                        }}
                        rows={4}
                        className="w-full"
                        placeholder="Escreva uma nota visível à equipe de voluntariado…"
                    />
                    <InputError message={bodyError ?? undefined} />
                    <PrimaryButton
                        type="submit"
                        title="Adicionar uma nova anotação interna ao voluntário"
                        disabled={saving || body.trim().length === 0}
                    >
                        {saving ? 'Salvando…' : 'Adicionar nota'}
                    </PrimaryButton>
                </form>
            ) : (
                <p className="border-t border-zinc-200 pt-4 text-xs text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                    Você pode ler as anotações da equipe acima. Apenas quem gere o quadro pode adicionar novas.
                </p>
            )}
        </div>
    );
}
