<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('talent_listings', function (Blueprint $table) {
            $table->string('contact_phone', 40)->nullable()->after('availability');
            $table->string('contact_whatsapp', 40)->nullable()->after('contact_phone');
            $table->string('contact_email', 120)->nullable()->after('contact_whatsapp');
            $table->string('contact_instagram', 80)->nullable()->after('contact_email');
        });
    }

    public function down(): void
    {
        Schema::table('talent_listings', function (Blueprint $table) {
            $table->dropColumn([
                'contact_phone',
                'contact_whatsapp',
                'contact_email',
                'contact_instagram',
            ]);
        });
    }
};
