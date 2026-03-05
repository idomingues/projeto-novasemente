<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('churches', function (Blueprint $table) {
            $table->string('email')->nullable()->after('description');
            $table->string('phone')->nullable()->after('email');
            $table->string('whatsapp')->nullable()->after('phone');
            $table->string('address')->nullable()->after('whatsapp');
            $table->string('pix_key')->nullable()->after('address');
            $table->string('donation_url')->nullable()->after('pix_key');
        });
    }

    public function down(): void
    {
        Schema::table('churches', function (Blueprint $table) {
            $table->dropColumn(['email', 'phone', 'whatsapp', 'address', 'pix_key', 'donation_url']);
        });
    }
};
