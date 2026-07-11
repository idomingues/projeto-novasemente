<?php

namespace Tests\Feature;

use App\Models\Church;
use App\Models\User;
use App\Models\WeeklyProgram;
use Carbon\Carbon;
use Database\Seeders\ChurchSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class WeeklyProgramTest extends TestCase
{
    use RefreshDatabase;

    private function grantProgramacao(User $user): void
    {
        $guard = config('auth.defaults.guard');
        foreach (['programacao.view', 'programacao.manage'] as $name) {
            Permission::findOrCreate($name, $guard);
        }
        $role = Role::findOrCreate('admin', $guard);
        $role->givePermissionTo(['programacao.view', 'programacao.manage']);
        $user->assignRole($role);
    }

    public function test_admin_can_list_and_create_weekly_program(): void
    {
        $this->seed(ChurchSeeder::class);
        $church = Church::query()->firstOrFail();
        $user = User::factory()->create(['church_id' => $church->id]);
        $this->grantProgramacao($user);

        $this->actingAs($user)
            ->withSession(['working_church_id' => $church->id])
            ->get(route('programacao.index'))
            ->assertOk();

        $this->actingAs($user)
            ->withSession(['working_church_id' => $church->id])
            ->post(route('programacao.store'), [
                'day_of_week' => 3,
                'when_label' => 'QUA 20H',
                'title' => 'CULTO DE ORAÇÃO',
                'body' => 'Momento de oração.',
                'time_mode' => 'fixed',
                'start_time' => '20:00',
                'display_time' => '20:00',
                'home_message' => 'Todos são bem-vindos.',
                'show_on_home' => true,
                'is_active' => true,
                'sort_order' => 10,
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('weekly_programs', [
            'church_id' => $church->id,
            'when_label' => 'QUA 20H',
            'title' => 'CULTO DE ORAÇÃO',
        ]);
    }

    public function test_home_shows_weekly_program_only_on_event_day(): void
    {
        config([
            'sabbath.latitude' => -23.574389,
            'sabbath.longitude' => -46.644722,
            'sabbath.timezone' => 'America/Sao_Paulo',
        ]);

        Http::fake([
            'api.sunrise-sunset.org/*' => Http::response([
                'status' => 'OK',
                'results' => [
                    'sunset' => '2026-07-10T17:36:00-03:00',
                ],
            ]),
        ]);

        $this->seed(ChurchSeeder::class);
        $church = Church::query()->firstOrFail();

        WeeklyProgram::query()->create([
            'church_id' => $church->id,
            'day_of_week' => 6,
            'when_label' => 'SÁB 9H30',
            'title' => '1º CULTO',
            'body' => 'Culto semanal',
            'time_mode' => 'fixed',
            'start_time' => '09:30:00',
            'display_time' => '09:30',
            'home_message' => 'Venha adorar.',
            'show_on_home' => true,
            'is_active' => true,
            'sort_order' => 1,
        ]);
        WeeklyProgram::query()->create([
            'church_id' => $church->id,
            'day_of_week' => 5,
            'when_label' => 'SEX',
            'title' => 'INÍCIO DO SÁBADO',
            'body' => null,
            'time_mode' => 'sunset',
            'home_message' => 'Prepare seu coração.',
            'image_url' => '/images/sabbath-sunset-bg.jpg',
            'show_on_home' => true,
            'is_active' => true,
            'sort_order' => 2,
        ]);

        // Quinta — nenhum item do dia.
        Carbon::setTestNow(Carbon::parse('2026-07-09 10:00:00', 'America/Sao_Paulo'));
        $this->withSession(['working_church_id' => $church->id])
            ->get(route('mobile.home'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Mobile/Home')
                ->has('weeklyProgramCards', 0)
            );

        // Sexta — só o pôr do sol.
        Carbon::setTestNow(Carbon::parse('2026-07-10 10:00:00', 'America/Sao_Paulo'));
        $this->withSession(['working_church_id' => $church->id])
            ->get(route('mobile.home'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Mobile/Home')
                ->has('weeklyProgramCards', 1)
                ->where('weeklyProgramCards.0.title', 'INÍCIO DO SÁBADO')
                ->where('weeklyProgramCards.0.is_next', true)
                ->where('weeklyProgramCards.0.time_display', '17:36')
            );

        // Sábado 08h — culto das 09:30 ainda futuro.
        Carbon::setTestNow(Carbon::parse('2026-07-11 08:00:00', 'America/Sao_Paulo'));
        $this->withSession(['working_church_id' => $church->id])
            ->get(route('mobile.home'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Mobile/Home')
                ->has('weeklyProgramCards', 1)
                ->where('weeklyProgramCards.0.title', '1º CULTO')
                ->where('weeklyProgramCards.0.is_next', true)
            );

        // Sábado 10h — culto das 09:30 já ocorreu; some do carrossel.
        Carbon::setTestNow(Carbon::parse('2026-07-11 10:00:00', 'America/Sao_Paulo'));
        $this->withSession(['working_church_id' => $church->id])
            ->get(route('mobile.home'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Mobile/Home')
                ->has('weeklyProgramCards', 0)
            );

        Carbon::setTestNow();
    }

    public function test_services_page_uses_weekly_program_rows(): void
    {
        $this->seed(ChurchSeeder::class);
        $church = Church::query()->firstOrFail();

        WeeklyProgram::query()->create([
            'church_id' => $church->id,
            'day_of_week' => 3,
            'when_label' => 'QUA 20H',
            'title' => 'CULTO DE ORAÇÃO',
            'body' => 'Oração',
            'time_mode' => 'fixed',
            'start_time' => '20:00:00',
            'show_on_home' => true,
            'is_active' => true,
            'sort_order' => 1,
        ]);
        WeeklyProgram::query()->create([
            'church_id' => $church->id,
            'day_of_week' => 5,
            'when_label' => 'SEX',
            'title' => 'INÍCIO DO SÁBADO',
            'body' => null,
            'time_mode' => 'sunset',
            'show_on_home' => true,
            'is_active' => true,
            'sort_order' => 2,
        ]);

        $this->withSession(['working_church_id' => $church->id])
            ->get(route('mobile.services'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Mobile/Services')
                ->has('weeklyProgram', 1)
                ->where('weeklyProgram.0.when', 'QUA 20H')
                ->where('weeklyProgram.0.title', 'CULTO DE ORAÇÃO')
            );
    }
}
