<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->boolean('notify_via_app')->default(true)->after('is_volunteer');
            $table->boolean('notify_via_email')->default(true)->after('notify_via_app');
            $table->boolean('notify_via_whatsapp')->default(false)->after('notify_via_email');
            $table->timestamp('lgpd_accepted_at')->nullable()->after('notify_via_whatsapp');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'notify_via_app',
                'notify_via_email',
                'notify_via_whatsapp',
                'lgpd_accepted_at',
            ]);
        });
    }
};
