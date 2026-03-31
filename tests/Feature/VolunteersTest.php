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
            'app_password' => 'secret123',
            'app_password_confirmation' => 'secret123',
        ];

        $response = $this->actingAs($user)->post('/volunteers', $payload);

        $response->assertRedirect('/volunteers');
        $response->assertSessionHasNoErrors();

        $this->assertDatabaseHas('volunteers', [
            'email' => 'voluntario.teste@example.com',
            'name' => 'Voluntário Teste',
        ]);

        $volunteer = Volunteer::query()->where('email', 'voluntario.teste@example.com')->firstOrFail();
        $this->assertNotNull($volunteer->user_id);

        $this->assertDatabaseHas('users', [
            'id' => $volunteer->user_id,
            'email' => 'voluntario.teste@example.com',
        ]);
    }

    public function test_requires_password_when_user_does_not_exist(): void
    {
        $user = $this->actingAsAdmin();

        $payload = [
            'name' => 'Sem Senha',
            'email' => 'sem.senha@example.com',
            'ministry_ids' => [],
            'active' => '1',
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
            'app_password' => 'secret123',
            'app_password_confirmation' => 'secret123',
        ];

        $response = $this->actingAs($user)->post('/volunteers', $payload);

        $response->assertRedirect();
        $response->assertSessionHasErrors(['email']);
    }
}

