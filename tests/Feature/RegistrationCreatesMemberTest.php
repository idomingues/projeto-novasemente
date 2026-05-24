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
            'photo_file' => \Illuminate\Http\UploadedFile::fake()->image('avatar.jpg', 800, 800)->size(250),
            'password' => 'Password1!xx',
            'password_confirmation' => 'Password1!xx',
            'notify_via_app' => true,
            'notify_via_email' => true,
            'notify_via_whatsapp' => false,
            'lgpd_accepted' => true,
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
}
