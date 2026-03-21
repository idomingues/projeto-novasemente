import MobileLayout from '@/Layouts/MobileLayout';
import { Head, useForm } from '@inertiajs/react';
import { PaperAirplaneIcon } from '@heroicons/react/24/outline';
import PrayerAmenButton from '@/Components/PrayerAmenButton';
import PrayingHandsIcon from '@/Components/PrayingHandsIcon';
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
    prayer_amen_count: number;
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
            <div className="space-y-6 lg:space-y-0">
                <div className="lg:mb-6">
                    <h1 className="text-xl lg:text-2xl font-bold text-zinc-900 dark:text-white">Pedidos de oração</h1>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5 lg:mt-1">
                        Solicite um pedido ou veja os pedidos para orar.
                    </p>
                    <p className="mt-3 rounded-xl border border-brand-200/90 bg-brand-50/90 px-3 py-2.5 text-sm leading-relaxed text-brand-950 dark:border-brand-900/45 dark:bg-brand-950/30 dark:text-brand-50">
                        Depois de orar por alguém, toque em <strong className="font-semibold text-brand-800 dark:text-brand-200">Irei orar</strong> (mãos em oração) no pedido — assim a pessoa sente que não está sozinha. É o nosso jeito de “curtir” com gratidão a Deus.
                    </p>
                </div>

                <div className="lg:grid lg:grid-cols-12 lg:gap-8 lg:items-start">
                    <section className="lg:col-span-4 xl:col-span-3 lg:sticky lg:top-24">
                        <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 sm:p-5 shadow-sm">
                            <h2 className="text-base lg:text-lg font-semibold text-zinc-900 dark:text-white mb-3 lg:mb-4 flex items-center gap-2">
                                <PaperAirplaneIcon className="w-5 h-5 text-primary-500" />
                                Solicitar oração
                            </h2>
                            <form onSubmit={submit} className="space-y-3 lg:space-y-4">
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
                                        rows={4}
                                        className="mt-1 block w-full"
                                        maxLength={2000}
                                    />
                                    <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
                                        {data.request.length}/2000
                                    </p>
                                    <InputError message={errors.request} className="mt-1" />
                                </div>
                                <PrimaryButton type="submit" disabled={processing} className="w-full sm:w-auto">
                                    {processing ? 'A enviar...' : 'Enviar pedido'}
                                </PrimaryButton>
                            </form>
                        </div>
                    </section>

                    <section className="lg:col-span-8 xl:col-span-9 mt-6 lg:mt-0">
                        <h2 className="text-base lg:text-lg font-semibold text-zinc-900 dark:text-white mb-3 lg:mb-4">
                            Pedidos para orar
                        </h2>
                        {groups.length === 0 ? (
                            <div className="rounded-2xl border-2 border-dashed border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-900/50 p-8 sm:p-12 text-center">
                                <PrayingHandsIcon className="mx-auto mb-3 h-12 w-12 text-brand-300 dark:text-brand-700 sm:mb-4 sm:h-14 sm:w-14" />
                                <p className="text-zinc-600 dark:text-zinc-400 font-medium">Nenhum pedido ainda</p>
                                <p className="text-sm text-zinc-500 dark:text-zinc-500 mt-1">
                                    <span className="lg:hidden">Envie o primeiro pedido acima.</span>
                                    <span className="hidden lg:inline">Envie o primeiro pedido usando o formulário ao lado.</span>
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {groups.map(({ label, items }) => (
                                    <div key={label}>
                                        <h3 className="text-xs sm:text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-2 sm:mb-3">
                                            {label}
                                        </h3>
                                        <ul className="space-y-2 sm:space-y-3">
                                            {items.map((r) => (
                                                <li
                                                    key={r.id}
                                                    className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 shadow-sm"
                                                >
                                                    <div className="flex gap-3">
                                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-100 dark:bg-brand-900/35">
                                                            <PrayingHandsIcon className="h-5 w-5 text-brand-600 dark:text-brand-400" />
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <p className="font-semibold text-zinc-900 dark:text-white">
                                                                {r.name_or_nickname}
                                                            </p>
                                                            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap">
                                                                {r.request}
                                                            </p>
                                                            <div className="mt-3">
                                                                <PrayerAmenButton
                                                                    prayerId={r.id}
                                                                    count={r.prayer_amen_count ?? 0}
                                                                />
                                                            </div>
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
            </div>
        </MobileLayout>
    );
}
