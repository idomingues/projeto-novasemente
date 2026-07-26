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
        if (!term) return ministries;
        return ministries.filter(
            (m) =>
                m.name.toLowerCase().includes(term) ||
                (m.description ?? '').toLowerCase().includes(term),
        );
    }, [ministries, q]);

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
        return (
            <MobileLayout>
                <Head title={`NS Whats — ${selectedMinistry.name}`} />
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
                            className={`w-full cursor-pointer rounded-xl border px-4 py-3 text-left ${
                                recipientId === ''
                                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40'
                                    : 'border-zinc-200 dark:border-zinc-700'
                            }`}
                        >
                            <div className="font-semibold text-zinc-900 dark:text-white">Enviar para o departamento</div>
                            <p className="mt-1 text-xs text-zinc-500">
                                Sem escolher pessoa — qualquer líder autorizado poderá assumir e responder.
                            </p>
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
                                        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Líderes</p>
                                        {filteredLeaders.map((l) => (
                                            <button
                                                key={`leader-${l.id}`}
                                                type="button"
                                                onClick={() => selectPerson(l.id)}
                                                className={`flex w-full cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-left ${
                                                    recipientId === l.id
                                                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40'
                                                        : 'border-zinc-200 dark:border-zinc-700'
                                                }`}
                                            >
                                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 text-sm font-semibold dark:bg-zinc-800">
                                                    {l.name.slice(0, 2).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-zinc-900 dark:text-white">{l.name}</div>
                                                    <div className="text-xs text-zinc-500">Líder de {selectedMinistry.name}</div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                ) : null}

                                {filteredMembers.length > 0 ? (
                                    <div className="space-y-2">
                                        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Membros do departamento</p>
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
                                                    <div className="text-xs text-zinc-500">Membro de {selectedMinistry.name}</div>
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
        <MobileLayout>
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

                <div className="grid grid-cols-2 gap-3">
                    {filtered.map((m) => {
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
