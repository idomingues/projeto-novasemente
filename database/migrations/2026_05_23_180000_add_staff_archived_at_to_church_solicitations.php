<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('church_solicitations')) {
            return;
        }

        if (! Schema::hasColumn('church_solicitations', 'staff_archived_at')) {
            Schema::table('church_solicitations', function (Blueprint $table) {
                $table->timestamp('staff_archived_at')->nullable()->after('leader_hidden_at');
            });
        }
    }

    public function down(): void
    {
        if (! Schema::hasTable('church_solicitations')) {
            return;
        }

        if (Schema::hasColumn('church_solicitations', 'staff_archived_at')) {
            Schema::table('church_solicitations', function (Blueprint $table) {
                $table->dropColumn('staff_archived_at');
            });
        }
    }
};
