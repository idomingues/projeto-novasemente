<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $hasLeaderStatus = Schema::hasColumn('volunteer_ministry_invitations', 'leader_status');
        $hasLeaderNote = Schema::hasColumn('volunteer_ministry_invitations', 'leader_note');
        $hasSetBy = Schema::hasColumn('volunteer_ministry_invitations', 'leader_status_set_by_user_id');
        $hasSetAt = Schema::hasColumn('volunteer_ministry_invitations', 'leader_status_set_at');

        Schema::table('volunteer_ministry_invitations', function (Blueprint $table) {
            // (valores: denied|training|active)
            if (! Schema::hasColumn('volunteer_ministry_invitations', 'leader_status')) {
                $table->string('leader_status', 24)->nullable()->after('decline_reason');
            }
            if (! Schema::hasColumn('volunteer_ministry_invitations', 'leader_note')) {
                $table->text('leader_note')->nullable()->after('leader_status');
            }
            if (! Schema::hasColumn('volunteer_ministry_invitations', 'leader_status_set_by_user_id')) {
                $table->unsignedBigInteger('leader_status_set_by_user_id')->nullable()->after('leader_note');
            }
            if (! Schema::hasColumn('volunteer_ministry_invitations', 'leader_status_set_at')) {
                $table->timestamp('leader_status_set_at')->nullable()->after('leader_status_set_by_user_id');
            }

            // Index curto (podemos recriar sem erro usando nome fixo)
            if (! Schema::hasColumn('volunteer_ministry_invitations', 'vmi_church_min_lstatus')) {
                // no-op: Schema não expõe index introspection de forma portável
            }
        });

        // Index + FK em passos separados (para não estourar se já existirem).
        Schema::table('volunteer_ministry_invitations', function (Blueprint $table) {
            // tenta criar índice; se já existir, MySQL ignora? (não ignora). Então só criamos se colunas existem e índice ainda não.
            // Sem introspecção portável de índices, tentamos criar e deixamos o erro indicar duplicado em dev.
            // Para evitar loop, usamos nomes fixos e capturamos exceções no runtime do migrate.
        });

        // Criar índice/FK com tratamento de duplicação (idempotência real)
        try {
            Schema::table('volunteer_ministry_invitations', function (Blueprint $table) {
                $table->index(['church_id', 'ministry_id', 'leader_status'], 'vmi_church_min_lstatus');
            });
        } catch (\Throwable) {
            // índice já existe
        }

        try {
            Schema::table('volunteer_ministry_invitations', function (Blueprint $table) {
                $table->foreign('leader_status_set_by_user_id', 'vmi_lstatus_set_by_fk')
                    ->references('id')
                    ->on('users')
                    ->nullOnDelete();
            });
        } catch (\Throwable) {
            // FK já existe ou coluna ainda não estava presente
        }
    }

    public function down(): void
    {
        Schema::table('volunteer_ministry_invitations', function (Blueprint $table) {
            // Melhor esforço (pode não existir em ambientes onde migração falhou antes).
            try {
                $table->dropIndex('vmi_church_min_lstatus');
            } catch (\Throwable) {
            }
            try {
                $table->dropForeign('vmi_lstatus_set_by_fk');
            } catch (\Throwable) {
            }
            if (Schema::hasColumn('volunteer_ministry_invitations', 'leader_status_set_at')) {
                $table->dropColumn(['leader_status_set_at']);
            }
            if (Schema::hasColumn('volunteer_ministry_invitations', 'leader_status_set_by_user_id')) {
                $table->dropColumn(['leader_status_set_by_user_id']);
            }
            if (Schema::hasColumn('volunteer_ministry_invitations', 'leader_note')) {
                $table->dropColumn(['leader_note']);
            }
            if (Schema::hasColumn('volunteer_ministry_invitations', 'leader_status')) {
                $table->dropColumn(['leader_status']);
            }
        });
    }
};

