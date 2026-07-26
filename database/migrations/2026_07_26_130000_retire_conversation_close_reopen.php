<?php

use App\Models\ChurchConversation;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $nulls = [
            'closed_at' => null,
            'closed_by_user_id' => null,
            'closed_by_role' => null,
            'reopen_until' => null,
        ];

        DB::table('church_conversations')
            ->where('status', ChurchConversation::STATUS_CLOSED)
            ->whereNotNull('assignee_user_id')
            ->update(array_merge(['status' => ChurchConversation::STATUS_IN_SERVICE], $nulls));

        DB::table('church_conversations')
            ->where('status', ChurchConversation::STATUS_CLOSED)
            ->whereNull('assignee_user_id')
            ->update(array_merge(['status' => ChurchConversation::STATUS_NEW], $nulls));
    }

    public function down(): void
    {
        // Dados históricos de finalização não são restaurados.
    }
};
