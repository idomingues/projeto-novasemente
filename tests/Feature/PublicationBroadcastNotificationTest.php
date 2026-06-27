<?php

namespace Tests\Feature;

use App\Models\AppNotification;
use App\Models\Church;
use App\Models\News;
use App\Models\User;
use App\Support\NotificationFeed;
use Database\Seeders\ChurchSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class PublicationBroadcastNotificationTest extends TestCase
{
    use RefreshDatabase;

    private function adminUser(Church $church): User
    {
        Permission::firstOrCreate(['name' => 'news.manage']);
        $admin = User::factory()->create(['church_id' => $church->id]);
        $admin->assignRole(Role::firstOrCreate(['name' => 'admin']));
        $admin->givePermissionTo('news.manage');

        return $admin;
    }

    public function test_health_publication_creates_general_notification_with_link(): void
    {
        $this->seed(ChurchSeeder::class);
        $church = Church::query()->firstOrFail();
        $admin = $this->adminUser($church);

        $this->actingAs($admin)
            ->withSession(['working_church_id' => $church->id])
            ->post(route('health.store'), [
                'content_type' => News::TYPE_ARTICLE,
                'title' => 'Artigo de saúde com aviso',
                'body' => 'Conteúdo do artigo.',
                'excerpt' => 'Resumo curto para a notificação.',
            ])
            ->assertRedirect();

        $post = News::query()->where('title', 'Artigo de saúde com aviso')->firstOrFail();

        $notification = AppNotification::query()->sole();
        $this->assertSame('Nova publicação de saúde: Artigo de saúde com aviso', $notification->title);
        $this->assertSame('Resumo curto para a notificação.', $notification->body);
        $this->assertSame(
            route('mobile.health.show', ['health' => $post->slug], absolute: true),
            $notification->action_url,
        );
    }

    public function test_news_publication_creates_general_notification_with_link(): void
    {
        $this->seed(ChurchSeeder::class);
        $church = Church::query()->firstOrFail();
        $admin = $this->adminUser($church);

        $this->actingAs($admin)
            ->withSession(['working_church_id' => $church->id])
            ->post(route('news.store'), [
                'content_type' => News::TYPE_ARTICLE,
                'title' => 'Notícia com aviso geral',
                'body' => 'Corpo da notícia.',
            ])
            ->assertRedirect();

        $post = News::query()->where('title', 'Notícia com aviso geral')->firstOrFail();

        $notification = AppNotification::query()->sole();
        $this->assertSame('Nova notícia: Notícia com aviso geral', $notification->title);
        $this->assertSame(
            route('mobile.news.show', ['news' => $post->slug], absolute: true),
            $notification->action_url,
        );
    }

    public function test_scheduled_publication_does_not_create_notification(): void
    {
        $this->seed(ChurchSeeder::class);
        $church = Church::query()->firstOrFail();
        $admin = $this->adminUser($church);

        $this->actingAs($admin)
            ->withSession(['working_church_id' => $church->id])
            ->post(route('news.store'), [
                'content_type' => News::TYPE_ARTICLE,
                'title' => 'Notícia agendada',
                'body' => 'Corpo.',
                'published_at' => now()->addDay()->format('Y-m-d\TH:i'),
            ])
            ->assertRedirect();

        $this->assertSame(0, AppNotification::query()->count());
    }

    public function test_musica_publication_creates_general_notification_with_link(): void
    {
        $this->seed(ChurchSeeder::class);
        $church = Church::query()->firstOrFail();
        $admin = $this->adminUser($church);

        $this->actingAs($admin)
            ->withSession(['working_church_id' => $church->id])
            ->post(route('musica.store'), [
                'title' => 'Louvor novo',
                'youtube_url' => 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            ])
            ->assertRedirect();

        $musica = \App\Models\Musica::query()->where('title', 'Louvor novo')->firstOrFail();
        $notification = AppNotification::query()->sole();

        $this->assertSame('Nova música: Louvor novo', $notification->title);
        $this->assertSame(
            route('mobile.musica.show', ['musica' => $musica->id], absolute: true),
            $notification->action_url,
        );
    }

    public function test_event_publication_creates_general_notification_with_event_link(): void
    {
        $this->seed(ChurchSeeder::class);
        $church = Church::query()->firstOrFail();
        $admin = $this->adminUser($church);
        Permission::firstOrCreate(['name' => 'events.manage']);
        $admin->givePermissionTo('events.manage');

        $this->actingAs($admin)
            ->withSession(['working_church_id' => $church->id])
            ->post(route('events.store'), [
                'title' => 'Retiro de jovens',
                'description' => 'Inscrições abertas.',
                'starts_at' => now()->addWeek()->format('Y-m-d\TH:i'),
                'all_day' => false,
                'is_active' => true,
            ])
            ->assertRedirect();

        $event = \App\Models\Event::query()->where('title', 'Retiro de jovens')->firstOrFail();
        $notification = AppNotification::query()->sole();

        $this->assertSame('Novo evento: Retiro de jovens', $notification->title);
        $this->assertSame(
            route('mobile.events', absolute: true).'?event='.$event->id,
            $notification->action_url,
        );
    }

    public function test_publication_notification_appears_in_feed_with_publication_href(): void
    {
        $this->seed(ChurchSeeder::class);
        $church = Church::query()->firstOrFail();
        $admin = $this->adminUser($church);

        $this->actingAs($admin)
            ->withSession(['working_church_id' => $church->id])
            ->post(route('health.store'), [
                'content_type' => News::TYPE_PDF,
                'title' => 'PDF com aviso',
                'body' => '',
                'pdf_file' => UploadedFile::fake()->create('doc.pdf', 100, 'application/pdf'),
            ])
            ->assertRedirect();

        $post = News::query()->where('title', 'PDF com aviso')->firstOrFail();

        $request = Request::create('http://localhost:8000/mobile/notificacoes', 'GET');
        $request->setUserResolver(fn () => $admin);

        $feed = NotificationFeed::mergedForUser($request, $church->id, 10);
        $entry = collect($feed)->firstWhere('kind', 'app');

        $this->assertNotNull($entry);
        $this->assertSame('/mobile/saude/'.$post->slug, $entry['href']);
    }
}
