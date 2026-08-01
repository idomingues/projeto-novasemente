import MobileLayout from '@/Layouts/MobileLayout';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { ArrowLeftIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import TextInput from '@/Components/TextInput';
import Textarea from '@/Components/Textarea';
import InputLabel from '@/Components/InputLabel';
import InputError from '@/Components/InputError';
import { FormEventHandler, useEffect, useMemo, useState } from 'react';
import { getMinistryIconByKey } from '@/lib/ministryIcons';

type Ministry = {
    id: number;
    name: string;
    description?: string | null;
    icon?: string | null;
    leaders_count: number;
    members_count?: number;
    i_serve?: boolean;
};

type Person = { id: number; name: string; photo_url?: string | null; role?: string };

interface Props {
    ministries: Ministry[];
    selectedMinistry: Ministry | null;
    leaders: Person[];
    members: Person[];
    storeUrl: string;
    indexUrl: string;
    fallbackMinistryConfigured: boolean;
}

function personCountLabel(leaders: number, members: number): string {
    const parts: string[] = [];
    if (leaders > 0) {
        parts.push(`${leaders} ${leaders === 1 ? 'líder' : 'líderes'}`);
    }
    if (members > 0) {
        parts.push(`${members} ${members === 1 ? 'membro' : 'membros'}`);
    }
    return parts.join(' · ') || 'Departamento';
}

export default function NsWhatsCompose({
    ministries,
    selectedMinistry,
    leaders,
    members = [],
    storeUrl,
    indexUrl,
    fallbackMinistryConfigured,
}: Props) {
    const [q, setQ] = useState('');
    const [personQ, setPersonQ] = useState('');
    const [recipientId, setRecipientId] = useState<number | ''>('');
    const { data, setData, post, processing, errors } = useForm({
        ministry_id: (selectedMinistry?.id ?? '') as number | '',
        recipient_user_id: '' as number | '',
        message: '',
        use_fallback: false as boolean,
    });

    useEffect(() => {
        if (selectedMinistry) {
            setRecipientId('');
            setPersonQ('');
            setData({
                ministry_id: selectedMinistry.id,
                recipient_user_id: '',
                message: data.message,
                use_fallback: false,
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps -- só ao trocar departamento
    }, [selectedMinistry?.id]);

    const filtered = useMemo(() => {
        const term = q.trim().toLowerCase();
        const list = !term
            ? ministries
            : ministries.filter(
                  (m) =>
                      m.name.toLowerCase().includes(term) ||
                      (m.description ?? '').toLowerCase().includes(term),
              );

        return [...list].sort((a, b) => {
            const aServe = Boolean(a.i_serve);
            const bServe = Boolean(b.i_serve);
            if (aServe !== bServe) {
                return aServe ? -1 : 1;
            }
            return a.name.localeCompare(b.name, 'pt-BR');
        });
    }, [ministries, q]);

    const myMinistries = useMemo(() => filtered.filter((m) => Boolean(m.i_serve)), [filtered]);
    const otherMinistries = useMemo(() => filtered.filter((m) => !m.i_serve), [filtered]);

    const filteredLeaders = useMemo(() => {
        const term = personQ.trim().toLowerCase();
        if (!term) return leaders;
        return leaders.filter((p) => p.name.toLowerCase().includes(term));
    }, [leaders, personQ]);

    const filteredMembers = useMemo(() => {
        const term = personQ.trim().toLowerCase();
        if (!term) return members;
        return members.filter((p) => p.name.toLowerCase().includes(term));
    }, [members, personQ]);

    const pickMinistry = (id: number) => {
        router.get(route('mobile.ns-whats.compose'), { ministry: id }, { preserveState: true });
    };

    const selectDepartmentQueue = () => {
        setRecipientId('');
        setData({
            ministry_id: selectedMinistry!.id,
            recipient_user_id: '',
            message: data.message,
            use_fallback: false,
        });
    };

    const selectPerson = (id: number) => {
        setRecipientId(id);
        setData({
            ministry_id: selectedMinistry!.id,
            recipient_user_id: id,
            message: data.message,
            use_fallback: false,
        });
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(storeUrl);
    };

    const submitFallback: FormEventHandler = (e) => {
        e.preventDefault();
        setData('use_fallback', true);
        setTimeout(() => post(storeUrl), 0);
    };

    if (selectedMinistry) {
        const MinistryIcon = getMinistryIconByKey(selectedMinistry.icon ?? null);

        return (
            <MobileLayout flush hideTopbar>
                <Head title={`NS Conecta — ${selectedMinistry.name}`} />
                <div className="mx-auto max-w-lg space-y-4">
                    <Link href={route('mobile.ns-whats.compose')} className="inline-flex cursor-pointer items-center gap-1 text-sm font-medium text-primary-600">
                        <ArrowLeftIcon className="h-4 w-4" /> Departamentos
                    </Link>
                    <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">{selectedMinistry.name}</h1>
                    {selectedMinistry.description ? (
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">{selectedMinistry.description}</p>
                    ) : null}

                    <form onSubmit={submit} className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                        <button
                            type="button"
                            onClick={selectDepartmentQueue}
                            className={`flex w-full cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-left shadow-sm ${
                                recipientId === ''
                                    ? 'border-teal-600 bg-teal-50 ring-1 ring-teal-600/30 dark:border-teal-400 dark:bg-teal-950/50 dark:ring-teal-400/40'
                                    : 'border-teal-300/80 bg-gradient-to-r from-teal-50 to-[#f5f1e9] dark:border-teal-700 dark:from-teal-950/60 dark:to-zinc-900'
                            }`}
                        >
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-700/15 text-teal-800 dark:bg-teal-400/20 dark:text-teal-200">
                                <MinistryIcon className="h-5 w-5" aria-hidden strokeWidth={1.75} />
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-1.5">
                                    <div className="font-semibold text-teal-950 dark:text-teal-50">
                                        Enviar para o departamento
                                    </div>
                                    <span className="rounded-full bg-teal-700 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white dark:bg-teal-400 dark:text-teal-950">
                                        Depto
                                    </span>
                                </div>
                                <p className="mt-1 text-xs text-teal-900/70 dark:text-teal-100/70">
                                    Fila de {selectedMinistry.name} · qualquer líder pode responder
                                </p>
                            </div>
                        </button>

                        {(leaders.length > 0 || members.length > 0) ? (
                            <div className="space-y-3">
                                <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                    Ou escolha alguém específico:
                                </p>
                                {(leaders.length + members.length) > 5 ? (
                                    <label className="relative block">
                                        <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                                        <TextInput
                                            value={personQ}
                                            onChange={(e) => setPersonQ(e.target.value)}
                                            placeholder="Pesquisar líder ou membro"
                                            className="w-full rounded-xl py-2 pl-9"
                                        />
                                    </label>
                                ) : null}

                                {filteredLeaders.length > 0 ? (
                                    <div className="space-y-2">
                                        <p className="text-xs font-bold uppercase tracking-[0.12em] text-teal-800 dark:text-teal-300">
                                            {filteredLeaders.length === 1
                                                ? 'Líder do departamento'
                                                : 'Líderes do departamento'}
                                        </p>
                                        {filteredLeaders.map((l) => (
                                            <button
                                                key={`leader-${l.id}`}
                                                type="button"
                                                onClick={() => selectPerson(l.id)}
                                                className={`flex w-full cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-left shadow-sm ${
                                                    recipientId === l.id
                                                        ? 'border-teal-600 bg-teal-50 ring-1 ring-teal-600/30 dark:border-teal-400 dark:bg-teal-950/50 dark:ring-teal-400/40'
                                                        : 'border-teal-300/80 bg-gradient-to-r from-teal-50 to-[#f5f1e9] dark:border-teal-700 dark:from-teal-950/60 dark:to-zinc-900'
                                                }`}
                                            >
                                                <div className="relative shrink-0">
                                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-700/15 text-sm font-semibold text-teal-900 dark:bg-teal-400/20 dark:text-teal-100">
                                                        {l.name.slice(0, 2).toUpperCase()}
                                                    </div>
                                                    <span
                                                        className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-teal-600 ring-2 ring-white dark:bg-teal-400 dark:ring-zinc-900"
                                                        aria-hidden
                                                    />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex flex-wrap items-center gap-1.5">
                                                        <div className="font-semibold text-teal-950 dark:text-teal-50">
                                                            {l.name}
                                                        </div>
                                                        <span className="rounded-full bg-teal-700 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white dark:bg-teal-400 dark:text-teal-950">
                                                            Líder
                                                        </span>
                                                    </div>
                                                    <div className="text-xs text-teal-900/70 dark:text-teal-100/70">
                                                        Líder do {selectedMinistry.name}
                                                    </div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                ) : null}

                                {filteredMembers.length > 0 ? (
                                    <div className="space-y-2">
                                        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                                            Voluntários do departamento
                                        </p>
                                        {filteredMembers.map((m) => (
                                            <button
                                                key={`member-${m.id}`}
                                                type="button"
                                                onClick={() => selectPerson(m.id)}
                                                className={`flex w-full cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-left ${
                                                    recipientId === m.id
                                                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40'
                                                        : 'border-zinc-200 dark:border-zinc-700'
                                                }`}
                                            >
                                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-50 text-sm font-semibold text-teal-800 dark:bg-teal-950 dark:text-teal-200">
                                                    {m.name.slice(0, 2).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-zinc-900 dark:text-white">{m.name}</div>
                                                    <div className="text-xs text-zinc-500">Voluntário · {selectedMinistry.name}</div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                ) : null}

                                {personQ.trim() && filteredLeaders.length === 0 && filteredMembers.length === 0 ? (
                                    <p className="text-sm text-zinc-500">Nenhuma pessoa encontrada.</p>
                                ) : null}
                            </div>
                        ) : null}

                        <div>
                            <InputLabel htmlFor="msg" value="Mensagem" />
                            <Textarea
                                id="msg"
                                className="mt-1"
                                rows={5}
                                value={data.message}
                                onChange={(e) => setData('message', e.target.value)}
                                required
                                minLength={3}
                                placeholder="Escreva o que gostaria de tratar…"
                            />
                            <InputError message={errors.message} className="mt-1" />
                            <p className="mt-2 text-xs text-zinc-500">
                                {recipientId === ''
                                    ? 'Sua mensagem irá para a fila do departamento.'
                                    : 'Sua mensagem será direcionada à pessoa escolhida.'}
                            </p>
                        </div>

                        <div className="flex gap-2">
                            <SecondaryButton type="button" onClick={() => router.get(route('mobile.ns-whats.compose'))}>
                                Voltar
                            </SecondaryButton>
                            <PrimaryButton type="submit" disabled={processing} className="flex-1 justify-center">
                                Enviar
                            </PrimaryButton>
                        </div>
                        <InputError message={errors.ministry_id || errors.recipient_user_id} />
                    </form>
                </div>
            </MobileLayout>
        );
    }

    return (
        <MobileLayout flush hideTopbar>
            <Head title="Com quem você deseja falar?" />
            <div className="mx-auto max-w-2xl space-y-4">
                <Link href={indexUrl} className="inline-flex cursor-pointer items-center gap-1 text-sm font-medium text-primary-600">
                    <ArrowLeftIcon className="h-4 w-4" /> Conversas
                </Link>
                <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Com quem você deseja falar?</h1>

                <label className="relative block">
                    <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                    <TextInput
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder="Pesquisar departamento ou assunto"
                        className="w-full rounded-xl py-2.5 pl-9"
                    />
                </label>

                <div className="space-y-4">
                    {myMinistries.length > 0 ? (
                        <div className="space-y-2">
                            <p className="text-xs font-bold uppercase tracking-[0.12em] text-teal-800 dark:text-teal-300">
                                Onde eu sirvo
                            </p>
                            {myMinistries.map((m) => {
                                const Icon = getMinistryIconByKey(m.icon ?? null);
                                return (
                                    <button
                                        key={`serve-${m.id}`}
                                        type="button"
                                        onClick={() => pickMinistry(m.id)}
                                        className="flex w-full cursor-pointer items-center gap-3 rounded-2xl border border-teal-300/80 bg-gradient-to-r from-teal-50 to-[#f5f1e9] p-4 text-left shadow-sm dark:border-teal-700 dark:from-teal-950/60 dark:to-zinc-900"
                                    >
                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-700/15 text-teal-800 dark:bg-teal-400/20 dark:text-teal-200">
                                            <Icon className="h-5 w-5" aria-hidden strokeWidth={1.75} />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="font-semibold text-teal-950 dark:text-teal-50">{m.name}</div>
                                            {m.description ? (
                                                <p className="mt-1 line-clamp-2 text-xs text-teal-900/70 dark:text-teal-100/70">
                                                    {m.description}
                                                </p>
                                            ) : null}
                                            <p className="mt-1 text-[11px] text-teal-900/60 dark:text-teal-100/60">
                                                {personCountLabel(m.leaders_count, m.members_count ?? 0)}
                                            </p>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    ) : null}

                    {otherMinistries.length > 0 ? (
                        <div className="space-y-2">
                            {myMinistries.length > 0 ? (
                                <p className="text-xs font-bold uppercase tracking-[0.12em] text-zinc-500 dark:text-zinc-400">
                                    Outros departamentos
                                </p>
                            ) : null}
                            <div className="grid grid-cols-2 gap-3">
                                {otherMinistries.map((m) => {
                                    const Icon = getMinistryIconByKey(m.icon ?? null);
                                    return (
                                        <button
                                            key={m.id}
                                            type="button"
                                            onClick={() => pickMinistry(m.id)}
                                            className="flex cursor-pointer flex-col items-start rounded-2xl border border-zinc-200 bg-white p-4 text-left shadow-sm transition hover:border-emerald-400 dark:border-zinc-800 dark:bg-zinc-900"
                                        >
                                            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
                                                <Icon className="h-5 w-5" />
                                            </div>
                                            <div className="font-semibold text-zinc-900 dark:text-white">{m.name}</div>
                                            {m.description ? (
                                                <p className="mt-1 line-clamp-2 text-xs text-zinc-500">{m.description}</p>
                                            ) : null}
                                            <p className="mt-2 text-[11px] text-zinc-400">
                                                {personCountLabel(m.leaders_count, m.members_count ?? 0)}
                                            </p>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ) : null}
                </div>

                {filtered.length === 0 ? (
                    <p className="py-8 text-center text-sm text-zinc-500">Nenhum departamento localizado.</p>
                ) : null}

                {fallbackMinistryConfigured ? (
                    <form onSubmit={submitFallback} className="rounded-2xl border border-dashed border-zinc-300 p-4 dark:border-zinc-700">
                        <h2 className="font-semibold text-zinc-900 dark:text-white">Não sei com quem falar</h2>
                        <p className="mt-1 text-sm text-zinc-500">Enviaremos para a fila geral configurada pela igreja.</p>
                        <Textarea
                            className="mt-3"
                            rows={3}
                            value={data.message}
                            onChange={(e) => setData('message', e.target.value)}
                            placeholder="Descreva sua dúvida…"
                            required
                            minLength={3}
                        />
                        <PrimaryButton type="submit" disabled={processing} className="mt-3 justify-center">
                            Enviar para a fila geral
                        </PrimaryButton>
                    </form>
                ) : null}
            </div>
        </MobileLayout>
    );
}
