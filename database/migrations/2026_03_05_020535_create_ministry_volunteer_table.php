<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ministry_volunteer', function (Blueprint $table) {
            $table->id();
            $table->foreignId('volunteer_id')->constrained()->cascadeOnDelete();
            $table->foreignId('ministry_id')->constrained()->cascadeOnDelete();
            $table->timestamps();
            $table->unique(['volunteer_id', 'ministry_id']);
        });

        foreach (DB::table('volunteers')->whereNotNull('ministry_id')->get() as $v) {
            DB::table('ministry_volunteer')->insert([
                'volunteer_id' => $v->id,
                'ministry_id' => $v->ministry_id,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        Schema::table('volunteers', function (Blueprint $table) {
            $table->dropForeign(['ministry_id']);
            $table->dropColumn('ministry_id');
        });
    }

    public function down(): void
    {
        Schema::table('volunteers', function (Blueprint $table) {
            $table->foreignId('ministry_id')->nullable()->after('phone')->constrained()->nullOnDelete();
        });
        foreach (DB::table('ministry_volunteer')->get() as $row) {
            DB::table('volunteers')->where('id', $row->volunteer_id)->update(['ministry_id' => $row->ministry_id]);
        }
        Schema::dropIfExists('ministry_volunteer');
    }
};
