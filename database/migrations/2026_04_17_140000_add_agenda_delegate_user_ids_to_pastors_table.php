<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pastors', function (Blueprint $table) {
            $table->json('agenda_delegate_user_ids')->nullable()->after('user_id');
        });
    }

    public function down(): void
    {
        Schema::table('pastors', function (Blueprint $table) {
            $table->dropColumn('agenda_delegate_user_ids');
        });
    }
};
