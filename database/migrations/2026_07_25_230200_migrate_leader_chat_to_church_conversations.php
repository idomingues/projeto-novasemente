<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('church_conversations') || ! Schema::hasTable('church_solicitations')) {
            return;
        }

        $rows = DB::table('church_solicitations')
            ->where('type', 'leader_chat')
            ->orderBy('id')
            ->get();

        foreach ($rows as $s) {
            $exists = DB::table('church_conversations')
                ->where('legacy_solicitation_id', $s->id)
                ->exists();
            if ($exists) {
                continue;
            }

            $meta = is_string($s->meta) ? json_decode($s->meta, true) : (array) ($s->meta ?? []);
            $ministryIds = data_get($meta, 'ns_whats.ministry_ids', []);
            if (! is_array($ministryIds)) {
                $ministryIds = [];
            }
            $ministryIds = array_values(array_filter(array_map('intval', $ministryIds)));

            $assigneeUserId = null;
            if ($s->assigned_volunteer_id) {
                $assigneeUserId = DB::table('volunteers')->where('id', $s->assigned_volunteer_id)->value('user_id');
                $assigneeUserId = $assigneeUserId !== null ? (int) $assigneeUserId : null;
            }

            if ($ministryIds === [] && $assigneeUserId) {
                $ministryIds = DB::table('ministry_user')
                    ->where('user_id', $assigneeUserId)
                    ->pluck('ministry_id')
                    ->map(fn ($id) => (int) $id)
                    ->values()
                    ->all();
            }

            $churchId = (int) $s->church_id;
            $ministryId = $ministryIds[0] ?? null;
            if ($ministryId === null) {
                $ministryId = DB::table('ministries')
                    ->where('church_id', $churchId)
                    ->orderBy('id')
                    ->value('id');
            }
            if ($ministryId === null) {
                continue;
            }

            $status = match ((string) $s->status) {
                'completed', 'cancelled', 'archived' => 'closed',
                'in_progress' => 'in_service',
                default => $assigneeUserId ? 'awaiting_department' : 'new',
            };

            $closedAt = $s->completed_at;
            $reopenUntil = null;
            if ($closedAt) {
                $days = (int) (DB::table('churches')->where('id', $churchId)->value('conversation_reopen_days') ?: 15);
                $reopenUntil = date('Y-m-d H:i:s', strtotime($closedAt.' +'.$days.' days'));
            }

            $conversationId = DB::table('church_conversations')->insertGetId([
                'church_id' => $churchId,
                'member_user_id' => (int) $s->user_id,
                'subject' => $s->subject,
                'initial_ministry_id' => (int) $ministryId,
                'current_ministry_id' => (int) $ministryId,
                'preferred_leader_user_id' => $assigneeUserId,
                'assignee_user_id' => $assigneeUserId,
                'status' => $status,
                'last_activity_at' => $s->updated_at ?? $s->created_at,
                'closed_at' => $closedAt,
                'closed_by_user_id' => null,
                'closed_by_role' => $status === 'closed' ? 'system' : null,
                'reopen_until' => $reopenUntil,
                'member_archived_at' => $s->member_hidden_at,
                'involves_minor' => false,
                'legacy_solicitation_id' => (int) $s->id,
                'created_at' => $s->created_at,
                'updated_at' => $s->updated_at,
            ]);

            $legacyMessages = DB::table('church_solicitation_messages')
                ->where('church_solicitation_id', $s->id)
                ->orderBy('created_at')
                ->get();

            if ($legacyMessages->isEmpty() && ! empty($s->message)) {
                DB::table('church_conversation_messages')->insert([
                    'conversation_id' => $conversationId,
                    'author_user_id' => (int) $s->user_id,
                    'author_role' => 'member',
                    'body' => (string) $s->message,
                    'kind' => 'public',
                    'edited_at' => null,
                    'member_hidden_at' => null,
                    'created_at' => $s->created_at,
                    'updated_at' => $s->created_at,
                ]);
            } else {
                foreach ($legacyMessages as $m) {
                    $role = $m->sender_type === 'member' ? 'member' : 'leader';
                    DB::table('church_conversation_messages')->insert([
                        'conversation_id' => $conversationId,
                        'author_user_id' => $m->sender_user_id,
                        'author_role' => $role,
                        'body' => (string) $m->content,
                        'kind' => 'public',
                        'edited_at' => null,
                        'member_hidden_at' => null,
                        'created_at' => $m->created_at,
                        'updated_at' => $m->updated_at ?? $m->created_at,
                    ]);
                }
            }

            DB::table('church_conversation_events')->insert([
                'conversation_id' => $conversationId,
                'type' => 'migrated_from_leader_chat',
                'actor_user_id' => null,
                'before' => json_encode(['solicitation_id' => (int) $s->id], JSON_UNESCAPED_UNICODE),
                'after' => json_encode(['conversation_id' => $conversationId], JSON_UNESCAPED_UNICODE),
                'created_at' => now(),
            ]);
        }
    }

    public function down(): void
    {
        if (! Schema::hasTable('church_conversations')) {
            return;
        }

        DB::table('church_conversations')->whereNotNull('legacy_solicitation_id')->delete();
    }
};
