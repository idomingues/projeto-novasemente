<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class DashboardAccessTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_cannot_access_dashboard(): void
    {
        $this->get('/dashboard')->assertRedirect('/login');
    }

    public function test_member_without_staff_role_is_redirected_from_dashboard(): void
    {
        $this->seed();

        $user = User::factory()->create();
        $guard = (string) config('auth.defaults.guard');
        $role = Role::firstOrCreate(['name' => 'membro', 'guard_name' => $guard]);
        $user->assignRole($role);

        $this->actingAs($user)
            ->get('/dashboard')
            ->assertRedirect(route('mobile.home', absolute: false));
    }

    public function test_admin_can_access_dashboard(): void
    {
        $this->seed();

        $user = User::factory()->create();
        $guard = (string) config('auth.defaults.guard');
        $role = Role::firstOrCreate(['name' => 'admin', 'guard_name' => $guard]);
        $user->assignRole($role);

        $this->actingAs($user)
            ->get('/dashboard')
            ->assertOk();
    }
}
