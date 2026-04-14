<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('volunteers', function (Blueprint $table) {
            $table->date('birth_date')->nullable()->after('phone');
            $table->boolean('has_whatsapp')->nullable()->after('birth_date');
            $table->boolean('has_social_networks')->nullable()->after('has_whatsapp');

            $table->string('attendance_duration')->nullable()->after('has_social_networks');
            $table->boolean('is_official_member')->nullable()->after('attendance_duration');
            $table->boolean('member_record_at_nova_semente')->nullable()->after('is_official_member');
            $table->string('member_record_church')->nullable()->after('member_record_at_nova_semente');

            $table->boolean('has_previous_ministry_volunteer_experience')->nullable()->after('member_record_church');
            $table->text('previous_ministry_details')->nullable()->after('has_previous_ministry_volunteer_experience');
        });
    }

    public function down(): void
    {
        Schema::table('volunteers', function (Blueprint $table) {
            $table->dropColumn([
                'birth_date',
                'has_whatsapp',
                'has_social_networks',
                'attendance_duration',
                'is_official_member',
                'member_record_at_nova_semente',
                'member_record_church',
                'has_previous_ministry_volunteer_experience',
                'previous_ministry_details',
            ]);
        });
    }
};

