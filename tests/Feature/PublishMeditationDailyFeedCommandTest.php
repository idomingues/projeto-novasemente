<?php

namespace Tests\Feature;

use App\Models\Church;
use App\Models\News;
use App\Models\User;
use App\Support\MeditationDailyFeed;
use Database\Seeders\ChurchSeeder;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class PublishMeditationDailyFeedCommandTest extends TestCase
{
    use RefreshDatabase;

    public function test_command_creates_daily_feed_for_active_church(): void
    {
        $this->seed([RolePermissionSeeder::class, ChurchSeeder::class]);
        $church = Church::query()->where('slug', 'nova-semente')->first()
            ?? Church::query()->orderBy('id')->firstOrFail();

        $admin = User::factory()->create([
            'church_id' => $church->id,
            'email' => 'admin-meditation@example.com',
        ]);
        $admin->assignRole('admin');

        Http::fake([
            'mais.cpb.com.br/*' => Http::sequence()
                ->push($this->indexHtml(), 200)
                ->push($this->dailyHtml(), 200),
            'api.openverse.org/*' => Http::response([
                'results' => [
                    ['url' => 'https://live.staticflickr.com/demo/sunrise-day.jpg'],
                ],
            ], 200),
            'live.staticflickr.com/*' => Http::response(str_repeat('JPEG', 800), 200, [
                'Content-Type' => 'image/jpeg',
            ]),
        ]);

        $date = now()->toDateString();

        $this->artisan('app:publish-meditation-daily-feed', [
            '--church' => $church->slug,
            '--date' => $date,
        ])->assertSuccessful();

        $slug = MeditationDailyFeed::slugForDate(now());
        $news = News::query()
            ->where('church_id', $church->id)
            ->where('slug', $slug)
            ->first();

        $this->assertNotNull($news);
        $this->assertSame(News::TYPE_IMAGE, $news->content_type);
        $this->assertTrue($news->is_active);
        $this->assertNotEmpty((string) $news->image_url);
        $this->assertStringContainsString('[verse]', (string) $news->body);
        $this->assertStringContainsString('Salmo 91:4', (string) $news->body);

        // Segunda execução sem --force não duplica.
        $this->artisan('app:publish-meditation-daily-feed', [
            '--church' => $church->slug,
            '--date' => $date,
        ])->assertSuccessful();

        $this->assertSame(1, News::query()->where('church_id', $church->id)->where('slug', $slug)->count());
    }

    private function indexHtml(): string
    {
        return <<<'HTML'
<html><body>
<a href="https://mais.cpb.com.br/?post_type=meditacao&amp;p=99999"><button>LER DEVOCIONAL</button></a>
</body></html>
HTML;
    }

    private function dailyHtml(): string
    {
        return <<<'HTML'
<html><body>
<div class="diaSemanaMeditacao">Domingo</div>
<div class="diaMesMeditacao">2 de agosto</div>
<div class="titleMeditacao"><div class="mdl-typography--headline">Sob Suas Asas</div></div>
<div class="versoBiblico">“Ele o cobrirá com as Suas penas, e, sob as Suas asas, você estará seguro.” Salmo 91:4</div>
<div class="conteudoMeditacao"><p>Texto da meditação automática do dia.</p></div>
</body></html>
HTML;
    }
}
