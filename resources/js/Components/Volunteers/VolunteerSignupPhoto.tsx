export default function VolunteerSignupPhoto({
    name,
    photoUrl,
}: {
    name?: string | null;
    photoUrl?: string | null;
}) {
    const title = name?.trim() || 'Voluntário';
    const initial = title.charAt(0).toUpperCase() || '?';

    return (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-zinc-200/90 bg-zinc-50/60 p-4 dark:border-zinc-700 dark:bg-zinc-900/40 sm:flex-row sm:items-center sm:gap-4">
            {photoUrl?.trim() ? (
                <img
                    src={photoUrl}
                    alt={`Foto de ${title}`}
                    className="h-28 w-28 shrink-0 rounded-2xl object-cover shadow-sm ring-2 ring-white dark:ring-zinc-800"
                />
            ) : (
                <div
                    className="flex h-28 w-28 shrink-0 items-center justify-center rounded-2xl bg-zinc-200 text-2xl font-semibold text-zinc-500 ring-2 ring-white dark:bg-zinc-700 dark:text-zinc-400 dark:ring-zinc-800"
                    aria-hidden
                >
                    {initial}
                </div>
            )}
            <div className="min-w-0 text-center sm:text-left">
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Foto do cadastro</p>
                <p className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-300">
                    {photoUrl?.trim()
                        ? 'Foto da conta no app (mesmo cadastro do voluntário).'
                        : 'Sem foto na conta vinculada.'}
                </p>
            </div>
        </div>
    );
}
