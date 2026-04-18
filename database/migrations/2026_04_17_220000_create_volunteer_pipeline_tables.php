<?php

use App\Models\Church;
use App\Models\Volunteer;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('volunteer_pipeline_stages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('church_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();
        });

        Schema::create('volunteer_church_pipelines', function (Blueprint $table) {
            $table->id();
            $table->foreignId('volunteer_id')->constrained()->cascadeOnDelete();
            $table->foreignId('church_id')->constrained()->cascadeOnDelete();
            $table->foreignId('stage_id')->constrained('volunteer_pipeline_stages')->cascadeOnDelete();
            $table->timestamps();
            $table->unique(['volunteer_id', 'church_id']);
        });

        Schema::create('volunteer_leader_notes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('volunteer_id')->constrained()->cascadeOnDelete();
            $table->foreignId('church_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->text('body');
            $table->timestamps();
        });

        $defaultStages = [
            ['name' => 'Interessado', 'sort_order' => 10],
            ['name' => 'Em treinamento', 'sort_order' => 20],
            ['name' => 'Pronto para servir', 'sort_order' => 30],
            ['name' => 'A servir', 'sort_order' => 40],
        ];

        foreach (Church::query()->pluck('id') as $churchId) {
            $firstStageId = null;
            foreach ($defaultStages as $row) {
                $id = DB::table('volunteer_pipeline_stages')->insertGetId([
                    'church_id' => $churchId,
                    'name' => $row['name'],
                    'sort_order' => $row['sort_order'],
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
                if ($firstStageId === null) {
                    $firstStageId = $id;
                }
            }

            if ($firstStageId === null) {
                continue;
            }

            $volunteerIds = Volunteer::query()
                ->where(function ($q2) use ($churchId) {
                    $q2->whereDoesntHave('ministries')
                        ->orWhereHas('ministries', fn ($mq) => $mq->where('church_id', $churchId));
                })
                ->pluck('id');

            foreach ($volunteerIds as $vid) {
                DB::table('volunteer_church_pipelines')->insert([
                    'volunteer_id' => $vid,
                    'church_id' => $churchId,
                    'stage_id' => $firstStageId,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('volunteer_leader_notes');
        Schema::dropIfExists('volunteer_church_pipelines');
        Schema::dropIfExists('volunteer_pipeline_stages');
    }
};
