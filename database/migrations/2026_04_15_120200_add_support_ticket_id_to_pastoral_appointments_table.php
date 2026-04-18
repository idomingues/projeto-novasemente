<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pastoral_appointments', function (Blueprint $table) {
            $table->foreignId('support_ticket_id')
                ->nullable()
                ->after('ends_at')
                ->constrained('app_support_tickets')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('pastoral_appointments', function (Blueprint $table) {
            $table->dropConstrainedForeignId('support_ticket_id');
        });
    }
};
