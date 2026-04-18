import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link, router, useForm } from '@inertiajs/react';
import PageHeader from '@/Components/PageHeader';
import Card from '@/Components/Card';
import PrimaryButton from '@/Components/PrimaryButton';
import SelectInput from '@/Components/SelectInput';
import InputLabel from '@/Components/InputLabel';
import { StarIcon } from '@heroicons/react/24/solid';
import { StarIcon as StarOutlineIcon } from '@heroicons/react/24/outline';

interface MinistryRef {
    id: number;
    name: string;
}

interface Signals {
    memberNs: boolean;
    sixMonthsInChurchOrLetter: boolean;
    ministryExperienceDeclared: boolean;
    notes: string;
}

interface CriterionRow {
    id: number;
    label: string;
    checked: boolean;
    checkedAt: string | null;
    toggleUrl: string;
}

interface Props {
    ministry: MinistryRef;
    volunteer: {
        id: number;
        name: string | null;
        email: string | null;
        phone: string | null;
        piiMasked: boolean;
        active: boolean;
        memberName?: string | null;
        signals: Signals;
        clearanceStatus: string;
    };
    criteria: CriterionRow[];
    boardUrl: string;
    updateClearanceUrl: string;
}

function SignalPill({ ok, label }: { ok: boolean; label: string }) {
    return (
        <div
            className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                ok
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100'
                    : 'border-zinc-200 bg-zinc-50 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400'
            }`}
        >
            {ok ? <StarIcon className="h-4 w-4 text-amber-500 shrink-0" aria-hidden /> : <StarOutlineIcon className="h-4 w-4 shrink-0 opacity-50" aria-hidden />}
            {label}
        </div>
    );
}

export default function Show({ ministry, volunteer, criteria, boardUrl, updateClearanceUrl }: Props) {
    const clearanceForm = useForm({
        clearance_status: volunteer.clearanceStatus,
    });

    const submitClearance = () => {
        clearanceForm.patch(updateClearanceUrl, { preserveScroll: true });
    };

    const toggleCriterion = (c: CriterionRow) => {
        router.post(c.toggleUrl, {}, { preserveScroll: true });
    };

    return (
        <AdminLayout>
            <Head title={`${volunteer.name ?? 'Voluntário'} — ${ministry.name}`} />
            <div className="mb-4">
                <Link href={boardUrl} className="text-sm font-medium text-primary-600 hover:underline dark:text-primary-400">
                    ← {ministry.name}
                </Link>
            </div>
            <PageHeader title={volunteer.name ?? 'Voluntário'} subtitle={ministry.name} />

            {volunteer.piiMasked ? (
                <p className="mb-4 text-xs text-amber-800 dark:text-amber-200">
                    Contactos parcialmente ocultos (visão líder). A secretaria vê os dados completos no cadastro global.
                </p>
            ) : null}

            <div className="grid gap-4 lg:grid-cols-2">
                <Card>
                    <h3 className="text-sm font-semibold text-zinc-900 dark:text-white mb-2">Dados resumidos</h3>
                    <dl className="space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
                        <div>
                            <dt className="text-xs font-medium text-zinc-500">E-mail</dt>
                            <dd>{volunteer.email ?? '—'}</dd>
                        </div>
                        <div>
                            <dt className="text-xs font-medium text-zinc-500">Telefone</dt>
                            <dd>{volunteer.phone ?? '—'}</dd>
                        </div>
                        {volunteer.memberName ? (
                            <div>
                                <dt className="text-xs font-medium text-zinc-500">Membro (ficha)</dt>
                                <dd>{volunteer.memberName}</dd>
                            </div>
                        ) : null}
                        <div>
                            <dt className="text-xs font-medium text-zinc-500">Ativo (cadastro)</dt>
                            <dd>{volunteer.active ? 'Sim' : 'Não'}</dd>
                        </div>
                    </dl>
                </Card>

                <Card>
                    <h3 className="text-sm font-semibold text-zinc-900 dark:text-white mb-2">Sinais automáticos (referência)</h3>
                    <div className="flex flex-wrap gap-2">
                        <SignalPill ok={volunteer.signals.memberNs} label="Membro NS (cadastro)" />
                        <SignalPill ok={volunteer.signals.sixMonthsInChurchOrLetter} label="≥ 6 meses como membro (registo)" />
                        <SignalPill ok={volunteer.signals.ministryExperienceDeclared} label="Experiência em ministério (declarado)" />
                    </div>
                    <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">{volunteer.signals.notes}</p>
                </Card>
            </div>

            <Card className="mt-4">
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-white mb-3">Critérios do ministério (marcar manualmente)</h3>
                {criteria.length === 0 ? (
                    <p className="text-sm text-zinc-500">Defina critérios no quadro do ministério.</p>
                ) : (
                    <ul className="space-y-2">
                        {criteria.map((c) => (
                            <li key={c.id} className="rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-700">
                                <button
                                    type="button"
                                    onClick={() => toggleCriterion(c)}
                                    className="flex w-full items-center gap-2 text-left text-sm font-medium text-zinc-900 dark:text-white"
                                >
                                    {c.checked ? (
                                        <StarIcon className="h-5 w-5 text-amber-500 shrink-0" aria-hidden />
                                    ) : (
                                        <StarOutlineIcon className="h-5 w-5 text-zinc-400 shrink-0" aria-hidden />
                                    )}
                                    {c.label}
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </Card>

            <Card className="mt-4">
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-white mb-3">Liberação para servir neste ministério</h3>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                    <div className="flex-1">
                        <InputLabel htmlFor="clearance_status" value="Estado" />
                        <SelectInput
                            id="clearance_status"
                            className="mt-1"
                            value={clearanceForm.data.clearance_status}
                            onChange={(e) => clearanceForm.setData('clearance_status', e.target.value)}
                        >
                            <option value="pending">Pendente</option>
                            <option value="cleared">Liberado</option>
                            <option value="blocked">Bloqueado</option>
                        </SelectInput>
                    </div>
                    <PrimaryButton type="button" onClick={submitClearance} disabled={clearanceForm.processing}>
                        Salvar liberação
                    </PrimaryButton>
                </div>
            </Card>
        </AdminLayout>
    );
}
