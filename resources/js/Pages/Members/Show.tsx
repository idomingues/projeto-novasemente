import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link } from '@inertiajs/react';
import { activeInactivePillClass } from '@/lib/statusBadges';
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
    is_volunteer?: boolean;
    role_label?: string | null;
    created_at: string;
}

interface Props {
    member: Member;
}

export default function Show({ member }: Props) {
    return (
        <AdminLayout>
            <Head title={`Usuário - ${member.name}`} />

            <PageHeader title="Detalhes do usuário">
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
                            <span className={`mt-1 ${activeInactivePillClass(member.status === 'active')}`}>
                                {member.status === 'active' ? 'Ativo' : 'Inativo'}
                            </span>
                        </div>

                        <div>
                            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Perfil de acesso</p>
                            <p className="text-sm text-zinc-300 mt-1">{member.role_label ?? '—'}</p>
                        </div>

                        <div>
                            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Voluntário</p>
                            <p className="text-sm text-zinc-300 mt-1">{member.is_volunteer ? 'Sim' : 'Não'}</p>
                        </div>
                    </div>
                </div>

                {member.address?.trim() ? (
                    <div className="mt-8">
                        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Morada</p>
                        <p className="text-sm text-zinc-300 mt-1 whitespace-pre-line">{member.address}</p>
                    </div>
                ) : null}

                <p className="mt-8 text-xs text-zinc-500">
                    Cadastrado em {new Date(member.created_at).toLocaleDateString()}
                </p>
            </Card>
        </AdminLayout>
    );
}

