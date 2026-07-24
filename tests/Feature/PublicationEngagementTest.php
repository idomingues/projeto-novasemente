<?php

namespace Tests\Feature;

use App\Models\Church;
use App\Models\News;
use App\Models\PublicationComment;
use App\Models\PublicationLike;
use App\Models\User;
use Database\Seeders\ChurchSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class PublicationEngagementTest extends TestCase
{
    use RefreshDatabase;

    private function seedOpenFeed(): Church
    {
        config(['publications_feed.preview_only' => false]);
        $this->seed(ChurchSeeder::class);

        return Church::query()->firstOrFail();
    }

    private function makeNews(Church $church, User $author): News
    {
        return News::query()->create([
            'church_id' => $church->id,
            'section' => News::SECTION_NEWS,
            'title' => 'Post de teste',
            'slug' => 'post-de-teste-'.uniqid(),
            'content_type' => News::TYPE_ARTICLE,
            'excerpt' => 'Resumo',
            'body' => 'Corpo completo',
            'published_at' => now()->subHour(),
            'is_active' => true,
            'created_by' => $author->id,
        ]);
    }

    public function test_guest_can_like_but_cannot_comment(): void
    {
        $church = $this->seedOpenFeed();
        $author = User::factory()->create(['church_id' => $church->id]);
        $news = $this->makeNews($church, $author);
        $feedId = 'news-'.$news->id;

        $this->withSession(['working_church_id' => $church->id])
            ->getJson(route('mobile.publications.comments.index', ['feedId' => $feedId]))
            ->assertOk()
            ->assertJsonPath('comments_count', 0);

        $this->withSession(['working_church_id' => $church->id])
            ->postJson(route('mobile.publications.like', ['feedId' => $feedId]))
            ->assertOk()
            ->assertJson([
                'liked' => true,
                'likes_count' => 1,
            ]);

        $this->assertDatabaseHas('publication_likes', [
            'user_id' => null,
            'subject_type' => 'news',
            'subject_id' => $news->id,
        ]);

        $this->withSession(['working_church_id' => $church->id])
            ->postJson(route('mobile.publications.comments.store', ['feedId' => $feedId]), [
                'body' => 'Olá',
            ])
            ->assertUnauthorized();
    }

    public function test_guest_cannot_comment_on_photos(): void
    {
        $church = $this->seedOpenFeed();
        $author = User::factory()->create(['church_id' => $church->id]);
        $album = \App\Models\PhotoAlbum::query()->create([
            'church_id' => $church->id,
            'title' => 'Álbum teste',
            'drive_folder_url' => 'https://drive.google.com/drive/folders/testdummyfolderid123',
            'published_at' => now()->subHour(),
            'created_by' => $author->id,
        ]);
        $feedId = 'photos-'.$album->id;

        $this->withSession(['working_church_id' => $church->id])
            ->getJson(route('mobile.publications.comments.index', ['feedId' => $feedId]))
            ->assertStatus(422);

        $user = User::factory()->create(['church_id' => $church->id]);
        $this->actingAs($user)
            ->withSession(['working_church_id' => $church->id])
            ->postJson(route('mobile.publications.comments.store', ['feedId' => $feedId]), [
                'body' => 'Comentário em foto',
            ])
            ->assertStatus(422);

        $this->withSession(['working_church_id' => $church->id])
            ->postJson(route('mobile.publications.like', ['feedId' => $feedId]))
            ->assertOk()
            ->assertJsonPath('liked', true);
    }

    public function test_authenticated_user_can_toggle_like_and_comment(): void
    {
        $church = $this->seedOpenFeed();
        $author = User::factory()->create(['church_id' => $church->id]);
        $user = User::factory()->create(['church_id' => $church->id]);
        $news = $this->makeNews($church, $author);
        $feedId = 'news-'.$news->id;

        $this->actingAs($user)
            ->withSession(['working_church_id' => $church->id])
            ->postJson(route('mobile.publications.like', ['feedId' => $feedId]))
            ->assertOk()
            ->assertJson([
                'liked' => true,
                'likes_count' => 1,
            ]);

        $this->assertDatabaseHas('publication_likes', [
            'user_id' => $user->id,
            'subject_type' => 'news',
            'subject_id' => $news->id,
        ]);

        $this->actingAs($user)
            ->withSession(['working_church_id' => $church->id])
            ->postJson(route('mobile.publications.like', ['feedId' => $feedId]))
            ->assertOk()
            ->assertJson([
                'liked' => false,
                'likes_count' => 0,
            ]);

        $this->actingAs($user)
            ->withSession(['working_church_id' => $church->id])
            ->postJson(route('mobile.publications.comments.store', ['feedId' => $feedId]), [
                'body' => 'Que bênção!',
            ])
            ->assertCreated()
            ->assertJsonPath('comments_count', 1)
            ->assertJsonPath('comment.body', 'Que bênção!');

        $this->actingAs($user)
            ->withSession(['working_church_id' => $church->id])
            ->getJson(route('mobile.publications.comments.index', ['feedId' => $feedId]))
            ->assertOk()
            ->assertJsonPath('comments_count', 1)
            ->assertJsonPath('comments.0.body', 'Que bênção!');
    }

    public function test_soft_deleted_comment_is_hidden_from_public_list(): void
    {
        $church = $this->seedOpenFeed();
        $author = User::factory()->create(['church_id' => $church->id]);
        $user = User::factory()->create(['church_id' => $church->id]);
        $news = $this->makeNews($church, $author);

        $comment = PublicationComment::query()->create([
            'user_id' => $user->id,
            'church_id' => $church->id,
            'subject_type' => 'news',
            'subject_id' => $news->id,
            'body' => 'Polêmico',
        ]);
        $comment->delete();

        $this->withSession(['working_church_id' => $church->id])
            ->getJson(route('mobile.publications.comments.index', ['feedId' => 'news-'.$news->id]))
            ->assertOk()
            ->assertJsonPath('comments_count', 0)
            ->assertJsonCount(0, 'comments');
    }

    public function test_admin_can_destroy_comment_and_unauthorized_cannot(): void
    {
        $church = $this->seedOpenFeed();
        Permission::findOrCreate('news.manage');

        $author = User::factory()->create(['church_id' => $church->id]);
        $member = User::factory()->create(['church_id' => $church->id]);
        $admin = User::factory()->create(['church_id' => $church->id]);
        $admin->givePermissionTo('news.manage');

        $news = $this->makeNews($church, $author);
        $comment = PublicationComment::query()->create([
            'user_id' => $member->id,
            'church_id' => $church->id,
            'subject_type' => 'news',
            'subject_id' => $news->id,
            'body' => 'Para remover',
        ]);

        $this->actingAs($member)
            ->withSession(['working_church_id' => $church->id])
            ->delete(route('publication-comments.destroy', $comment))
            ->assertForbidden();

        $this->actingAs($admin)
            ->withSession(['working_church_id' => $church->id])
            ->delete(route('publication-comments.destroy', $comment))
            ->assertRedirect();

        $this->assertSoftDeleted('publication_comments', ['id' => $comment->id]);
        $this->assertSame(
            $admin->id,
            PublicationComment::withTrashed()->findOrFail($comment->id)->deleted_by
        );
    }

    public function test_feed_payload_includes_engagement_counts(): void
    {
        $church = $this->seedOpenFeed();
        $author = User::factory()->create(['church_id' => $church->id]);
        $user = User::factory()->create(['church_id' => $church->id]);
        $news = $this->makeNews($church, $author);

        PublicationLike::query()->create([
            'user_id' => $user->id,
            'church_id' => $church->id,
            'subject_type' => 'news',
            'subject_id' => $news->id,
        ]);
        PublicationComment::query()->create([
            'user_id' => $user->id,
            'church_id' => $church->id,
            'subject_type' => 'news',
            'subject_id' => $news->id,
            'body' => 'Comentário',
        ]);

        $response = $this->actingAs($user)
            ->withSession(['working_church_id' => $church->id])
            ->get(route('mobile.publications-feed'))
            ->assertOk();

        $response->assertInertia(function ($page) use ($news) {
            $page->component('Mobile/PublicationsFeed')->has('items.data');
            $data = $page->toArray()['props']['items']['data'] ?? [];
            $match = collect($data)->firstWhere('id', 'news-'.$news->id);
            $this->assertNotNull($match);
            $this->assertSame(1, $match['likes_count']);
            $this->assertSame(1, $match['comments_count']);
            $this->assertTrue($match['liked_by_me']);

            return $page;
        });
    }
}
