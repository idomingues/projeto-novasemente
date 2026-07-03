<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('mission_volunteers', function (Blueprint $table) {
            $table->string('spiritual_journey')->nullable();
            $table->string('comfortable_environment')->nullable();
            $table->string('group_project_preference')->nullable();
            $table->json('interest_areas')->nullable();
            $table->string('learning_style')->nullable();
            $table->string('personalized_bible_study_interest')->nullable();
            $table->string('mission_social_projects_interest')->nullable();
            $table->string('start_area_preference')->nullable();
            $table->text('talents_for_god')->nullable();
            $table->text('team_support_notes')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('mission_volunteers', function (Blueprint $table) {
            $table->dropColumn([
                'spiritual_journey',
                'comfortable_environment',
                'group_project_preference',
                'interest_areas',
                'learning_style',
                'personalized_bible_study_interest',
                'mission_social_projects_interest',
                'start_area_preference',
                'talents_for_god',
                'team_support_notes',
            ]);
        });
    }
};
