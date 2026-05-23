<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('campaign_donation_adjustments')) {
            Schema::create('campaign_donation_adjustments', function (Blueprint $table) {
                $table->id();
                $table->foreignId('campaign_donation_id')->constrained('campaign_donations')->cascadeOnDelete();
                $table->decimal('amount_before', 12, 2);
                $table->decimal('amount_after', 12, 2);
                $table->text('adjustment_note');
                $table->foreignId('adjusted_by')->constrained('users')->cascadeOnDelete();
                $table->timestamps();

                $table->index(['campaign_donation_id', 'created_at'], 'cda_donation_created_idx');
            });

            return;
        }

        $indexExists = collect(Schema::getConnection()->select(
            'SHOW INDEX FROM campaign_donation_adjustments WHERE Key_name = ?',
            ['cda_donation_created_idx']
        ))->isNotEmpty();

        if (! $indexExists) {
            Schema::table('campaign_donation_adjustments', function (Blueprint $table) {
                $table->index(['campaign_donation_id', 'created_at'], 'cda_donation_created_idx');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('campaign_donation_adjustments');
    }
};
