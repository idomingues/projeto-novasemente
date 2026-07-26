<?php

namespace Tests\Feature;

use App\Models\Church;
use App\Models\Ministry;
use App\Models\User;
use App\Models\Volunteer;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class LeaderVolunteerBirthdaysTest extends TestCase
{
    use RefreshDatabase;

    public function test_ministry_leader_sees_only_own_volunteers_birthdays_for_month(): void
    {
        $this->seed();

        $church = Church::query()->firstOrFail();
        $ministryA = Ministry::query()->create([
            'church_id' => $church->id,
            'name' => 'Departamento A Aniversários',
        ]);
        $ministryB = Ministry::query()->create([
            'church_id' => $church->id,
            'name' => 'Departamento B Aniversários',
        ]);

        $leader = User::factory()->create([
            'church_id' => $church->id,
            'is_ministry_leader' => true,
        ]);
        $leader->assignRole(Role::firstOrCreate(['name' => 'lider_ministerio', 'guard_name' => 'web']));
        $leader->ministries()->sync([$ministryA->id]);

        $today = now();
        $laterDay = $today->day === 1 ? min(15, (int) $today->daysInMonth) : 1;

        $ownToday = Volunteer::query()->create([
            'user_id' => null,
            'name' => 'Aniversariante Hoje',
            'email' => 'hoje.aniversario@example.com',
            'active' => true,
            'birth_date' => $today->copy()->subYears(25)->toDateString(),
        ]);
        $ownToday->ministries()->attach($ministryA->id);

        $ownLater = Volunteer::query()->create([
            'user_id' => null,
            'name' => 'Aniversariante Depois',
            'email' => 'depois.aniversario@example.com',
            'active' => true,
            'birth_date' => $today->copy()->subYears(30)->day($laterDay)->toDateString(),
        ]);
        $ownLater->ministries()->attach($ministryA->id);

        $otherDept = Volunteer::query()->create([
            'user_id' => null,
            'name' => 'Outro Departamento',
            'email' => 'outro.dept.aniversario@example.com',
            'active' => true,
            'birth_date' => $today->copy()->subYears(22)->toDateString(),
        ]);
        $otherDept->ministries()->attach($ministryB->id);

        $otherMonth = Volunteer::query()->create([
            'user_id' => null,
            'name' => 'Outro Mês',
            'email' => 'outro.mes.aniversario@example.com',
            'active' => true,
            'birth_date' => $today->copy()->subYears(20)->addMonths(1)->toDateString(),
        ]);
        $otherMonth->ministries()->attach($ministryA->id);

        $this->actingAs($leader)
            ->withSession(['working_church_id' => $church->id])
            ->get(route('mobile.leader.birthdays', [
                'month' => (int) $today->month,
                'year' => (int) $today->year,
            ]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Mobile/LeaderBirthdays')
                ->has('birthdays', 2)
                ->where('todayCount', 1)
                ->where('birthdays.0.name', 'Aniversariante Hoje')
                ->where('birthdays.0.isToday', true)
                ->where('birthdays.1.isToday', false)
            );
    }

    public function test_non_leader_cannot_open_birthdays_page(): void
    {
        $this->seed();

        $church = Church::query()->firstOrFail();
        $member = User::factory()->create([
            'church_id' => $church->id,
            'is_ministry_leader' => false,
        ]);

        $this->actingAs($member)
            ->withSession(['working_church_id' => $church->id])
            ->get(route('mobile.leader.birthdays'))
            ->assertForbidden();
    }

    public function test_falls_back_to_user_birth_date_when_volunteer_birth_date_missing(): void
    {
        $this->seed();

        $church = Church::query()->firstOrFail();
        $ministry = Ministry::query()->create([
            'church_id' => $church->id,
            'name' => 'Departamento Fallback Aniversário',
        ]);

        $leader = User::factory()->create([
            'church_id' => $church->id,
            'is_ministry_leader' => true,
        ]);
        $leader->assignRole(Role::firstOrCreate(['name' => 'lider_ministerio', 'guard_name' => 'web']));
        $leader->ministries()->sync([$ministry->id]);

        $today = now();
        $linkedUser = User::factory()->create([
            'church_id' => $church->id,
            'birth_date' => $today->copy()->subYears(28)->toDateString(),
            'photo_url' => 'https://example.com/foto.jpg',
        ]);

        $volunteer = Volunteer::query()->create([
            'user_id' => $linkedUser->id,
            'name' => 'Com Data no Usuário',
            'email' => 'data.usuario@example.com',
            'active' => true,
            'birth_date' => null,
        ]);
        $volunteer->ministries()->attach($ministry->id);

        $this->actingAs($leader)
            ->withSession(['working_church_id' => $church->id])
            ->get(route('mobile.leader.birthdays', [
                'month' => (int) $today->month,
                'year' => (int) $today->year,
            ]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Mobile/LeaderBirthdays')
                ->has('birthdays', 1)
                ->where('birthdays.0.name', 'Com Data no Usuário')
                ->where('birthdays.0.photoUrl', 'https://example.com/foto.jpg')
                ->where('birthdays.0.isToday', true)
            );
    }
}
