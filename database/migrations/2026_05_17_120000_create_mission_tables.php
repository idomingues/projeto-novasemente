<?php

use App\Models\Church;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('mission_phases', function (Blueprint $table) {
            $table->id();
            $table->foreignId('church_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();
        });

        Schema::create('mission_volunteers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('church_id')->constrained()->cascadeOnDelete();
            $table->foreignId('mission_phase_id')->nullable()->constrained('mission_phases')->nullOnDelete();
            $table->foreignId('submitted_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('photo_path')->nullable();
            $table->string('full_name');
            $table->string('email')->nullable();
            $table->date('birth_date')->nullable();
            $table->string('phone', 40)->nullable();
            $table->text('full_address')->nullable();
            $table->string('profession')->nullable();
            $table->string('profession_other')->nullable();
            $table->boolean('has_belief')->nullable();
            $table->string('belief_which')->nullable();
            $table->string('belief_which_other')->nullable();
            $table->boolean('participates_religion')->nullable();
            $table->string('religion_which')->nullable();
            $table->string('religion_which_other')->nullable();
            $table->boolean('baptized')->nullable();
            $table->json('seeks_in_community')->nullable();
            $table->string('seeks_in_community_other')->nullable();
            $table->string('studied_bible')->nullable();
            $table->boolean('studied_bible_structured')->nullable();
            $table->boolean('first_time_nova_semente')->nullable();
            $table->string('first_contact_via')->nullable();
            $table->string('first_contact_via_other')->nullable();
            $table->string('wants_bible_study_partner')->nullable();
            $table->string('if_not_how_long')->nullable();
            $table->string('insight_duration')->nullable();
            $table->json('participated_groups')->nullable();
            $table->string('participated_groups_other')->nullable();
            $table->string('engagement_level')->nullable();
            $table->text('closer_to_god_text')->nullable();
            $table->string('belonging_people')->nullable();
            $table->string('belonging_location')->nullable();
            $table->string('belonging_availability')->nullable();
            $table->string('belonging_spirituality')->nullable();
            $table->string('social_actions_interest')->nullable();
            $table->string('profile_type')->nullable();
            $table->string('ministry_preference')->nullable();
            $table->string('social_action_type')->nullable();
            $table->string('weekday_availability')->nullable();
            $table->string('time_per_week')->nullable();
            $table->string('work_preference')->nullable();
            $table->boolean('can_contact_week')->nullable();
            $table->string('contact_period')->nullable();
            $table->string('contact_format')->nullable();
            $table->unsignedTinyInteger('nps_score')->nullable();
            $table->boolean('lgpd_consent')->default(false);
            $table->timestamp('last_invite_sent_at')->nullable();
            $table->timestamps();

            $table->index(['church_id', 'mission_phase_id']);
        });

        Schema::create('mission_invitations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('church_id')->constrained()->cascadeOnDelete();
            $table->foreignId('mission_volunteer_id')->constrained()->cascadeOnDelete();
            $table->foreignId('invited_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('token', 64)->unique();
            $table->string('status', 32)->default('sent');
            $table->string('channel', 32)->default('email');
            $table->timestamp('sent_at')->nullable();
            $table->timestamps();
        });

        $defaultPhases = [
            ['name' => 'Interessado', 'sort_order' => 10],
            ['name' => 'Em contato', 'sort_order' => 20],
            ['name' => 'Em formação', 'sort_order' => 30],
            ['name' => 'Ativo no Insight', 'sort_order' => 40],
        ];

        foreach (Church::query()->pluck('id') as $churchId) {
            foreach ($defaultPhases as $row) {
                DB::table('mission_phases')->insert([
                    'church_id' => $churchId,
                    'name' => $row['name'],
                    'sort_order' => $row['sort_order'],
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('mission_invitations');
        Schema::dropIfExists('mission_volunteers');
        Schema::dropIfExists('mission_phases');
    }
};
