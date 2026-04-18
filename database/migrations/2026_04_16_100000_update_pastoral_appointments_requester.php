<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pastoral_appointments', function (Blueprint $table) {
            $table->string('requester_name')->nullable()->after('requester_user_id');
        });

        foreach (
            DB::table('pastoral_appointments')
                ->whereNotNull('requester_user_id')
                ->whereNull('requester_name')
                ->cursor() as $row
        ) {
            $name = DB::table('users')->where('id', $row->requester_user_id)->value('name');
            if (is_string($name) && $name !== '') {
                DB::table('pastoral_appointments')->where('id', $row->id)->update(['requester_name' => $name]);
            }
        }

        DB::table('pastoral_appointments')->whereNull('requester_name')->update(['requester_name' => 'Pedido']);

        Schema::table('pastoral_appointments', function (Blueprint $table) {
            $table->dropForeign(['requester_member_id']);
            $table->dropColumn('requester_member_id');
        });
    }

    public function down(): void
    {
        Schema::table('pastoral_appointments', function (Blueprint $table) {
            $table->foreignId('requester_member_id')->nullable()->constrained('members')->nullOnDelete();
        });

        Schema::table('pastoral_appointments', function (Blueprint $table) {
            $table->dropColumn('requester_name');
        });
    }
};
