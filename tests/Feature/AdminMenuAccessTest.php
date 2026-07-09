<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class AdminMenuAccessTest extends TestCase
{
    use RefreshDatabase;

    public function test_custom_profile_with_panel_permissions_can_access_admin_menu(): void
    {
        $this->seed();

        $guard = (string) config('auth.defaults.guard');
        $role = Role::create(['name' => 'Missão', 'guard_name' => $guard]);
        $role->givePermissionTo(Permission::findOrCreate('mission.view', $guard));

        $user = User::factory()->create();
        $user->assignRole($role);
        $user->syncRoleIdFromSpatieAssignments();

        $this->assertTrue($user->canAccessAdminMenu());
    }

    public function test_financeiro_profile_can_access_admin_menu(): void
    {
        $this->seed();

        $user = User::factory()->create();
        $user->assignRole('financeiro');
        $user->syncRoleIdFromSpatieAssignments();

        $this->assertTrue($user->canAccessAdminMenu());
    }

    public function test_membro_cannot_access_admin_menu(): void
    {
        $this->seed();

        $user = User::factory()->create();
        $user->assignRole('membro');
        $user->syncRoleIdFromSpatieAssignments();

        $this->assertFalse($user->canAccessAdminMenu());
    }

    public function test_lider_ministerio_cannot_access_admin_menu(): void
    {
        $this->seed();

        $user = User::factory()->create();
        $user->assignRole('lider_ministerio');
        $user->syncRoleIdFromSpatieAssignments();

        $this->assertFalse($user->canAccessAdminMenu());
    }

    public function test_custom_profile_user_receives_can_access_admin_menu_in_inertia(): void
    {
        $this->seed();

        $guard = (string) config('auth.defaults.guard');
        $role = Role::create(['name' => 'Missão', 'guard_name' => $guard]);
        $role->givePermissionTo(Permission::findOrCreate('mission.view', $guard));

        $user = User::factory()->create();
        $user->assignRole($role);
        $user->syncRoleIdFromSpatieAssignments();

        $response = $this->actingAs($user)->get(route('mission.index'));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->where('auth.canAccessAdminMenu', true)
            ->where('auth.hasCorePanelRole', false)
            ->where('auth.pastoralAgendaMenuVisible', false)
        );
    }
}
