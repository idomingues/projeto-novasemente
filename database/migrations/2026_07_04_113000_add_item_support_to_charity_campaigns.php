<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('charity_campaigns', function (Blueprint $table) {
            $table->string('type', 20)->default('money')->after('description');
            $table->string('progress_mode', 20)->default('money')->after('type');
            $table->unsignedInteger('goal_quantity')->nullable()->after('raised_amount');
            $table->unsignedInteger('pledged_quantity')->default(0)->after('goal_quantity');
            $table->unsignedInteger('collected_quantity')->default(0)->after('pledged_quantity');
            $table->string('unit_label', 100)->nullable()->after('collected_quantity');

            $table->index(['church_id', 'type', 'status'], 'charity_campaigns_church_type_status_idx');
        });

        Schema::create('charity_item_donations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('campaign_id')->constrained('charity_campaigns')->cascadeOnDelete();
            $table->string('source', 20)->default('app');
            $table->foreignId('user_id')->nullable()->constrained()->cascadeOnDelete();
            $table->string('external_donor_name')->nullable();
            $table->string('item_description');
            $table->unsignedInteger('quantity');
            $table->string('unit_label', 100)->nullable();
            $table->text('notes')->nullable();
            $table->text('staff_note')->nullable();
            $table->string('status', 20)->default('pledged');
            $table->boolean('is_anonymous')->default(false);
            $table->string('evidence_photo_path')->nullable();
            $table->unsignedInteger('quantity_before_adjustment')->nullable();
            $table->text('adjustment_note')->nullable();
            $table->foreignId('registered_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('received_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('adjusted_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('pledged_at');
            $table->timestamp('received_at')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->timestamp('adjusted_at')->nullable();
            $table->timestamps();

            $table->index(['campaign_id', 'status']);
            $table->index(['user_id', 'pledged_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('charity_item_donations');

        Schema::table('charity_campaigns', function (Blueprint $table) {
            $table->dropIndex('charity_campaigns_church_type_status_idx');
            $table->dropColumn([
                'type',
                'progress_mode',
                'goal_quantity',
                'pledged_quantity',
                'collected_quantity',
                'unit_label',
            ]);
        });
    }
};
