<?php

namespace App\Http\Controllers;

use App\Models\Church;
use App\Models\LibraryLessonNote;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LibraryLessonNoteController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_unless($user !== null, 401);

        $data = $request->validate([
            'lesson_source_url' => ['required', 'string', 'max:2048'],
        ]);

        $churchId = Church::resolveWorkingId($request);
        abort_unless($churchId !== null, 404);

        $url = trim($data['lesson_source_url']);
        if ($url === '') {
            return response()->json(['ok' => false, 'error' => 'URL inválida.'], 422);
        }

        $urlHash = LibraryLessonNote::hashSourceUrl($url);

        $notes = LibraryLessonNote::query()
            ->where('user_id', $user->id)
            ->where('church_id', $churchId)
            ->where('lesson_source_hash', $urlHash)
            ->orderByDesc('updated_at')
            ->get(['id', 'day_slug', 'body', 'answer_body', 'updated_at']);

        return response()->json([
            'ok' => true,
            'notes' => $notes->map(fn (LibraryLessonNote $note) => $this->notePayload($note))->values(),
        ]);
    }

    public function upsert(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_unless($user !== null, 401);

        $data = $request->validate([
            'lesson_source_url' => ['required', 'string', 'max:2048'],
            'day_slug' => ['required', 'string', 'max:64', 'regex:/^[a-z0-9_-]+$/'],
            'body' => ['nullable', 'string', 'max:10000'],
            'answer_body' => ['nullable', 'string', 'max:10000'],
        ]);

        $churchId = Church::resolveWorkingId($request);
        abort_unless($churchId !== null, 404);

        $url = trim($data['lesson_source_url']);
        if ($url === '') {
            return response()->json(['ok' => false, 'error' => 'URL inválida.'], 422);
        }

        $daySlug = trim($data['day_slug']);
        $urlHash = LibraryLessonNote::hashSourceUrl($url);

        $existing = LibraryLessonNote::query()
            ->where('user_id', $user->id)
            ->where('church_id', $churchId)
            ->where('lesson_source_hash', $urlHash)
            ->where('day_slug', $daySlug)
            ->first();

        $body = array_key_exists('body', $data)
            ? trim((string) ($data['body'] ?? ''))
            : trim((string) ($existing?->body ?? ''));
        $answerBody = array_key_exists('answer_body', $data)
            ? trim((string) ($data['answer_body'] ?? ''))
            : trim((string) ($existing?->answer_body ?? ''));

        if ($body === '' && $answerBody === '') {
            LibraryLessonNote::query()
                ->where('user_id', $user->id)
                ->where('church_id', $churchId)
                ->where('lesson_source_hash', $urlHash)
                ->where('day_slug', $daySlug)
                ->delete();

            return response()->json([
                'ok' => true,
                'note' => null,
            ]);
        }

        $note = LibraryLessonNote::query()->updateOrCreate(
            [
                'user_id' => $user->id,
                'church_id' => $churchId,
                'lesson_source_hash' => $urlHash,
                'day_slug' => $daySlug,
            ],
            [
                'lesson_source_url' => $url,
                'body' => $body,
                'answer_body' => $answerBody !== '' ? $answerBody : null,
            ],
        );

        return response()->json([
            'ok' => true,
            'note' => $this->notePayload($note->fresh()),
        ]);
    }

    /**
     * @return array{id: int, day_slug: string, body: string, answer_body: string|null, updated_at: string|null}
     */
    private function notePayload(LibraryLessonNote $note): array
    {
        return [
            'id' => $note->id,
            'day_slug' => $note->day_slug,
            'body' => $note->body,
            'answer_body' => $note->answer_body,
            'updated_at' => $note->updated_at?->toIso8601String(),
        ];
    }
}
