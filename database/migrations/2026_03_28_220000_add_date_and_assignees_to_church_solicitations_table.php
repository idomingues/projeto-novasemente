<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('church_solicitations', function (Blueprint $table) {
            $table->date('preferred_date')->nullable()->after('message');
            $table->foreignId('assigned_pastor_id')->nullable()->after('preferred_date')->constrained('pastors')->nullOnDelete();
            $table->foreignId('assigned_volunteer_id')->nullable()->after('assigned_pastor_id')->constrained('volunteers')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('church_solicitations', function (Blueprint $table) {
            $table->dropConstrainedForeignId('assigned_volunteer_id');
            $table->dropConstrainedForeignId('assigned_pastor_id');
            $table->dropColumn('preferred_date');
        });
    }
};
