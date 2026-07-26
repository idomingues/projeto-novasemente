<?php

namespace Tests\Feature;

use App\Http\Controllers\RoleController;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
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

        $admin = User::query()->where('email', 'ivan@iresult.com.br')->first();
        $this->assertNotNull($admin);
        $this->actingAs($admin);

        $this->post(route('roles.store'), ['name' => 'coordenador_teste'])
            ->assertRedirect(route('roles.index', [
                'modal' => 'edit',
                'id' => Role::findByName('coordenador_teste')->id,
            ]))
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

        $admin = User::query()->where('email', 'ivan@iresult.com.br')->first();
        $this->actingAs($admin);

        $super = Role::findByName('super_admin');

        $this->delete(route('roles.destroy', $super))
            ->assertSessionHas('error');
    }

    public function test_roles_index_excludes_finance_and_support_from_permission_matrix(): void
    {
        $this->seed();

        $admin = User::query()->where('email', 'ivan@iresult.com.br')->first();
        $response = $this->actingAs($admin)->get(route('roles.index'));
        $response->assertOk();
        $perms = $response->inertiaProps('permissions');
        $this->assertIsArray($perms);
        foreach ($perms as $row) {
            $this->assertIsArray($row);
            $this->assertArrayHasKey('name', $row);
            $this->assertFalse(
                RoleController::permissionExcludedFromProfileMatrix((string) $row['name']),
                'Permissão '.$row['name'].' não deve aparecer na matriz de perfis.'
            );
        }
    }

    public function test_super_admin_role_is_not_listed_on_roles_index(): void
    {
        $this->seed();

        $admin = User::query()->where('email', 'ivan@iresult.com.br')->first();
        $response = $this->actingAs($admin)->get(route('roles.index'));
        $response->assertOk();
        $roles = $response->inertiaProps('roles');
        $this->assertIsArray($roles);
        $names = collect($roles)->pluck('name')->all();
        $this->assertNotContains('super_admin', $names);
    }

    public function test_bulk_role_update_cannot_strip_super_admin_permissions(): void
    {
        $this->seed();

        $admin = User::query()->where('email', 'ivan@iresult.com.br')->first();
        $this->actingAs($admin);

        $super = Role::findByName('super_admin');
        $before = $super->permissions()->count();
        $this->assertGreaterThan(0, $before);

        $this->post(route('roles.update'), [
            'roles' => [
                ['name' => 'super_admin', 'permissions' => []],
            ],
        ])->assertRedirect(route('roles.index'));

        $super->refresh();
        $this->assertSame($before, $super->permissions()->count());
    }

    public function test_bulk_role_update_cannot_add_permissions_to_super_admin_via_payload(): void
    {
        $this->seed();

        $admin = User::query()->where('email', 'ivan@iresult.com.br')->first();
        $this->actingAs($admin);

        $super = Role::findByName('super_admin');
        $beforeNames = $super->permissions()->pluck('name')->sort()->values()->all();

        $one = Permission::query()->first();
        $this->assertNotNull($one);

        $this->post(route('roles.update'), [
            'roles' => [
                ['name' => 'super_admin', 'permissions' => [$one->name]],
            ],
        ])->assertRedirect(route('roles.index'));

        $super->refresh();
        $this->assertSame($beforeNames, $super->permissions()->pluck('name')->sort()->values()->all());
    }

    public function test_role_name_accepts_friendly_labels(): void
    {
        $this->seed();

        $admin = User::query()->where('email', 'ivan@iresult.com.br')->first();
        $this->actingAs($admin);

        $this->post(route('roles.store'), ['name' => 'Coordenador de Eventos'])
            ->assertRedirect(route('roles.index', [
                'modal' => 'edit',
                'id' => Role::findByName('Coordenador de Eventos')->id,
            ]))
            ->assertSessionHas('success');

        $this->assertDatabaseHas('roles', ['name' => 'Coordenador de Eventos']);
    }

    public function test_store_reuses_existing_role_when_name_matches_case_insensitive(): void
    {
        $this->seed();

        $admin = User::query()->where('email', 'ivan@iresult.com.br')->first();
        $this->actingAs($admin);

        $guard = (string) config('auth.defaults.guard');
        $existing = Role::query()->create(['name' => 'Missão', 'guard_name' => $guard]);

        $this->post(route('roles.store'), ['name' => 'missão'])
            ->assertRedirect(route('roles.index', [
                'modal' => 'edit',
                'id' => $existing->id,
            ]))
            ->assertSessionHas('success');

        $this->assertSame(
            1,
            Role::query()->whereRaw('LOWER(name) = ?', ['missão'])->count(),
        );
    }

    public function test_role_permissions_auto_save_via_json_returns_ok(): void
    {
        $this->seed();

        $admin = User::query()->where('email', 'ivan@iresult.com.br')->first();
        $this->actingAs($admin);

        $role = Role::findByName('financeiro');
        $permission = Permission::query()->where('name', 'mission.view')->first();
        $this->assertNotNull($permission);

        $this->postJson(route('roles.update'), [
            'roles' => [
                ['name' => $role->name, 'permissions' => [$permission->name]],
            ],
        ])->assertOk()->assertJson(['message' => 'Permissões salvas.']);

        $role->refresh();
        $this->assertTrue($role->hasPermissionTo('mission.view'));
    }

    public function test_super_admin_can_attach_move_and_detach_role_users(): void
    {
        $this->seed();

        $admin = User::query()->where('email', 'ivan@iresult.com.br')->first();
        $this->assertNotNull($admin);
        $this->actingAs($admin);

        $mission = Role::query()->firstOrCreate(
            ['name' => 'Missão', 'guard_name' => (string) config('auth.defaults.guard')],
        );
        $secretaria = Role::findByName('secretaria');
        $this->assertNotNull($secretaria);

        $member = User::factory()->create([
            'email' => 'perfil.teste@example.com',
            'name' => 'Perfil Teste',
        ]);
        $member->syncRoles(['membro']);

        $this->post(route('roles.users.attach', $mission), ['user_id' => $member->id])
            ->assertRedirect(route('roles.index'))
            ->assertSessionHas('success');

        $member->refresh();
        $this->assertTrue($member->hasRole('Missão'));
        $this->assertFalse($member->hasRole('membro'));

        $this->patch(route('roles.users.update', [$mission, $member]), ['role_name' => 'secretaria'])
            ->assertRedirect(route('roles.index'))
            ->assertSessionHas('success');

        $member->refresh();
        $this->assertTrue($member->hasRole('secretaria'));
        $this->assertFalse($member->hasRole('Missão'));

        $this->delete(route('roles.users.detach', [$secretaria, $member]))
            ->assertRedirect(route('roles.index'))
            ->assertSessionHas('success');

        $member->refresh();
        $this->assertTrue($member->hasRole('membro'));
        $this->assertFalse($member->hasRole('secretaria'));
    }

    public function test_roles_index_includes_users_payload(): void
    {
        $this->seed();

        $admin = User::query()->where('email', 'ivan@iresult.com.br')->first();
        $response = $this->actingAs($admin)->get(route('roles.index'));
        $response->assertOk();
        $roles = $response->inertiaProps('roles');
        $this->assertIsArray($roles);
        $this->assertNotEmpty($roles);
        $this->assertArrayHasKey('users', $roles[0]);
        $this->assertIsArray($response->inertiaProps('candidateUsers'));
        $this->assertIsArray($response->inertiaProps('moveTargets'));
    }
}
