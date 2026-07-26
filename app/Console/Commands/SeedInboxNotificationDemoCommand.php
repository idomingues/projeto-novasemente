<?php

namespace App\Console\Commands;

use App\Models\AppNotification;
use App\Models\User;
use App\Models\UserInboxNotification;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Schema;

class SeedInboxNotificationDemoCommand extends Command
{
    protected $signature = 'ns:seed-inbox-notification-demo
                            {--user= : ID ou e-mail do destinatário (padrão: primeiro admin/super_admin)}
                            {--fresh : Remove demos anteriores com o marcador [DEMO] no título}';

    protected $description = 'Cria notificações de demonstração (ação e informativo) para testar o sino e as telas';

    public function handle(): int
    {
        if (! Schema::hasTable('user_inbox_notifications')) {
            $this->error('Tabela user_inbox_notifications não existe.');

            return self::FAILURE;
        }

        if (! Schema::hasColumn('user_inbox_notifications', 'intent')) {
            $this->error('Coluna intent ainda não existe. Rode: php artisan migrate');

            return self::FAILURE;
        }

        $user = $this->resolveUser();
        if ($user === null) {
            $this->error('Usuário não encontrado. Passe --user=ID ou --user=email');

            return self::FAILURE;
        }

        if ($this->option('fresh')) {
            $deleted = UserInboxNotification::query()
                ->where('user_id', $user->id)
                ->where('title', 'like', '[DEMO]%')
                ->delete();
            $this->info("Removidas {$deleted} notificações [DEMO] anteriores.");
        }

        $samples = $this->samples();
        $created = 0;
        $now = now();

        // Datas intercaladas (ação/info) ao longo de vários dias para testar ordem cronológica.
        $minutesAgo = [12, 45, 90, 180, 60 * 20, 60 * 26, 60 * 30, 60 * 34, 60 * 50, 60 * 55, 60 * 70, 60 * 78, 60 * 100, 60 * 110, 60 * 140, 60 * 150];

        // Insert direto para não disparar push FCM em massa durante o teste de UI.
        foreach ($samples as $i => $sample) {
            $createdAt = $now->copy()->subMinutes($minutesAgo[$i] ?? (($i + 1) * 40));
            \Illuminate\Support\Facades\DB::table('user_inbox_notifications')->insert([
                'user_id' => $user->id,
                'title' => '[DEMO] '.$sample['title'],
                'body' => $sample['body'],
                'intent' => UserInboxNotification::normalizeIntent($sample['intent']),
                'action_url' => $sample['action_url'],
                'read_at' => $sample['read'] ? $createdAt->copy()->addMinutes(2) : null,
                'created_at' => $createdAt,
                'updated_at' => $createdAt,
            ]);
            $created++;
        }

        if (Schema::hasTable('app_notifications') && $user->church_id) {
            $demoTitle = '[DEMO] Nova notícia da igreja';
            AppNotification::query()
                ->where('church_id', $user->church_id)
                ->where('title', $demoTitle)
                ->delete();

            // Sem observer de push: insert direto (broadcast informativo no feed).
            \Illuminate\Support\Facades\DB::table('app_notifications')->insert([
                'church_id' => $user->church_id,
                'title' => $demoTitle,
                'body' => 'Aviso broadcast informativo para toda a igreja (aparece no feed junto com a caixa pessoal).',
                'action_url' => url('/mobile/notifications'),
                'created_by' => $user->id,
                'created_at' => $now->copy()->subMinutes(2),
                'updated_at' => $now->copy()->subMinutes(2),
            ]);
            $this->line('Também criou 1 AppNotification (broadcast informativo) da igreja.');
        }

        $this->info("Criadas {$created} notificações inbox para {$user->name} (#{$user->id} · {$user->email}).");
        $this->line('Abra o sino do painel ou /mobile/notifications e /varios/notifications.');
        $this->line('Ação = fundo âmbar + badge «Para atender». Informativo = badge «Informativo».');

        return self::SUCCESS;
    }

    private function resolveUser(): ?User
    {
        $raw = trim((string) $this->option('user'));
        if ($raw !== '') {
            if (ctype_digit($raw)) {
                return User::query()->find((int) $raw);
            }

            return User::query()->where('email', $raw)->first();
        }

        return User::query()
            ->role(['super_admin', 'admin'])
            ->orderBy('id')
            ->first()
            ?? User::query()->orderBy('id')->first();
    }

    /**
     * @return list<array{title: string, body: string, intent: string, action_url: string, read: bool}>
     */
    private function samples(): array
    {
        $solicitations = url('/atendimento');
        $mission = url('/mission/content/messages?filter=pending');
        $support = url('/support');
        $nsWhats = url('/conversations');
        $volunteers = url('/lideranca/meus-voluntarios');
        $finance = url('/finance/treasurer');
        $escalas = url('/escalas');
        $mobileNotif = url('/mobile/notifications');

        return [
            [
                'title' => 'Novo pedido de atendimento',
                'body' => 'Maria Silva solicitou visita pastoral. Abra a fila para atender.',
                'intent' => UserInboxNotification::INTENT_ACTION,
                'action_url' => $solicitations,
                'read' => false,
            ],
            [
                'title' => 'Nova contribuição registrada',
                'body' => 'Uma oferta de R$ 50,00 foi confirmada na campanha Oferta Nova Semente.',
                'intent' => UserInboxNotification::INTENT_INFO,
                'action_url' => $finance,
                'read' => false,
            ],
            [
                'title' => 'Nova mensagem num pedido',
                'body' => 'O membro respondeu no chat do pedido de batismo.',
                'intent' => UserInboxNotification::INTENT_ACTION,
                'action_url' => $solicitations,
                'read' => false,
            ],
            [
                'title' => 'Check-in marcado na escala',
                'body' => 'Carlos marcou presença no culto de sábado (Louvor).',
                'intent' => UserInboxNotification::INTENT_INFO,
                'action_url' => $escalas,
                'read' => false,
            ],
            [
                'title' => 'Depoimento aguardando análise',
                'body' => 'João enviou um depoimento na Missão que precisa de revisão antes do mural.',
                'intent' => UserInboxNotification::INTENT_ACTION,
                'action_url' => $mission,
                'read' => false,
            ],
            [
                'title' => 'Check-in liberado',
                'body' => 'O check-in da escala de hoje já está disponível para os voluntários.',
                'intent' => UserInboxNotification::INTENT_INFO,
                'action_url' => $escalas,
                'read' => false,
            ],
            [
                'title' => 'Novo pedido de suporte',
                'body' => 'Ticket sobre login na app — a equipe precisa responder.',
                'intent' => UserInboxNotification::INTENT_ACTION,
                'action_url' => $support,
                'read' => false,
            ],
            [
                'title' => 'Depoimento aprovado',
                'body' => 'Seu depoimento na Missão foi aprovado e já está visível para a comunidade.',
                'intent' => UserInboxNotification::INTENT_INFO,
                'action_url' => url('/mobile/mission/messages'),
                'read' => false,
            ],
            [
                'title' => 'Nova conversa no NS Conecta',
                'body' => 'Uma conversa nova chegou no departamento Louvor.',
                'intent' => UserInboxNotification::INTENT_ACTION,
                'action_url' => $nsWhats,
                'read' => false,
            ],
            [
                'title' => 'Alguém disse amém',
                'body' => 'Pedro disse amém no seu pedido de oração.',
                'intent' => UserInboxNotification::INTENT_INFO,
                'action_url' => $mobileNotif,
                'read' => false,
            ],
            [
                'title' => 'Novo voluntário no ministério',
                'body' => 'Ana entrou em «Portaria». Revise critérios e liberação.',
                'intent' => UserInboxNotification::INTENT_ACTION,
                'action_url' => $volunteers,
                'read' => false,
            ],
            [
                'title' => 'Agradecimento da campanha',
                'body' => 'Obrigado por contribuir. Sua doação faz diferença na missão da igreja.',
                'intent' => UserInboxNotification::INTENT_INFO,
                'action_url' => $mobileNotif,
                'read' => false,
            ],
            [
                'title' => 'Convite — Louvor',
                'body' => 'Você foi convidado(a) a servir no departamento Louvor. Aceite ou recuse.',
                'intent' => UserInboxNotification::INTENT_ACTION,
                'action_url' => $mobileNotif,
                'read' => false,
            ],
            [
                'title' => 'Publicação aprovada',
                'body' => 'Sua publicação na Central de Serviços foi aprovada — já lida (informativo).',
                'intent' => UserInboxNotification::INTENT_INFO,
                'action_url' => url('/mobile/talents/my-listings'),
                'read' => true,
            ],
            [
                'title' => 'Nova denúncia',
                'body' => 'Denúncia na Central de Serviços aguardando análise da moderação.',
                'intent' => UserInboxNotification::INTENT_ACTION,
                'action_url' => url('/talents/admin/reports'),
                'read' => false,
            ],
            [
                'title' => 'Nova solicitação de comunicação',
                'body' => 'Pedido de arte para o culto — já lida (ação).',
                'intent' => UserInboxNotification::INTENT_ACTION,
                'action_url' => url('/communication-requests'),
                'read' => true,
            ],
        ];
    }
}
