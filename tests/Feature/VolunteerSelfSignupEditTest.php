<?php

namespace Tests\Feature;

use App\Models\Church;
use App\Models\User;
use Database\Seeders\ChurchSeeder;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class VolunteerSelfSignupEditTest extends TestCase
{
    use RefreshDatabase;

    /** @return array<string, mixed> */
    private function completePayload(array $overrides = []): array
    {
        return array_merge([
            'first_name' => 'João',
            'last_name' => 'Silva',
            'birth_date' => '1988-05-20',
            'has_whatsapp' => true,
            'email' => 'joao@example.com',
            'phone' => '11988887777',
            'has_social_networks' => true,
            'social_network_profiles' => '@joao.ns',
            'professional_area' => 'TI',
            'attendance_duration' => 'years_1_2',
            'is_official_member' => false,
            'volunteer_phase' => 'interested',
            'service_ease_areas' => ['technology', 'communication'],
            'comfortable_with_digital_tools' => true,
            'service_greatest_strength' => 'Organização',
            'service_greatest_challenge' => 'Tempo disponível',
            'lgpd_data_consent' => true,
            'redirect_after_save' => 'mobile.profile.edit',
        ], $overrides);
    }

    public function test_guest_cannot_access_volunteer_self_edit(): void
    {
        $this->get(route('volunteers.self-signup.edit'))
            ->assertRedirect(route('login', absolute: false));
    }

    public function test_volunteer_can_view_and_update_signup_questionnaire(): void
    {
        $this->seed([RolePermissionSeeder::class, ChurchSeeder::class]);

        $churchId = (int) Church::query()->orderBy('id')->value('id');

        $user = User::factory()->create([
            'church_id' => $churchId,
            'is_volunteer' => true,
            'name' => 'João Silva',
            'email' => 'joao@example.com',
            'photo_url' => 'https://example.com/photos/joao.jpg',
        ]);

        $volunteer = $user->fresh()->volunteerProfile;
        $this->assertNotNull($volunteer);

        $this->actingAs($user)
            ->get(route('mobile.profile.edit'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->has('volunteerSignupCompletion'));

        $this->actingAs($user)
            ->get(route('volunteers.self-signup.edit'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Volunteers/PublicSignup')
                ->where('mode', 'edit')
                ->where('focusMissingOnly', false)
                ->where('existingRegistrationNotice', true)
                ->has('initial')
                ->has('ministries')
                ->has('signupCompletion'));

        $this->actingAs($user)
            ->get(route('volunteers.self-signup.edit', ['missing' => 1]))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Volunteers/PublicSignup')
                ->where('focusMissingOnly', true)
                ->has('missingFields'));

        $this->actingAs($user)
            ->put(route('volunteers.self-signup.edit.update'), $this->completePayload([
                'last_name' => 'Silva Santos',
            ]))
            ->assertRedirect(route('mobile.profile.edit', absolute: false))
            ->assertSessionHas('status');

        $volunteer->refresh();
        $user->refresh();

        $this->assertSame('João Silva Santos', $user->name);
        $this->assertSame('11988887777', $volunteer->phone);
        $this->assertSame('years_1_2', $volunteer->attendance_duration);
        $this->assertSame('TI', $volunteer->professional_area);
        $this->assertSame('interested', $volunteer->volunteer_phase);
        $this->assertTrue($volunteer->lgpd_data_consent);
        $this->assertTrue($user->is_volunteer);
    }

    public function test_volunteer_can_update_password_on_self_signup_edit(): void
    {
        $this->seed([RolePermissionSeeder::class, ChurchSeeder::class]);

        $churchId = (int) Church::query()->orderBy('id')->value('id');

        $user = User::factory()->create([
            'church_id' => $churchId,
            'is_volunteer' => true,
            'name' => 'Maria Souza',
            'email' => 'maria@example.com',
            'password' => Hash::make('senhaAtual123'),
            'photo_url' => 'https://example.com/photos/maria.jpg',
        ]);

        $volunteer = $user->fresh()->volunteerProfile;
        $this->assertNotNull($volunteer);

        $this->actingAs($user)
            ->put(route('volunteers.self-signup.edit.update'), $this->completePayload([
                'first_name' => 'Maria',
                'last_name' => 'Souza',
                'email' => 'maria@example.com',
                'phone' => '11977776666',
                'professional_area' => 'Educação',
                'current_password' => 'senhaAtual123',
                'password' => 'novaSenha456',
                'password_confirmation' => 'novaSenha456',
            ]))
            ->assertRedirect(route('mobile.profile.edit', absolute: false))
            ->assertSessionHasNoErrors();

        $this->assertTrue(Hash::check('novaSenha456', $user->fresh()->password));
    }

    public function test_volunteer_self_signup_edit_rejects_wrong_current_password(): void
    {
        $this->seed([RolePermissionSeeder::class, ChurchSeeder::class]);

        $churchId = (int) Church::query()->orderBy('id')->value('id');

        $user = User::factory()->create([
            'church_id' => $churchId,
            'is_volunteer' => true,
            'name' => 'Pedro Lima',
            'email' => 'pedro@example.com',
            'password' => Hash::make('senhaAtual123'),
            'photo_url' => 'https://example.com/photos/pedro.jpg',
        ]);

        $this->actingAs($user)
            ->from(route('volunteers.self-signup.edit'))
            ->put(route('volunteers.self-signup.edit.update'), $this->completePayload([
                'first_name' => 'Pedro',
                'last_name' => 'Lima',
                'email' => 'pedro@example.com',
                'phone' => '11966665555',
                'current_password' => 'senhaErrada',
                'password' => 'novaSenha456',
                'password_confirmation' => 'novaSenha456',
            ]))
            ->assertRedirect(route('volunteers.self-signup.edit', absolute: false))
            ->assertSessionHasErrors('current_password');

        $this->assertTrue(Hash::check('senhaAtual123', $user->fresh()->password));
    }

    public function test_edit_passes_resume_page_from_etapa_query(): void
    {
        $this->seed([RolePermissionSeeder::class, ChurchSeeder::class]);

        $churchId = (int) Church::query()->orderBy('id')->value('id');

        $user = User::factory()->create([
            'church_id' => $churchId,
            'is_volunteer' => true,
            'name' => 'Ana Costa',
            'email' => 'ana.resume@example.com',
            'photo_url' => 'https://example.com/photos/ana.jpg',
        ]);

        $this->actingAs($user)
            ->get(route('volunteers.self-signup.edit', ['etapa' => 2]))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->where('resumePage', 1));

        $this->actingAs($user)
            ->get(route('volunteers.self-signup.edit', ['etapa' => 4]))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->where('resumePage', null));
    }
}
