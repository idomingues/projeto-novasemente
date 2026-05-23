<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('volunteer_church_pipelines')) {
            return;
        }

        if (! Schema::hasColumn('volunteer_church_pipelines', 'staff_archived_at')) {
            Schema::table('volunteer_church_pipelines', function (Blueprint $table) {
                $table->timestamp('staff_archived_at')->nullable()->after('stage_id');
            });
        }
    }

    public function down(): void
    {
        if (! Schema::hasTable('volunteer_church_pipelines')) {
            return;
        }

        if (Schema::hasColumn('volunteer_church_pipelines', 'staff_archived_at')) {
            Schema::table('volunteer_church_pipelines', function (Blueprint $table) {
                $table->dropColumn('staff_archived_at');
            });
        }
    }
};
