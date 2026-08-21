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

class DepartmentRosterPickerTest extends TestCase
{
    use RefreshDatabase;

    public function test_index_includes_already_attached_leaders_and_volunteers_in_picker_options(): void
    {
        $this->seed();

        $church = Church::query()->firstOrFail();
        $admin = User::factory()->create(['church_id' => $church->id]);
        $admin->assignRole(Role::firstOrCreate(['name' => 'admin']));

        $ministry = Ministry::query()->create([
            'church_id' => $church->id,
            'name' => 'Louvor Equipe Picker',
        ]);

        $leader = User::factory()->create([
            'church_id' => $church->id,
            'name' => 'Líder Já Vinculado',
            'email' => 'lider.vinculado.picker@example.com',
        ]);
        $ministry->users()->sync([$leader->id]);

        $volunteer = Volunteer::query()->create([
            'name' => 'Voluntário Já Vinculado',
            'email' => 'vol.vinculado.picker@example.com',
            'active' => true,
            'app_access_only' => true,
        ]);
        $ministry->volunteers()->attach($volunteer->id);

        $this->actingAs($admin)
            ->withSession(['working_church_id' => $church->id])
            ->get(route('departments.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Departments/Index')
                ->where('departments', function ($departments) use ($ministry, $leader, $volunteer) {
                    $row = collect($departments)->firstWhere('id', $ministry->id);
                    if (! is_array($row)) {
                        return false;
                    }

                    $leaderIds = collect($row['leaders'] ?? [])->pluck('id')->map(fn ($id) => (int) $id);
                    $volunteerIds = collect($row['volunteers'] ?? [])->pluck('id')->map(fn ($id) => (int) $id);

                    return $leaderIds->contains((int) $leader->id)
                        && $volunteerIds->contains((int) $volunteer->id);
                })
                ->where('leaderOptions', fn ($opts) => collect($opts)->contains(
                    fn ($o) => (int) ($o['id'] ?? 0) === (int) $leader->id
                ))
                ->where('volunteerOptions', fn ($opts) => collect($opts)->contains(
                    fn ($o) => (int) ($o['id'] ?? 0) === (int) $volunteer->id
                ))
            );
    }

    public function test_update_keeps_already_attached_app_access_only_volunteer(): void
    {
        $this->seed();

        $church = Church::query()->firstOrFail();
        $admin = User::factory()->create(['church_id' => $church->id]);
        $admin->assignRole(Role::firstOrCreate(['name' => 'admin']));

        $ministry = Ministry::query()->create([
            'church_id' => $church->id,
            'name' => 'Recepção Equipe Picker',
        ]);

        $volunteer = Volunteer::query()->create([
            'name' => 'Voluntário Só App',
            'email' => 'vol.so.app.picker@example.com',
            'active' => true,
            'app_access_only' => true,
        ]);
        $ministry->volunteers()->attach($volunteer->id);

        $this->actingAs($admin)
            ->withSession(['working_church_id' => $church->id])
            ->from(route('departments.index'))
            ->put(route('departments.update', $ministry), [
                'name' => $ministry->name,
                'leader_user_ids' => [],
                'volunteer_ids' => [$volunteer->id],
            ])
            ->assertSessionDoesntHaveErrors()
            ->assertRedirect(route('departments.index', [
                'modal' => 'edit',
                'id' => $ministry->id,
            ]));

        $this->assertTrue($ministry->fresh()->volunteers->contains('id', $volunteer->id));
    }
}
