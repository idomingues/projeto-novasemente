<?php

namespace Tests\Feature;

use App\Models\Church;
use App\Models\LibraryBook;
use App\Models\User;
use App\Models\UserLibraryBookBookmark;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class LibraryBookBookmarkTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_library_has_empty_bookmarks(): void
    {
        $this->seed();

        $churchId = (int) Church::query()->value('id');
        $this->assertGreaterThan(0, $churchId);

        $this->withSession(['working_church_id' => $churchId])
            ->get(route('mobile.biblioteca'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Mobile/Library')
                ->where('bookmarkedLibraryBookIds', []));
    }

    public function test_user_can_toggle_library_book_bookmark(): void
    {
        $this->seed();

        $church = Church::query()->firstOrFail();
        $user = User::factory()->create([
            'church_id' => $church->id,
            'email' => 'library-member@example.com',
        ]);

        $book = LibraryBook::query()->create([
            'church_id' => $church->id,
            'title' => 'Livro Favorito',
            'subtitle' => null,
            'description' => null,
            'category' => LibraryBook::CATEGORY_BOOKS,
            'cover_path' => null,
            'pdf_path' => null,
            'external_url' => 'https://example.test/livro',
            'published_at' => null,
            'order' => 1,
            'created_by' => null,
        ]);

        $this->actingAs($user)
            ->withSession(['working_church_id' => $church->id])
            ->postJson(route('mobile.biblioteca.bookmarks.toggle'), [
                'library_book_id' => $book->id,
            ])
            ->assertOk()
            ->assertJsonPath('bookmarked', true)
            ->assertJsonPath('bookmarkedLibraryBookIds.0', $book->id);

        $this->assertDatabaseHas('user_library_book_bookmarks', [
            'user_id' => $user->id,
            'library_book_id' => $book->id,
        ]);

        $this->actingAs($user)
            ->withSession(['working_church_id' => $church->id])
            ->get(route('mobile.biblioteca'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('bookmarkedLibraryBookIds', [$book->id]));

        $this->actingAs($user)
            ->withSession(['working_church_id' => $church->id])
            ->postJson(route('mobile.biblioteca.bookmarks.toggle'), [
                'library_book_id' => $book->id,
            ])
            ->assertOk()
            ->assertJsonPath('bookmarked', false)
            ->assertJsonPath('bookmarkedLibraryBookIds', []);

        $this->assertSame(0, UserLibraryBookBookmark::query()->where('user_id', $user->id)->count());
    }

    public function test_user_cannot_bookmark_inaccessible_library_book(): void
    {
        $this->seed();

        $church = Church::query()->firstOrFail();
        $otherChurch = Church::query()->create([
            'name' => 'Outra Igreja',
            'slug' => 'outra-igreja-bookmark-'.uniqid(),
        ]);
        $user = User::factory()->create([
            'church_id' => $church->id,
            'email' => 'library-other@example.com',
        ]);

        $book = LibraryBook::query()->create([
            'church_id' => $otherChurch->id,
            'title' => 'Livro de Outra Igreja',
            'subtitle' => null,
            'description' => null,
            'category' => LibraryBook::CATEGORY_BOOKS,
            'cover_path' => null,
            'pdf_path' => null,
            'external_url' => 'https://example.test/outro',
            'published_at' => null,
            'order' => 1,
            'created_by' => null,
        ]);

        $this->actingAs($user)
            ->withSession(['working_church_id' => $church->id])
            ->postJson(route('mobile.biblioteca.bookmarks.toggle'), [
                'library_book_id' => $book->id,
            ])
            ->assertNotFound();
    }
}
