<?php

namespace Tests\Feature;

use App\Models\Church;
use App\Models\User;
use Database\Seeders\ChurchSeeder;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RegistrationCreatesMemberTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_registration_sets_user_church_profile_for_usuarios_list(): void
    {
        $this->seed([RolePermissionSeeder::class, ChurchSeeder::class]);

        $churchId = Church::query()->orderBy('id')->value('id');

        $response = $this->post('/register', [
            'name' => 'Utilizador Registo',
            'email' => 'registo.usuario@example.com',
            'password' => 'Password1!xx',
            'password_confirmation' => 'Password1!xx',
        ]);

        $response->assertRedirect();

        $this->assertDatabaseHas('users', [
            'email' => 'registo.usuario@example.com',
            'name' => 'Utilizador Registo',
            'church_id' => $churchId,
            'is_volunteer' => false,
        ]);

        $user = User::query()->where('email', 'registo.usuario@example.com')->first();
        $this->assertNotNull($user);
    }

    public function test_registration_with_already_volunteer_sets_is_volunteer_on_user(): void
    {
        $this->seed([RolePermissionSeeder::class, ChurchSeeder::class]);

        $this->post('/register', [
            'name' => 'Vol Registo',
            'email' => 'vol.registo@example.com',
            'password' => 'Password1!xx',
            'password_confirmation' => 'Password1!xx',
            'already_volunteer' => true,
        ])->assertRedirect();

        $this->assertDatabaseHas('users', [
            'email' => 'vol.registo@example.com',
            'is_volunteer' => true,
        ]);
    }
}
