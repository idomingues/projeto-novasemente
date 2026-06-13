import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import { useForm, usePage } from '@inertiajs/react';
import { FormEventHandler } from 'react';

export type MissionTripSignupConfig = {
    storeUrl: string;
    professions: string[];
};

type FormData = {
    full_name: string;
    instagram: string;
    phone: string;
    email: string;
    has_passport: boolean | null;
    participated_foreign_mission_before: boolean | null;
    profession: string;
    profession_other: string;
};

type Props = {
    config: MissionTripSignupConfig;
    variant?: 'page' | 'sidebar';
};

function YesNoField({
    name,
    label,
    value,
    onChange,
    error,
}: {
    name: string;
    label: string;
    value: boolean | null;
    onChange: (v: boolean) => void;
    error?: string;
}) {
    const options: { label: string; value: boolean }[] = [
        { label: 'Sim', value: true },
        { label: 'Não', value: false },
    ];

    return (
        <div>
            <InputLabel value={label} />
            <div className="mt-2 space-y-1.5" role="radiogroup" aria-label={label}>
                {options.map((opt) => {
                    const selected = value === opt.value;
                    return (
                        <button
                            key={`${name}-${opt.label}`}
                            type="button"
                            role="radio"
                            aria-checked={selected}
                            onClick={() => onChange(opt.value)}
                            className={[
                                'flex w-full cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors sm:px-4 sm:py-3',
                                selected
                                    ? 'border-teal-500/80 bg-teal-50/90 ring-1 ring-teal-500/30 dark:border-teal-500/50 dark:bg-teal-950/40'
                                    : 'border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50/80 dark:border-zinc-700 dark:hover:border-zinc-600 dark:hover:bg-zinc-800/50',
                            ].join(' ')}
                        >
                            <span
                                className={[
                                    'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2',
                                    selected
                                        ? 'border-teal-600 dark:border-teal-400'
                                        : 'border-zinc-300 dark:border-zinc-600',
                                ].join(' ')}
                                aria-hidden
                            >
                                {selected ? (
                                    <span className="h-2.5 w-2.5 rounded-full bg-teal-600 dark:bg-teal-400" />
                                ) : null}
                            </span>
                            <span className="text-zinc-800 dark:text-zinc-100">{opt.label}</span>
                        </button>
                    );
                })}
            </div>
            {error ? <InputError message={error} className="mt-1" /> : null}
        </div>
    );
}

export default function MissionTripSignupForm({ config, variant = 'page' }: Props) {
    const authUser = (usePage().props as { auth?: { user?: { name?: string; email?: string; phone?: string | null } | null } })
        .auth?.user;

    const { data, setData, post, processing, errors } = useForm<FormData>({
        full_name: authUser?.name ?? '',
        instagram: '',
        phone: authUser?.phone ?? '',
        email: authUser?.email ?? '',
        has_passport: null,
        participated_foreign_mission_before: null,
        profession: '',
        profession_other: '',
    });

    const isComplete =
        data.full_name.trim() !== '' &&
        data.phone.trim() !== '' &&
        data.email.trim() !== '' &&
        data.has_passport !== null &&
        data.participated_foreign_mission_before !== null &&
        data.profession !== '' &&
        (data.profession !== 'Outro' || data.profession_other.trim() !== '');

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        if (!isComplete) {
            return;
        }

        post(config.storeUrl, {
            preserveScroll: true,
        });
    };

    const isSidebar = variant === 'sidebar';

    return (
        <form onSubmit={submit} className="space-y-4">
            <div>
                <InputLabel htmlFor="trip-full_name" value="Nome completo" />
                <TextInput
                    id="trip-full_name"
                    className="mt-1 block w-full"
                    value={data.full_name}
                    onChange={(e) => setData('full_name', e.target.value)}
                    required
                    autoComplete="name"
                />
                <InputError message={errors.full_name} className="mt-1" />
            </div>

            <div>
                <InputLabel htmlFor="trip-instagram" value="Instagram" />
                <TextInput
                    id="trip-instagram"
                    className="mt-1 block w-full"
                    value={data.instagram}
                    onChange={(e) => setData('instagram', e.target.value)}
                    placeholder="@usuario"
                    autoComplete="off"
                />
                <InputError message={errors.instagram} className="mt-1" />
            </div>

            <div className={isSidebar ? 'space-y-4' : 'grid gap-4 sm:grid-cols-2'}>
                <div>
                    <InputLabel htmlFor="trip-phone" value="Telefone" />
                    <TextInput
                        id="trip-phone"
                        type="tel"
                        className="mt-1 block w-full"
                        value={data.phone}
                        onChange={(e) => setData('phone', e.target.value)}
                        required
                        autoComplete="tel"
                    />
                    <InputError message={errors.phone} className="mt-1" />
                </div>
                <div>
                    <InputLabel htmlFor="trip-email" value="E-mail" />
                    <TextInput
                        id="trip-email"
                        type="email"
                        className="mt-1 block w-full"
                        value={data.email}
                        onChange={(e) => setData('email', e.target.value)}
                        required
                        autoComplete="email"
                    />
                    <InputError message={errors.email} className="mt-1" />
                </div>
            </div>

            <YesNoField
                name="has_passport"
                label="Possui passaporte?"
                value={data.has_passport}
                onChange={(v) => setData('has_passport', v)}
                error={errors.has_passport}
            />

            <YesNoField
                name="participated_foreign_mission_before"
                label="Já participou de missão no exterior anteriormente?"
                value={data.participated_foreign_mission_before}
                onChange={(v) => setData('participated_foreign_mission_before', v)}
                error={errors.participated_foreign_mission_before}
            />

            <div>
                <InputLabel value="Profissão / área de atuação" />
                <div className="mt-2 space-y-1.5" role="radiogroup" aria-label="Profissão / área de atuação">
                    {config.professions.map((profession) => {
                        const selected = data.profession === profession;
                        return (
                            <button
                                key={profession}
                                type="button"
                                role="radio"
                                aria-checked={selected}
                                onClick={() => setData('profession', profession)}
                                className={[
                                    'flex w-full cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors sm:px-4 sm:py-3',
                                    selected
                                        ? 'border-teal-500/80 bg-teal-50/90 ring-1 ring-teal-500/30 dark:border-teal-500/50 dark:bg-teal-950/40'
                                        : 'border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50/80 dark:border-zinc-700 dark:hover:border-zinc-600 dark:hover:bg-zinc-800/50',
                                ].join(' ')}
                            >
                                <span
                                    className={[
                                        'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2',
                                        selected
                                            ? 'border-teal-600 dark:border-teal-400'
                                            : 'border-zinc-300 dark:border-zinc-600',
                                    ].join(' ')}
                                    aria-hidden
                                >
                                    {selected ? (
                                        <span className="h-2.5 w-2.5 rounded-full bg-teal-600 dark:bg-teal-400" />
                                    ) : null}
                                </span>
                                <span className="text-zinc-800 dark:text-zinc-100">{profession}</span>
                            </button>
                        );
                    })}
                </div>
                {data.profession === 'Outro' ? (
                    <div className="mt-2">
                        <TextInput
                            className="w-full"
                            value={data.profession_other}
                            onChange={(e) => setData('profession_other', e.target.value)}
                            placeholder="Especifique"
                            required
                        />
                    </div>
                ) : null}
                <InputError message={errors.profession} className="mt-1" />
                <InputError message={errors.profession_other} className="mt-1" />
            </div>

            <PrimaryButton type="submit" disabled={processing || !isComplete} className="w-full sm:w-auto">
                {processing ? 'Enviando…' : 'Enviar inscrição'}
            </PrimaryButton>
        </form>
    );
}
