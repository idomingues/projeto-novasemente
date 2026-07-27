<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Volunteer;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class VolunteersTest extends TestCase
{
    use RefreshDatabase;

    private function actingAsAdmin(): User
    {
        $this->seed();

        $user = User::factory()->create();
        $role = Role::firstOrCreate(['name' => 'admin']);
        $user->assignRole($role);

        return $user;
    }

    public function test_can_create_volunteer_without_department(): void
    {
        $user = $this->actingAsAdmin();

        $payload = [
            'name' => 'Voluntário Teste',
            'email' => 'voluntario.teste@example.com',
            'phone' => '',
            'ministry_ids' => [],
            'role' => '',
            'active' => '1',
            'app_role' => '',
            'app_ministry_ids' => [],
            'birth_date' => '1990-01-15',
            'app_password' => 'secret123',
            'app_password_confirmation' => 'secret123',
        ];

        $response = $this->actingAs($user)->post('/volunteers', $payload);

        $response->assertSessionHasNoErrors();

        $this->assertDatabaseHas('volunteers', [
            'email' => 'voluntario.teste@example.com',
            'name' => 'Voluntário Teste',
        ]);

        $volunteer = Volunteer::query()->where('email', 'voluntario.teste@example.com')->firstOrFail();
        $response->assertRedirect(route('volunteers.index', ['modal' => 'edit', 'id' => $volunteer->id]));
        $this->assertNotNull($volunteer->user_id);

        $this->assertDatabaseHas('users', [
            'id' => $volunteer->user_id,
            'email' => 'voluntario.teste@example.com',
        ]);

        $appUser = User::query()->findOrFail($volunteer->user_id);
        $this->assertSame([], $appUser->getRoleNames()->all());
        $this->assertFalse($appUser->canAccessAdminMenu());
    }

    public function test_requires_password_when_user_does_not_exist(): void
    {
        $user = $this->actingAsAdmin();

        $payload = [
            'name' => 'Sem Senha',
            'email' => 'sem.senha@example.com',
            'ministry_ids' => [],
            'active' => '1',
            'birth_date' => '1990-01-15',
            'app_password' => '',
            'app_password_confirmation' => '',
        ];

        $response = $this->actingAs($user)->post('/volunteers', $payload);

        $response->assertRedirect();
        $response->assertSessionHasErrors(['app_password']);
    }

    public function test_rejects_duplicate_email(): void
    {
        $user = $this->actingAsAdmin();

        User::factory()->create(['email' => 'duplicado@example.com']);

        $payload = [
            'name' => 'Duplicado',
            'email' => 'duplicado@example.com',
            'ministry_ids' => [],
            'active' => '1',
            'birth_date' => '1990-01-15',
            'app_password' => 'secret123',
            'app_password_confirmation' => 'secret123',
        ];

        $response = $this->actingAs($user)->post('/volunteers', $payload);

        $response->assertRedirect();
        $response->assertSessionHasErrors(['email']);
    }

    public function test_rejects_privileged_email_on_panel_store(): void
    {
        $user = $this->actingAsAdmin();

        User::factory()->create(['email' => 'lider.existente@example.com'])
            ->forceFill(['is_ministry_leader' => true])->save();

        $payload = [
            'name' => 'Tentativa',
            'email' => 'lider.existente@example.com',
            'ministry_ids' => [],
            'active' => '1',
            'birth_date' => '1990-01-15',
            'app_password' => 'secret123',
            'app_password_confirmation' => 'secret123',
        ];

        $response = $this->actingAs($user)->post('/volunteers', $payload);

        $response->assertRedirect();
        $response->assertSessionHasErrors(['email']);
    }

    public function test_admin_can_update_volunteer_password_on_edit(): void
    {
        $admin = $this->actingAsAdmin();

        $createResponse = $this->actingAs($admin)->post('/volunteers', [
            'name' => 'Com Senha',
            'email' => 'senha.voluntario@example.com',
            'ministry_ids' => [],
            'active' => '1',
            'app_role' => '',
            'app_ministry_ids' => [],
            'birth_date' => '1990-01-15',
            'app_password' => 'secret123',
            'app_password_confirmation' => 'secret123',
        ]);

        $volunteer = Volunteer::query()->where('email', 'senha.voluntario@example.com')->firstOrFail();
        $createResponse->assertRedirect(route('volunteers.index', ['modal' => 'edit', 'id' => $volunteer->id]));
        $userId = (int) $volunteer->user_id;
        $oldHash = User::query()->findOrFail($userId)->password;

        $response = $this->actingAs($admin)->put("/volunteers/{$volunteer->id}", [
            'name' => 'Com Senha',
            'email' => 'senha.voluntario@example.com',
            'ministry_ids' => [],
            'active' => '1',
            'birth_date' => '1990-01-15',
            'app_role' => '',
            'app_ministry_ids' => [],
            'app_password' => 'novaSenha456',
            'app_password_confirmation' => 'novaSenha456',
        ]);

        $response->assertRedirect(route('volunteers.index', ['modal' => 'edit', 'id' => $volunteer->id]));
        $response->assertSessionHasNoErrors();

        $newHash = User::query()->findOrFail($userId)->password;
        $this->assertNotSame($oldHash, $newHash);
        $this->assertTrue(\Illuminate\Support\Facades\Hash::check('novaSenha456', $newHash));
    }

    public function test_can_delete_volunteer_and_keeps_user_without_recreating_profile(): void
    {
        $admin = $this->actingAsAdmin();

        $createResponse = $this->actingAs($admin)->post('/volunteers', [
            'name' => 'Para Excluir',
            'email' => 'excluir.voluntario@example.com',
            'ministry_ids' => [],
            'active' => '1',
            'app_role' => '',
            'app_ministry_ids' => [],
            'birth_date' => '1990-01-15',
            'app_password' => 'secret123',
            'app_password_confirmation' => 'secret123',
        ]);

        $volunteer = Volunteer::query()->where('email', 'excluir.voluntario@example.com')->firstOrFail();
        $createResponse->assertRedirect(route('volunteers.index', ['modal' => 'edit', 'id' => $volunteer->id]));
        $userId = (int) $volunteer->user_id;

        $response = $this->actingAs($admin)->post("/volunteers/{$volunteer->id}", [
            '_method' => 'delete',
            'delete_linked_user' => false,
        ]);

        $response->assertRedirect('/volunteers');
        $response->assertSessionHas('success');

        $this->assertDatabaseMissing('volunteers', ['id' => $volunteer->id]);
        $this->assertDatabaseHas('users', ['id' => $userId, 'is_volunteer' => false]);
        $this->assertDatabaseMissing('volunteers', ['user_id' => $userId]);
    }

    public function test_can_delete_volunteer_and_linked_user_with_admin_panel_access(): void
    {
        $admin = $this->actingAsAdmin();

        $panelUser = User::factory()->create(['email' => 'secretaria.excluir@example.com']);
        $panelUser->assignRole(Role::firstOrCreate(['name' => 'secretaria']));
        $this->assertTrue($panelUser->canAccessAdminMenu());

        $volunteer = Volunteer::query()->create([
            'user_id' => $panelUser->id,
            'email' => $panelUser->email,
            'name' => 'Secretaria Voluntária',
            'active' => true,
        ]);

        $response = $this->actingAs($admin)->post("/volunteers/{$volunteer->id}", [
            '_method' => 'delete',
            'delete_linked_user' => true,
        ]);

        $response->assertRedirect('/volunteers');
        $response->assertSessionHas('success');
        $response->assertSessionDoesntHaveErrors();

        $this->assertDatabaseMissing('volunteers', ['id' => $volunteer->id]);
        $this->assertDatabaseMissing('users', ['id' => $panelUser->id]);
    }
}

