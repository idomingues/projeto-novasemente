import AdminLayout from '@/Layouts/AdminLayout';
import PageHeader from '@/Components/PageHeader';
import FlashMessages from '@/Components/FlashMessages';
import AddButton from '@/Components/AddButton';
import Modal from '@/Components/Modal';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import { Head, Link, useForm } from '@inertiajs/react';
import { FormEventHandler, useState } from 'react';

interface Category {
    id: number;
    name: string;
    sort_order: number;
    is_active: boolean;
}

interface Props {
    categories: Category[];
}

export default function SharedTalentAdminCategories({ categories }: Props) {
    const [open, setOpen] = useState(false);
    const { data, setData, post, processing, reset } = useForm({ name: '', sort_order: '99' });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('shared-talents.admin.categories.store'), {
            onSuccess: () => {
                setOpen(false);
                reset();
            },
        });
    };

    return (
        <AdminLayout>
            <Head title="Categorias — Doar Talentos" />
            <FlashMessages />
            <PageHeader
                lead={
                    <Link href={route('shared-talents.admin.dashboard')} className="text-sm text-brand-600">
                        ← Voltar
                    </Link>
                }
                title="Categorias"
                actions={
                    <AddButton variant="icon" onClick={() => setOpen(true)}>
                        Nova categoria
                    </AddButton>
                }
            />
            <ul className="divide-y rounded-xl border dark:divide-zinc-800 dark:border-zinc-800">
                {categories.map((cat) => (
                    <li key={cat.id} className="flex justify-between px-4 py-3">
                        <span className={cat.is_active ? '' : 'line-through text-zinc-400'}>{cat.name}</span>
                        <span className="text-xs text-zinc-500">ordem {cat.sort_order}</span>
                    </li>
                ))}
            </ul>
            <Modal show={open} onClose={() => setOpen(false)}>
                <form onSubmit={submit} className="space-y-4 p-6">
                    <InputLabel value="Nome" />
                    <TextInput className="w-full" value={data.name} onChange={(e) => setData('name', e.target.value)} />
                    <InputLabel value="Ordem" />
                    <TextInput
                        type="number"
                        className="w-full"
                        value={data.sort_order}
                        onChange={(e) => setData('sort_order', e.target.value)}
                    />
                    <div className="flex justify-end gap-2">
                        <SecondaryButton type="button" onClick={() => setOpen(false)}>
                            Cancelar
                        </SecondaryButton>
                        <PrimaryButton disabled={processing}>Criar</PrimaryButton>
                    </div>
                </form>
            </Modal>
        </AdminLayout>
    );
}
