import MobileLayout from '@/Layouts/MobileLayout';
import { Head, useForm } from '@inertiajs/react';
import AddButton from '@/Components/AddButton';
import PageHeader from '@/Components/PageHeader';
import PrayerAmenButton from '@/Components/PrayerAmenButton';
import FlashMessages from '@/Components/FlashMessages';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import Textarea from '@/Components/Textarea';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import InputError from '@/Components/InputError';
import Modal from '@/Components/Modal';
import { FormEventHandler, useState } from 'react';

interface PrayerItem {
    id: number;
    name_or_nickname: string;
    request: string;
    created_at: string;
    month_year: string;
    prayer_amen_count: number;
    active: boolean;
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
    const [createOpen, setCreateOpen] = useState(false);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('prayer.store'), {
            onSuccess: () => {
                reset();
                setCreateOpen(false);
            },
            preserveScroll: true,
        });
    };

    const groups = groupByMonthYear(requests);

    return (
        <MobileLayout>
            <Head title="Pedidos de oração" />
            <FlashMessages />
            <div className="space-y-6 lg:space-y-0">
                <div className="lg:mb-6 space-y-3">
                    <PageHeader
                        title="Pedidos de oração"
                        subtitle="Veja os pedidos e ore por alguém. Obs.: O nome não é divulgado."
                        actions={<AddButton variant="icon" onClick={() => setCreateOpen(true)} title="Novo pedido">Novo pedido</AddButton>}
                    />
                    <p className="rounded-xl border border-brand-200/90 bg-brand-50/90 px-3 py-2.5 text-sm leading-relaxed text-brand-950 dark:border-brand-900/45 dark:bg-brand-950/30 dark:text-brand-50">
                        Clique no ícone <strong className="font-semibold text-brand-800 dark:text-brand-200">Orar</strong> e a pessoa vai saber que tem alguém orando por ela.
                    </p>
                </div>

                <div>
                    <section>
                        {groups.length === 0 ? (
                            <div className="rounded-2xl border-2 border-dashed border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-900/50 p-8 sm:p-12 text-center">
                                <p className="text-zinc-600 dark:text-zinc-400 font-medium">Nenhum pedido ainda</p>
                                <p className="text-sm text-zinc-500 dark:text-zinc-500 mt-1">
                                    Clique no <strong>+</strong> para enviar o primeiro pedido.
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
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                </div>

                <Modal show={createOpen} onClose={() => setCreateOpen(false)}>
                    <form onSubmit={submit} className="p-6">
                        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-5">
                            Novo pedido de oração
                        </h2>
                        <div className="space-y-4">
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
                                    placeholder="Escreva o seu pedido de oração..."
                                    rows={5}
                                    className="mt-1 block w-full"
                                    maxLength={2000}
                                />
                                <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
                                    {data.request.length}/2000
                                </p>
                                <InputError message={errors.request} className="mt-1" />
                            </div>
                        </div>
                        <div className="mt-6 flex justify-end gap-2">
                            <SecondaryButton type="button" onClick={() => setCreateOpen(false)}>
                                Cancelar
                            </SecondaryButton>
                            <PrimaryButton type="submit" disabled={processing}>
                                {processing ? 'A enviar...' : 'Enviar'}
                            </PrimaryButton>
                        </div>
                    </form>
                </Modal>
            </div>
        </MobileLayout>
    );
}
