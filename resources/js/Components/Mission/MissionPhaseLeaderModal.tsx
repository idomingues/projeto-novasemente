import Checkbox from '@/Components/Checkbox';
import Modal from '@/Components/Modal';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import { router } from '@inertiajs/react';
import { useEffect, useState } from 'react';

type PhaseOption = {
    id: number;
    name: string;
};

type MissionUserRow = {
    id: number;
    name: string;
    email: string | null;
    is_phase_leader: boolean;
    mission_phase_ids: number[];
};

type Props = {
    show: boolean;
    onClose: () => void;
    user: MissionUserRow | null;
    phases: PhaseOption[];
    updateUrlPattern: string;
};

function updateUrlFromPattern(pattern: string, userId: number): string {
    return pattern.replace(/\/0(\/|$)/, `/${userId}$1`);
}

export default function MissionPhaseLeaderModal({ show, onClose, user, phases, updateUrlPattern }: Props) {
    const [isPhaseLeader, setIsPhaseLeader] = useState(false);
    const [phaseIds, setPhaseIds] = useState<number[]>([]);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!user) return;
        setIsPhaseLeader(user.is_phase_leader);
        setPhaseIds([...user.mission_phase_ids]);
    }, [user]);

    const togglePhase = (phaseId: number) => {
        setPhaseIds((ids) => (ids.includes(phaseId) ? ids.filter((id) => id !== phaseId) : [...ids, phaseId]));
    };

    const save = () => {
        if (!user) return;
        setSaving(true);
        router.patch(
            updateUrlFromPattern(updateUrlPattern, user.id),
            {
                is_phase_leader: isPhaseLeader,
                mission_phase_ids: phaseIds,
            },
            {
                preserveScroll: true,
                onSuccess: () => onClose(),
                onFinish: () => setSaving(false),
            },
        );
    };

    return (
        <Modal show={show} onClose={onClose} maxWidth="md">
            <div className="p-6">
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Líder de fase</h2>
                {user ? (
                    <>
                        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                            Defina se <span className="font-medium text-zinc-900 dark:text-white">{user.name}</span> lidera
                            alguma fase do quadro Missão. Líderes só alteram cadastros nas fases atribuídas.
                        </p>
                        <p className="mt-1 text-xs text-zinc-500">{user.email ?? 'Sem e-mail'}</p>

                        <label className="mt-5 flex cursor-pointer items-center gap-2 text-sm font-medium text-zinc-800 dark:text-zinc-100">
                            <Checkbox checked={isPhaseLeader} onChange={(e) => setIsPhaseLeader(e.target.checked)} />
                            Líder de fase
                        </label>

                        {isPhaseLeader ? (
                            <div className="mt-4">
                                <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">Fases</div>
                                {phases.length === 0 ? (
                                    <p className="mt-2 text-sm text-amber-600">Cadastre fases antes de atribuir um líder.</p>
                                ) : (
                                    <div className="mt-2 flex flex-wrap gap-2">
                                        {phases.map((phase) => {
                                            const checked = phaseIds.includes(phase.id);

                                            return (
                                                <label
                                                    key={phase.id}
                                                    className={[
                                                        'inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1 text-xs ring-1',
                                                        checked
                                                            ? 'bg-brand-50 ring-brand-300 dark:bg-brand-950/40 dark:ring-brand-700'
                                                            : 'ring-zinc-200 dark:ring-zinc-700',
                                                    ].join(' ')}
                                                >
                                                    <Checkbox checked={checked} onChange={() => togglePhase(phase.id)} />
                                                    {phase.name}
                                                </label>
                                            );
                                        })}
                                    </div>
                                )}
                                {isPhaseLeader && phaseIds.length === 0 && phases.length > 0 ? (
                                    <p className="mt-2 text-xs text-amber-600">Selecione ao menos uma fase.</p>
                                ) : null}
                            </div>
                        ) : null}

                        <div className="mt-6 flex justify-end gap-2">
                            <SecondaryButton type="button" onClick={onClose}>
                                Cancelar
                            </SecondaryButton>
                            <PrimaryButton
                                type="button"
                                onClick={save}
                                disabled={saving || (isPhaseLeader && phaseIds.length === 0 && phases.length > 0)}
                            >
                                Salvar
                            </PrimaryButton>
                        </div>
                    </>
                ) : null}
            </div>
        </Modal>
    );
}
