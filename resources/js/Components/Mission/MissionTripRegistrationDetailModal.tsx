import Modal from '@/Components/Modal';
import SecondaryButton from '@/Components/SecondaryButton';
import UserListAvatar from '@/Components/UserListAvatar';

export type MissionTripRegistrationRow = {
    id: number;
    fullName: string;
    instagram: string | null;
    phone: string;
    email: string;
    hasPassport: boolean;
    hasPassportLabel: string;
    participatedForeignMissionBefore: boolean;
    participatedForeignMissionBeforeLabel: string;
    profession: string;
    professionOther: string | null;
    professionLabel: string;
    createdAt: string | null;
    createdAtLabel: string | null;
};

type Props = {
    registration: MissionTripRegistrationRow;
    onClose: () => void;
};

function DetailRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="grid gap-1 border-b border-zinc-100 py-3 last:border-b-0 dark:border-zinc-800 sm:grid-cols-[11rem_minmax(0,1fr)] sm:gap-4">
            <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{label}</dt>
            <dd className="text-sm text-zinc-900 dark:text-zinc-100">{value || '—'}</dd>
        </div>
    );
}

export default function MissionTripRegistrationDetailModal({ registration, onClose }: Props) {
    return (
        <Modal show onClose={onClose} maxWidth="lg">
            <div className="border-b border-zinc-200 px-5 py-4 dark:border-zinc-800 sm:px-6">
                <div className="flex items-start gap-3">
                    <UserListAvatar name={registration.fullName} size="lg" />
                    <div className="min-w-0">
                        <h2 className="text-lg font-bold text-zinc-900 dark:text-white">{registration.fullName}</h2>
                        <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
                            Inscrito em {registration.createdAtLabel ?? '—'}
                        </p>
                    </div>
                </div>
            </div>

            <div className="max-h-[min(70vh,28rem)] overflow-y-auto px-5 py-2 sm:px-6">
                <dl>
                    <DetailRow label="Nome completo" value={registration.fullName} />
                    <DetailRow label="Instagram" value={registration.instagram ?? ''} />
                    <DetailRow label="Telefone" value={registration.phone} />
                    <DetailRow label="E-mail" value={registration.email} />
                    <DetailRow label="Possui passaporte?" value={registration.hasPassportLabel} />
                    <DetailRow
                        label="Missão no exterior antes?"
                        value={registration.participatedForeignMissionBeforeLabel}
                    />
                    <DetailRow label="Profissão / área" value={registration.professionLabel} />
                </dl>
            </div>

            <div className="border-t border-zinc-200 px-5 py-4 dark:border-zinc-800 sm:px-6">
                <SecondaryButton type="button" onClick={onClose} className="w-full sm:w-auto">
                    Fechar
                </SecondaryButton>
            </div>
        </Modal>
    );
}
