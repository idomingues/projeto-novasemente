<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('campaign_donations', function (Blueprint $table) {
            $table->string('source', 20)->default('app')->after('campaign_id');
            $table->string('external_donor_name')->nullable()->after('user_id');
            $table->text('manual_registration_note')->nullable()->after('is_anonymous');
            $table->foreignId('registered_by')->nullable()->after('manual_registration_note')->constrained('users')->nullOnDelete();
        });

        Schema::table('campaign_donations', function (Blueprint $table) {
            $table->dropForeign(['user_id']);
        });

        Schema::table('campaign_donations', function (Blueprint $table) {
            $table->unsignedBigInteger('user_id')->nullable()->change();
            $table->string('receipt_path')->nullable()->change();
            $table->string('receipt_hash', 64)->nullable()->change();
            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('campaign_donations', function (Blueprint $table) {
            $table->dropForeign(['registered_by']);
            $table->dropColumn(['source', 'external_donor_name', 'manual_registration_note', 'registered_by']);
        });
    }
};
