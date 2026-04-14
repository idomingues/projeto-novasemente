<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('volunteers', function (Blueprint $table) {
            $table->string('ministry_involvement')->nullable()->after('previous_ministry_details');
            $table->string('other_ministry_interest')->nullable()->after('ministry_involvement');
            $table->string('gifts_to_develop')->nullable()->after('other_ministry_interest');
            $table->boolean('needs_pastoral_guidance')->nullable()->after('gifts_to_develop');
            $table->boolean('lgpd_data_consent')->nullable()->after('needs_pastoral_guidance');
        });
    }

    public function down(): void
    {
        Schema::table('volunteers', function (Blueprint $table) {
            $table->dropColumn([
                'ministry_involvement',
                'other_ministry_interest',
                'gifts_to_develop',
                'needs_pastoral_guidance',
                'lgpd_data_consent',
            ]);
        });
    }
};

