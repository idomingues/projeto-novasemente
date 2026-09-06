<?php

namespace Tests\Feature;

use App\Models\Church;
use App\Models\News;
use App\Models\WeeklyProgram;
use Illuminate\Support\Facades\Http;
use PHPUnit\Framework\Attributes\DataProvider;
use App\Support\MeditationDailyFeed;
use Carbon\Carbon;
use Database\Seeders\ChurchSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class MeditationHomeBannerTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'meditation.timezone' => 'America/Sao_Paulo',
            'meditation.home_banner_until_hour' => 10,
            'meditation.banner_image' => '/images/sabbath-sunset-bg.jpg',
            'meditation.home_banner_preview' => false,
        ]);
    }

    public function test_home_hides_meditation_banner_before_publish(): void
    {
        $this->seedMeditationForDate(Carbon::parse('2026-06-03 05:00:00', 'America/Sao_Paulo'));
        Carbon::setTestNow(Carbon::parse('2026-06-03 04:45:00', 'America/Sao_Paulo'));

        $this->get(route('mobile.home'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Mobile/Home')
                ->where('meditationBanner', null)
            );
    }

    public function test_home_shows_meditation_banner_after_publish_until_ten(): void
    {
        $this->seedMeditationForDate(Carbon::parse('2026-06-03 05:00:00', 'America/Sao_Paulo'));
        Carbon::setTestNow(Carbon::parse('2026-06-03 07:15:00', 'America/Sao_Paulo'));

        $this->get(route('mobile.home'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Mobile/Home')
                ->has('meditationBanner', fn (Assert $banner) => $banner
                    ->where('title', 'Sob Suas Asas')
                    ->where('subtitle', 'Meditação diária')
                    ->where('citation', 'Salmo 91:4')
                    ->where('cta', 'Ler meditação')
                    ->where('message', 'Comece o dia com Deus.')
                    ->where('day_label', 'Quarta')
                    ->etc()
                )
            );
    }

    public function test_home_hides_meditation_banner_from_ten_o_clock(): void
    {
        $this->seedMeditationForDate(Carbon::parse('2026-06-03 05:00:00', 'America/Sao_Paulo'));
        Carbon::setTestNow(Carbon::parse('2026-06-03 10:00:00', 'America/Sao_Paulo'));

        $this->get(route('mobile.home'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Mobile/Home')
                ->where('meditationBanner', null)
            );
    }

    public function test_home_hides_meditation_banner_when_feature_is_disabled(): void
    {
        $church = $this->seedMeditationForDate(Carbon::parse('2026-06-03 05:00:00', 'America/Sao_Paulo'));
        $church->update(['disabled_app_features' => ['devotional']]);
        Carbon::setTestNow(Carbon::parse('2026-06-03 07:15:00', 'America/Sao_Paulo'));

        $this->get(route('mobile.home'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Mobile/Home')
                ->where('meditationBanner', null)
            );
    }

    public function test_home_hides_meditation_banner_without_todays_post(): void
    {
        $this->seed(ChurchSeeder::class);
        Carbon::setTestNow(Carbon::parse('2026-06-03 07:15:00', 'America/Sao_Paulo'));

        $this->get(route('mobile.home'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Mobile/Home')
                ->where('meditationBanner', null)
            );
    }

    public function test_local_preview_shows_last_publication_outside_window(): void
    {
        config(['meditation.home_banner_preview' => true]);
        $this->seedMeditationForDate(Carbon::parse('2026-06-02 05:00:00', 'America/Sao_Paulo'));
        Carbon::setTestNow(Carbon::parse('2026-06-03 15:30:00', 'America/Sao_Paulo'));

        $this->get(route('mobile.home'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Mobile/Home')
                ->has('meditationBanner', fn (Assert $banner) => $banner
                    ->where('title', 'Sob Suas Asas')
                    ->where('citation', 'Salmo 91:4')
                    ->etc()
                )
            );
    }

    public static function programVisibilityCases(): array
    {
        return [
            'sábado com horário futuro' => ['2026-09-05 07:00:00', true, true, '09:30', '10:30', false, 1],
            'sábado em andamento' => ['2026-09-05 09:45:00', true, true, '09:30', '10:30', false, 1],
            'sábado inativo' => ['2026-09-05 07:00:00', false, true, '09:30', '10:30', true, 0],
            'sábado fora da home' => ['2026-09-05 07:00:00', true, false, '09:30', '10:30', true, 0],
            'sábado encerrado' => ['2026-09-05 09:45:00', true, true, '08:00', '09:00', true, 0],
            'sábado sem hora exibível' => ['2026-09-05 07:00:00', true, true, null, null, true, 0],
            'domingo com horário' => ['2026-09-06 07:00:00', true, true, '09:30', '10:30', true, 1],
            'sexta no Brasil, sábado UTC' => ['2026-09-04 22:00:00', true, true, '23:00', '23:59', true, 1],
        ];
    }

    #[DataProvider('programVisibilityCases')]
    public function test_meditation_banner_respects_visible_saturday_program(
        string $date, bool $active, bool $onHome, ?string $start, ?string $end,
        bool $expectBanner, int $expectedCards,
    ): void {
        config(['sabbath.timezone' => 'America/Sao_Paulo', 'meditation.home_banner_preview' => true]);
        Http::fake(['api.sunrise-sunset.org/*' => Http::response(['status' => 'INVALID_REQUEST'])]);
        $now = Carbon::parse($date, 'America/Sao_Paulo');
        Carbon::setTestNow($now);
        $church = $this->seedMeditationForDate($now->copy()->startOfDay()->setHour(5));
        WeeklyProgram::query()->delete();
        WeeklyProgram::query()->create([
            'church_id' => $church->id, 'day_of_week' => $now->dayOfWeek,
            'when_label' => 'Programação de hoje', 'title' => 'Culto',
            'time_mode' => 'fixed', 'start_time' => $start, 'end_time' => $end,
            'is_active' => $active, 'show_on_home' => $onHome, 'sort_order' => 0,
        ]);

        $this->get(route('mobile.home'))->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('Mobile/Home')
            ->has('weeklyProgramCards', $expectedCards)
            ->where('meditationBanner', fn ($banner) => $expectBanner ? $banner !== null : $banner === null)
        );

        WeeklyProgram::query()->delete();
        $this->get(route('mobile.home'))->assertOk()->assertInertia(fn (Assert $page) => $page
            ->has('weeklyProgramCards', 0)
            ->where('meditationBanner', fn ($banner) => $banner !== null)
        );
    }

    private function seedMeditationForDate(Carbon $publishedAt): Church
    {
        $this->seed(ChurchSeeder::class);
        $church = Church::query()->firstOrFail();

        News::query()->create([
            'church_id' => $church->id,
            'section' => News::SECTION_NEWS,
            'title' => 'Sob Suas Asas',
            'slug' => MeditationDailyFeed::slugForDate($publishedAt),
            'content_type' => News::TYPE_IMAGE,
            'excerpt' => 'Ele o cobrirá com as Suas penas.',
            'body' => MeditationDailyFeed::encodeBody(
                'Ele o cobrirá com as Suas penas, e, sob as Suas asas, você estará seguro.',
                'Salmo 91:4',
                'Texto da meditação de hoje.',
            ),
            'image_url' => '/images/sabbath-sunset-bg.jpg',
            'published_at' => $publishedAt,
            'is_active' => true,
        ]);

        return $church;
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();

        parent::tearDown();
    }
}
