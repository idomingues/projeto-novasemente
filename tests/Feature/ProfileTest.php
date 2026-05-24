<?php

namespace Tests\Feature;

use App\Models\Church;
use App\Models\Ministry;
use App\Models\User;
use Database\Seeders\ChurchSeeder;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProfileTest extends TestCase
{
    use RefreshDatabase;

    public function test_profile_page_is_displayed(): void
    {
        $user = User::factory()->create();

        $response = $this
            ->actingAs($user)
            ->get('/profile');

        $response->assertOk();
    }

    public function test_profile_information_can_be_updated(): void
    {
        $user = User::factory()->create();

        $response = $this
            ->actingAs($user)
            ->patch('/profile', [
                'name' => 'Test User',
                'email' => 'test@example.com',
            ]);

        $response
            ->assertSessionHasNoErrors()
            ->assertRedirect('/profile');

        $user->refresh();

        $this->assertSame('Test User', $user->name);
        $this->assertSame('test@example.com', $user->email);
        $this->assertNull($user->email_verified_at);
    }

    public function test_profile_update_does_not_change_volunteer_departments(): void
    {
        $this->seed([RolePermissionSeeder::class, ChurchSeeder::class]);

        $churchId = (int) Church::query()->orderBy('id')->value('id');
        $ministry = Ministry::query()->create([
            'church_id' => $churchId,
            'name' => 'Recepção',
        ]);

        $user = User::factory()->create(['church_id' => $churchId]);
        $user->ensureVolunteerProfile();
        $user->volunteerProfile?->ministries()->sync([(int) $ministry->id]);

        $this->actingAs($user)
            ->patch('/profile', [
                'name' => $user->name,
                'email' => $user->email,
                'notify_via_app' => true,
                'notify_via_email' => true,
                'notify_via_whatsapp' => false,
                'volunteer_ministry_ids' => [],
            ])
            ->assertSessionHasNoErrors()
            ->assertRedirect('/profile');

        $user->refresh();
        $this->assertTrue(
            $user->volunteerProfile?->ministries()->where('ministries.id', $ministry->id)->exists() ?? false
        );
    }

    public function test_mobile_profile_update_redirects_with_success_flash(): void
    {
        $user = User::factory()->create(['email' => 'admin@example.com']);

        $response = $this
            ->actingAs($user)
            ->patch('/profile', [
                'name' => 'Admin',
                'email' => 'novo.admin@example.com',
                'notify_via_app' => true,
                'notify_via_email' => true,
                'notify_via_whatsapp' => false,
                'redirect_to' => 'mobile.profile.edit',
            ]);

        $response
            ->assertSessionHasNoErrors()
            ->assertRedirect(route('mobile.profile.edit', absolute: false))
            ->assertSessionHas('success');

        $user->refresh();
        $this->assertSame('novo.admin@example.com', $user->email);
    }

    public function test_profile_update_shows_validation_error_when_email_is_taken(): void
    {
        User::factory()->create(['email' => 'ocupado@example.com']);
        $user = User::factory()->create(['email' => 'admin@example.com']);

        $response = $this
            ->actingAs($user)
            ->from(route('mobile.profile.edit'))
            ->patch('/profile', [
                'name' => $user->name,
                'email' => 'ocupado@example.com',
                'redirect_to' => 'mobile.profile.edit',
            ]);

        $response
            ->assertSessionHasErrors('email')
            ->assertRedirect(route('mobile.profile.edit', absolute: false));

        $this->assertSame('admin@example.com', $user->fresh()->email);
    }

    public function test_profile_update_accepts_inertia_form_data_style_fields_without_photo(): void
    {
        $user = User::factory()->create(['email' => 'antes@example.com']);

        $response = $this
            ->actingAs($user)
            ->patch('/profile', [
                'name' => 'Nome Atualizado',
                'email' => 'depois@example.com',
                'notify_via_app' => '1',
                'notify_via_email' => '1',
                'notify_via_whatsapp' => '0',
                'redirect_to' => 'mobile.profile.edit',
                'photo_file' => '',
            ]);

        $response->assertSessionHasNoErrors()->assertRedirect(route('mobile.profile.edit', absolute: false));

        $user->refresh();
        $this->assertSame('depois@example.com', $user->email);
        $this->assertSame('Nome Atualizado', $user->name);
    }

    public function test_email_verification_status_is_unchanged_when_the_email_address_is_unchanged(): void
    {
        $user = User::factory()->create();

        $response = $this
            ->actingAs($user)
            ->patch('/profile', [
                'name' => 'Test User',
                'email' => $user->email,
            ]);

        $response
            ->assertSessionHasNoErrors()
            ->assertRedirect('/profile');

        $this->assertNotNull($user->refresh()->email_verified_at);
    }

    public function test_user_can_delete_their_account(): void
    {
        $user = User::factory()->create();

        $response = $this
            ->actingAs($user)
            ->delete('/profile', [
                'password' => 'password',
            ]);

        $response
            ->assertSessionHasNoErrors()
            ->assertRedirect('/');

        $this->assertGuest();
        $this->assertNull($user->fresh());
    }

    public function test_correct_password_must_be_provided_to_delete_account(): void
    {
        $user = User::factory()->create();

        $response = $this
            ->actingAs($user)
            ->from('/profile')
            ->delete('/profile', [
                'password' => 'wrong-password',
            ]);

        $response
            ->assertSessionHasErrors('password')
            ->assertRedirect('/profile');

        $this->assertNotNull($user->fresh());
    }
}
