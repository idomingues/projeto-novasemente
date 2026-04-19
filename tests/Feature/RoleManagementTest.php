<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class RoleManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_cannot_manage_roles(): void
    {
        $this->seed();

        $this->get(route('roles.index'))->assertRedirect(route('login'));
    }

    public function test_admin_can_create_and_delete_empty_custom_role(): void
    {
        $this->seed();

        $admin = User::first();
        $this->assertNotNull($admin);
        $this->actingAs($admin);

        $this->post(route('roles.store'), ['name' => 'coordenador_teste'])
            ->assertRedirect(route('roles.index'))
            ->assertSessionHas('success');

        $this->assertDatabaseHas('roles', ['name' => 'coordenador_teste']);

        $role = Role::findByName('coordenador_teste');
        $this->delete(route('roles.destroy', $role))
            ->assertRedirect(route('roles.index'))
            ->assertSessionHas('success');

        $this->assertDatabaseMissing('roles', ['name' => 'coordenador_teste']);
    }

    public function test_cannot_delete_system_admin_roles(): void
    {
        $this->seed();

        $admin = User::first();
        $this->actingAs($admin);

        $super = Role::findByName('super_admin');

        $this->delete(route('roles.destroy', $super))
            ->assertSessionHas('error');
    }

    public function test_role_name_must_match_slug_pattern(): void
    {
        $this->seed();

        $admin = User::first();
        $this->actingAs($admin);

        $this->post(route('roles.store'), ['name' => 'Nome Inválido'])
            ->assertSessionHasErrors('name');
    }
}
