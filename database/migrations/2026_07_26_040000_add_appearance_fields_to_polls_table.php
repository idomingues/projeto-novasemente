<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('polls', function (Blueprint $table) {
            $table->string('public_token', 64)->nullable()->unique()->after('status');
            $table->string('display_bg_color', 20)->default('#0f172a')->after('public_token');
            $table->string('display_font', 20)->default('sans')->after('display_bg_color');
            $table->string('display_chart', 20)->default('bar')->after('display_font');
            $table->boolean('display_enabled')->default(true)->after('display_chart');
        });

        $polls = DB::table('polls')->whereNull('public_token')->pluck('id');
        foreach ($polls as $id) {
            DB::table('polls')->where('id', $id)->update([
                'public_token' => Str::random(40),
            ]);
        }
    }

    public function down(): void
    {
        Schema::table('polls', function (Blueprint $table) {
            $table->dropUnique(['public_token']);
            $table->dropColumn([
                'public_token',
                'display_bg_color',
                'display_font',
                'display_chart',
                'display_enabled',
            ]);
        });
    }
};
