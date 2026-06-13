<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('volunteers', function (Blueprint $table) {
            $table->text('social_network_profiles')->nullable()->after('has_social_networks');
            $table->string('volunteer_phase', 32)->nullable()->after('attendance_duration');
            $table->text('service_ease_areas')->nullable()->after('volunteer_phase');
            $table->boolean('comfortable_with_digital_tools')->nullable()->after('service_ease_areas');
            $table->text('service_greatest_strength')->nullable()->after('gifts_to_develop');
            $table->text('service_greatest_challenge')->nullable()->after('service_greatest_strength');
        });
    }

    public function down(): void
    {
        Schema::table('volunteers', function (Blueprint $table) {
            $table->dropColumn([
                'social_network_profiles',
                'volunteer_phase',
                'service_ease_areas',
                'comfortable_with_digital_tools',
                'service_greatest_strength',
                'service_greatest_challenge',
            ]);
        });
    }
};
