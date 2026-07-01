<?php

namespace Tests\Feature;

use App\Models\Church;
use App\Models\LibraryLessonNote;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LibraryLessonNoteTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_cannot_list_lesson_notes(): void
    {
        $this->seed();

        $this->getJson(route('mobile.biblioteca.lesson-notes.index', [
            'lesson_source_url' => 'https://mais.cpb.com.br/licao/teste/',
        ]))->assertUnauthorized();
    }

    public function test_authenticated_user_can_save_and_list_notes_per_day(): void
    {
        $this->seed();

        $church = Church::query()->firstOrFail();
        $user = User::factory()->create(['church_id' => $church->id]);
        $lessonUrl = 'https://mais.cpb.com.br/licao/vida-de-oracao-2o-trimestre-2026/';

        $this->actingAs($user)
            ->withSession(['working_church_id' => $church->id])
            ->putJson(route('mobile.biblioteca.lesson-notes.upsert'), [
                'lesson_source_url' => $lessonUrl,
                'day_slug' => 'sabado',
                'body' => 'Reflexão sobre oração persistente.',
            ])
            ->assertOk()
            ->assertJsonPath('ok', true)
            ->assertJsonPath('note.day_slug', 'sabado');

        $this->actingAs($user)
            ->withSession(['working_church_id' => $church->id])
            ->putJson(route('mobile.biblioteca.lesson-notes.upsert'), [
                'lesson_source_url' => $lessonUrl,
                'day_slug' => 'domingo',
                'body' => 'Versículo-chave: Lucas 11.',
            ])
            ->assertOk();

        $response = $this->actingAs($user)
            ->withSession(['working_church_id' => $church->id])
            ->getJson(route('mobile.biblioteca.lesson-notes.index', [
                'lesson_source_url' => $lessonUrl,
            ]));

        $response->assertOk();
        $response->assertJsonPath('ok', true);
        $response->assertJsonCount(2, 'notes');

        $this->assertDatabaseHas('library_lesson_notes', [
            'user_id' => $user->id,
            'church_id' => $church->id,
            'day_slug' => 'sabado',
        ]);
    }

    public function test_empty_body_deletes_existing_note_only_when_answer_is_also_empty(): void
    {
        $this->seed();

        $church = Church::query()->firstOrFail();
        $user = User::factory()->create(['church_id' => $church->id]);
        $lessonUrl = 'https://mais.cpb.com.br/licao/teste/';

        LibraryLessonNote::query()->create([
            'church_id' => $church->id,
            'user_id' => $user->id,
            'lesson_source_url' => $lessonUrl,
            'lesson_source_hash' => LibraryLessonNote::hashSourceUrl($lessonUrl),
            'day_slug' => 'terca',
            'body' => 'Anotação temporária.',
        ]);

        $this->actingAs($user)
            ->withSession(['working_church_id' => $church->id])
            ->putJson(route('mobile.biblioteca.lesson-notes.upsert'), [
                'lesson_source_url' => $lessonUrl,
                'day_slug' => 'terca',
                'body' => '',
            ])
            ->assertOk()
            ->assertJsonPath('note', null);

        $this->assertDatabaseMissing('library_lesson_notes', [
            'user_id' => $user->id,
            'day_slug' => 'terca',
        ]);
    }

    public function test_user_can_save_question_answer_without_notes_body(): void
    {
        $this->seed();

        $church = Church::query()->firstOrFail();
        $user = User::factory()->create(['church_id' => $church->id]);
        $lessonUrl = 'https://mais.cpb.com.br/licao/teste/';

        $this->actingAs($user)
            ->withSession(['working_church_id' => $church->id])
            ->putJson(route('mobile.biblioteca.lesson-notes.upsert'), [
                'lesson_source_url' => $lessonUrl,
                'day_slug' => 'quinta',
                'body' => '',
                'answer_body' => 'Minha resposta à pergunta do dia.',
            ])
            ->assertOk()
            ->assertJsonPath('ok', true)
            ->assertJsonPath('note.day_slug', 'quinta')
            ->assertJsonPath('note.answer_body', 'Minha resposta à pergunta do dia.');

        $this->assertDatabaseHas('library_lesson_notes', [
            'user_id' => $user->id,
            'day_slug' => 'quinta',
            'answer_body' => 'Minha resposta à pergunta do dia.',
        ]);
    }

    public function test_clearing_answer_keeps_note_when_body_exists(): void
    {
        $this->seed();

        $church = Church::query()->firstOrFail();
        $user = User::factory()->create(['church_id' => $church->id]);
        $lessonUrl = 'https://mais.cpb.com.br/licao/teste/';

        LibraryLessonNote::query()->create([
            'church_id' => $church->id,
            'user_id' => $user->id,
            'lesson_source_url' => $lessonUrl,
            'lesson_source_hash' => LibraryLessonNote::hashSourceUrl($lessonUrl),
            'day_slug' => 'sexta',
            'body' => 'Anotação do dia.',
            'answer_body' => 'Resposta antiga.',
        ]);

        $this->actingAs($user)
            ->withSession(['working_church_id' => $church->id])
            ->putJson(route('mobile.biblioteca.lesson-notes.upsert'), [
                'lesson_source_url' => $lessonUrl,
                'day_slug' => 'sexta',
                'body' => 'Anotação do dia.',
                'answer_body' => '',
            ])
            ->assertOk()
            ->assertJsonPath('note.body', 'Anotação do dia.')
            ->assertJsonPath('note.answer_body', null);
    }

    public function test_user_cannot_see_other_users_notes(): void
    {
        $this->seed();

        $church = Church::query()->firstOrFail();
        $owner = User::factory()->create(['church_id' => $church->id]);
        $other = User::factory()->create(['church_id' => $church->id]);
        $lessonUrl = 'https://mais.cpb.com.br/licao/privada/';

        LibraryLessonNote::query()->create([
            'church_id' => $church->id,
            'user_id' => $owner->id,
            'lesson_source_url' => $lessonUrl,
            'lesson_source_hash' => LibraryLessonNote::hashSourceUrl($lessonUrl),
            'day_slug' => 'quarta',
            'body' => 'Só do dono.',
        ]);

        $response = $this->actingAs($other)
            ->withSession(['working_church_id' => $church->id])
            ->getJson(route('mobile.biblioteca.lesson-notes.index', [
                'lesson_source_url' => $lessonUrl,
            ]));

        $response->assertOk();
        $response->assertJsonCount(0, 'notes');
    }
}
