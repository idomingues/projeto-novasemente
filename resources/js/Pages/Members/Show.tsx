import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link } from '@inertiajs/react';
import Card from '@/Components/Card';
import PageHeader from '@/Components/PageHeader';

interface Member {
    id: number;
    name: string;
    email: string | null;
    phone: string | null;
    birth_date: string | null;
    address: string | null;
    status: 'active' | 'inactive';
    created_at: string;
}

interface Props {
    member: Member;
}

export default function Show({ member }: Props) {
    return (
        <AdminLayout>
            <Head title={`Membro - ${member.name}`} />

            <PageHeader title="Detalhes do Membro">
                <Link
                    href={route('members.index')}
                    className="text-sm font-medium text-zinc-400 hover:text-white transition-colors"
                >
                    Voltar para lista
                </Link>
            </PageHeader>

            <Card>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                        <div>
                            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Nome</p>
                            <p className="text-lg font-semibold text-white mt-1">{member.name}</p>
                        </div>

                        <div>
                            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Email</p>
                            <p className="text-sm text-zinc-300 mt-1">{member.email ?? '-'}</p>
                        </div>

                        <div>
                            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Telefone</p>
                            <p className="text-sm text-zinc-300 mt-1">{member.phone ?? '-'}</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">
                                Data de Nascimento
                            </p>
                            <p className="text-sm text-zinc-300 mt-1">
                                {member.birth_date
                                    ? new Date(member.birth_date).toLocaleDateString()
                                    : '-'}
                            </p>
                        </div>

                        <div>
                            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Status</p>
                            <span
                                className={`inline-flex mt-1 px-3 py-1 text-xs font-semibold rounded-full border ${
                                    member.status === 'active'
                                        ? 'bg-green-950/30 text-green-400 border-green-900/50'
                                        : 'bg-red-950/30 text-red-400 border-red-900/50'
                                }`}
                            >
                                {member.status === 'active' ? 'Ativo' : 'Inativo'}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="mt-8">
                    <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Endereço</p>
                    <p className="text-sm text-zinc-300 mt-1 whitespace-pre-line">
                        {member.address ?? '-'}
                    </p>
                </div>

                <p className="mt-8 text-xs text-zinc-500">
                    Cadastrado em {new Date(member.created_at).toLocaleDateString()}
                </p>
            </Card>
        </AdminLayout>
    );
}

