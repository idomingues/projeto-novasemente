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

        Schema::table('volunteer_church_pipelines', function (Blueprint $table) {
            if (! Schema::hasColumn('volunteer_church_pipelines', 'admin_workflow_stage_id')) {
                $table->foreignId('admin_workflow_stage_id')
                    ->nullable()
                    ->after('stage_id')
                    ->constrained('volunteer_pipeline_stages')
                    ->nullOnDelete();
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('volunteer_church_pipelines')) {
            return;
        }

        Schema::table('volunteer_church_pipelines', function (Blueprint $table) {
            if (Schema::hasColumn('volunteer_church_pipelines', 'admin_workflow_stage_id')) {
                $table->dropConstrainedForeignId('admin_workflow_stage_id');
            }
        });
    }
};
