<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('campaign_donations', function (Blueprint $table) {
            $table->text('dispute_message')->nullable()->after('confirmed_at');
            $table->string('dispute_status', 20)->nullable()->after('dispute_message');
            $table->timestamp('disputed_at')->nullable()->after('dispute_status');
            $table->text('dispute_resolution_note')->nullable()->after('disputed_at');
            $table->timestamp('dispute_resolved_at')->nullable()->after('dispute_resolution_note');
            $table->decimal('amount_before_adjustment', 12, 2)->nullable()->after('dispute_resolved_at');
            $table->text('adjustment_note')->nullable()->after('amount_before_adjustment');
            $table->foreignId('adjusted_by')->nullable()->after('adjustment_note')->constrained('users')->nullOnDelete();
            $table->timestamp('adjusted_at')->nullable()->after('adjusted_by');

            $table->index('dispute_status');
        });
    }

    public function down(): void
    {
        Schema::table('campaign_donations', function (Blueprint $table) {
            $table->dropForeign(['adjusted_by']);
            $table->dropColumn([
                'dispute_message',
                'dispute_status',
                'disputed_at',
                'dispute_resolution_note',
                'dispute_resolved_at',
                'amount_before_adjustment',
                'adjustment_note',
                'adjusted_by',
                'adjusted_at',
            ]);
        });
    }
};
