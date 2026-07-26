<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('user_inbox_notifications', function (Blueprint $table) {
            $table->string('intent', 16)->default('info')->after('body');
        });

        // Filas de atendimento conhecidas → ação; o restante permanece informativo.
        $actionTitlePatterns = [
            'Depoimento aguardando%',
            'Nova denúncia%',
            'Novo pedido%',
            'Nova mensagem num pedido%',
            'Nova mensagem do líder%',
            'Nova mensagem da igreja%',
            'Nova solicitação%',
            'Nova mensagem num ticket%',
            'Novo pedido de suporte%',
            'Nova mensagem no suporte%',
            'Nova mensagem sobre o seu agendamento%',
            'Prazo definido%',
            'Atualização no seu chamado%',
            'Nova conversa%',
            'NS Conecta%',
            'Conversa transferida%',
            'Conversa encaminhada%',
            'Novo voluntário no ministério%',
            'Convite —%',
            'Publicação pendente%',
            'Publicação aguardando%',
            'Serviço aguardando%',
            'Talento aguardando%',
            'Anúncio pendente%',
            'Aguardando aprovação%',
            'Nova inscrição%',
            'Novo interesse%',
            'Nova mensagem na conexão%',
            'Status da conexão%',
            'Atualização da inscrição%',
            'Nova mensagem%',
        ];

        foreach ($actionTitlePatterns as $pattern) {
            DB::table('user_inbox_notifications')
                ->where('title', 'like', $pattern)
                ->update(['intent' => 'action']);
        }
    }

    public function down(): void
    {
        Schema::table('user_inbox_notifications', function (Blueprint $table) {
            $table->dropColumn('intent');
        });
    }
};
