import MobileLayout from '@/Layouts/MobileLayout';
import { Head, useForm } from '@inertiajs/react';
import { HeartIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline';
import FlashMessages from '@/Components/FlashMessages';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import Textarea from '@/Components/Textarea';
import PrimaryButton from '@/Components/PrimaryButton';
import InputError from '@/Components/InputError';
import { FormEventHandler } from 'react';

interface PrayerItem {
    id: number;
    name_or_nickname: string;
    request: string;
    created_at: string;
    month_year: string;
}

interface Props {
    requests: PrayerItem[];
}

const MONTH_NAMES: Record<string, string> = {
    '01': 'Janeiro', '02': 'Fevereiro', '03': 'Março', '04': 'Abril', '05': 'Maio', '06': 'Junho',
    '07': 'Julho', '08': 'Agosto', '09': 'Setembro', '10': 'Outubro', '11': 'Novembro', '12': 'Dezembro',
};

function groupByMonthYear(requests: PrayerItem[]): { label: string; key: string; items: PrayerItem[] }[] {
    const map = new Map<string, PrayerItem[]>();
    for (const r of requests) {
        const list = map.get(r.month_year) ?? [];
        list.push(r);
        map.set(r.month_year, list);
    }
    const keys = Array.from(map.keys()).sort((a, b) => b.localeCompare(a));
    return keys.map((key) => {
        const [year, month] = key.split('-');
        const label = `${MONTH_NAMES[month] ?? month} ${year}`;
        return { label, key, items: map.get(key)! };
    });
}

export default function PrayerMobile({ requests }: Props) {
    const { data, setData, post, processing, errors, reset } = useForm({
        name_or_nickname: '',
        request: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('prayer.store'), {
            onSuccess: () => reset(),
            preserveScroll: true,
        });
    };

    const groups = groupByMonthYear(requests);

    return (
        <MobileLayout>
            <Head title="Pedidos de oração" />
            <FlashMessages />
            <div className="space-y-6">
                <div>
                    <h1 className="text-xl font-bold text-zinc-900 dark:text-white">Pedidos de oração</h1>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
                        Solicite um pedido ou veja os pedidos para orar.
                    </p>
                </div>

                <section className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 shadow-sm">
                    <h2 className="font-semibold text-zinc-900 dark:text-white mb-3 flex items-center gap-2">
                        <PaperAirplaneIcon className="w-5 h-5 text-primary-500" />
                        Solicitar oração
                    </h2>
                    <form onSubmit={submit} className="space-y-3">
                        <div>
                            <InputLabel htmlFor="prayer_name" value="Nome, apelido ou codinome" />
                            <TextInput
                                id="prayer_name"
                                value={data.name_or_nickname}
                                onChange={(e) => setData('name_or_nickname', e.target.value)}
                                placeholder="Ex: Maria ou Irmão João"
                                className="mt-1 block w-full"
                                maxLength={255}
                            />
                            <InputError message={errors.name_or_nickname} className="mt-1" />
                        </div>
                        <div>
                            <InputLabel htmlFor="prayer_request" value="Pedido" />
                            <Textarea
                                id="prayer_request"
                                value={data.request}
                                onChange={(e) => setData('request', e.target.value)}
                                placeholder="Escreva o seu pedido..."
                                rows={3}
                                className="mt-1 block w-full"
                                maxLength={2000}
                            />
                            <p className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500">
                                {data.request.length}/2000
                            </p>
                            <InputError message={errors.request} className="mt-1" />
                        </div>
                        <PrimaryButton type="submit" disabled={processing} className="w-full">
                            {processing ? 'A enviar...' : 'Enviar pedido'}
                        </PrimaryButton>
                    </form>
                </section>

                <section>
                    <h2 className="font-semibold text-zinc-900 dark:text-white mb-3">
                        Pedidos para orar
                    </h2>
                    {groups.length === 0 ? (
                        <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-8 text-center">
                            <HeartIcon className="w-12 h-12 text-zinc-300 dark:text-zinc-600 mx-auto mb-3" />
                            <p className="text-zinc-600 dark:text-zinc-400 font-medium">Nenhum pedido ainda</p>
                            <p className="text-sm text-zinc-500 dark:text-zinc-500 mt-1">
                                Envie o primeiro pedido acima.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {groups.map(({ label, items }) => (
                                <div key={label}>
                                    <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-2">
                                        {label}
                                    </h3>
                                    <ul className="space-y-2">
                                        {items.map((r) => (
                                            <li
                                                key={r.id}
                                                className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4"
                                            >
                                                <div className="flex gap-3">
                                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-100 dark:bg-primary-900/30">
                                                        <HeartIcon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="font-semibold text-zinc-900 dark:text-white">
                                                            {r.name_or_nickname}
                                                        </p>
                                                        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap">
                                                            {r.request}
                                                        </p>
                                                    </div>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </div>
        </MobileLayout>
    );
}
