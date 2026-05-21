<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Volunteer;
use App\Support\VolunteerAppLogin;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class VolunteerAppLoginTest extends TestCase
{
    use RefreshDatabase;

    public function test_login_finds_user_via_volunteer_email_when_user_email_was_empty(): void
    {
        $user = User::withoutEvents(fn () => User::create([
            'name' => 'Marly Domingues',
            'email' => null,
            'password' => Hash::make('123456'),
        ]));

        Volunteer::query()->create([
            'name' => 'Marly Domingues',
            'email' => 'marly@gmail.com.br',
            'user_id' => $user->id,
            'active' => true,
        ]);

        $resolved = VolunteerAppLogin::findUserByLogin('marly@gmail.com.br');
        $this->assertNotNull($resolved);
        $this->assertSame((int) $user->id, (int) $resolved->id);
        $this->assertSame('marly@gmail.com.br', $resolved->email);

        $this->post('/login', [
            'login' => 'marly@gmail.com.br',
            'password' => '123456',
        ])->assertRedirect(route('mobile.home'));

        $this->assertAuthenticatedAs($user->fresh());
    }

    public function test_login_ready_requires_user_email(): void
    {
        $user = User::withoutEvents(fn () => User::create([
            'name' => 'Sem Login',
            'email' => null,
            'password' => Hash::make('secret'),
        ]));

        $volunteer = Volunteer::query()->create([
            'name' => 'Sem Login',
            'email' => 'sem.login@example.com',
            'user_id' => $user->id,
            'active' => true,
        ]);

        $this->assertFalse(VolunteerAppLogin::loginReady($volunteer));

        VolunteerAppLogin::syncLoginEmailFromVolunteer($user, $volunteer);

        $this->assertTrue(VolunteerAppLogin::loginReady($volunteer->fresh()->load('user')));
    }
}
