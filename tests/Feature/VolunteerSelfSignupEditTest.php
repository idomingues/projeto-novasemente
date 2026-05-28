<?php

namespace Tests\Feature;

use App\Models\Church;
use App\Models\Ministry;
use App\Models\User;
use Database\Seeders\ChurchSeeder;
use Database\Seeders\MinistrySeeder;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class VolunteerSelfSignupEditTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_cannot_access_volunteer_self_edit(): void
    {
        $this->get(route('volunteers.self-signup.edit'))
            ->assertRedirect(route('login', absolute: false));
    }

    public function test_volunteer_can_view_and_update_signup_questionnaire(): void
    {
        $this->seed([RolePermissionSeeder::class, ChurchSeeder::class, MinistrySeeder::class]);

        $churchId = (int) Church::query()->orderBy('id')->value('id');
        $ministry = Ministry::query()->where('church_id', $churchId)->orderBy('name')->firstOrFail();

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
            ->put(route('volunteers.self-signup.edit.update'), [
                'first_name' => 'João',
                'last_name' => 'Silva Santos',
                'birth_date' => '1988-05-20',
                'has_whatsapp' => true,
                'email' => 'joao@example.com',
                'phone' => '11988887777',
                'has_social_networks' => true,
                'attendance_duration' => 'years_1_3',
                'is_official_member' => false,
                'has_previous_ministry_volunteer_experience' => false,
                'is_active_in_ministry' => false,
                'wants_other_ministry' => true,
                'other_ministry_ids' => [$ministry->id],
                'gifts_to_develop' => 'Música',
                'professional_area' => 'TI',
                'lgpd_data_consent' => true,
                'redirect_after_save' => 'mobile.profile.edit',
            ])
            ->assertRedirect(route('mobile.profile.edit', absolute: false))
            ->assertSessionHas('status');

        $volunteer->refresh();
        $user->refresh();

        $this->assertSame('João Silva Santos', $user->name);
        $this->assertSame('11988887777', $volunteer->phone);
        $this->assertSame('years_1_3', $volunteer->attendance_duration);
        $this->assertSame('Música', $volunteer->gifts_to_develop);
        $this->assertSame('TI', $volunteer->professional_area);
        $this->assertTrue($volunteer->lgpd_data_consent);
        $this->assertStringContainsString($ministry->name, (string) $volunteer->other_ministry_interest);
        $this->assertTrue($volunteer->ministries()->whereKey($ministry->id)->exists());
    }

    public function test_volunteer_can_update_password_on_self_signup_edit(): void
    {
        $this->seed([RolePermissionSeeder::class, ChurchSeeder::class, MinistrySeeder::class]);

        $churchId = (int) Church::query()->orderBy('id')->value('id');
        $ministry = Ministry::query()->where('church_id', $churchId)->orderBy('name')->firstOrFail();

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

        $payload = [
            'first_name' => 'Maria',
            'last_name' => 'Souza',
            'birth_date' => '1990-03-15',
            'has_whatsapp' => true,
            'email' => 'maria@example.com',
            'phone' => '11977776666',
            'has_social_networks' => true,
            'attendance_duration' => 'years_1_3',
            'is_official_member' => false,
            'has_previous_ministry_volunteer_experience' => false,
            'is_active_in_ministry' => false,
            'wants_other_ministry' => true,
            'other_ministry_ids' => [$ministry->id],
            'gifts_to_develop' => 'Ensino',
            'professional_area' => 'Educação',
            'lgpd_data_consent' => true,
            'redirect_after_save' => 'mobile.profile.edit',
            'current_password' => 'senhaAtual123',
            'password' => 'novaSenha456',
            'password_confirmation' => 'novaSenha456',
        ];

        $this->actingAs($user)
            ->put(route('volunteers.self-signup.edit.update'), $payload)
            ->assertRedirect(route('mobile.profile.edit', absolute: false))
            ->assertSessionHasNoErrors();

        $this->assertTrue(Hash::check('novaSenha456', $user->fresh()->password));
    }

    public function test_volunteer_self_signup_edit_rejects_wrong_current_password(): void
    {
        $this->seed([RolePermissionSeeder::class, ChurchSeeder::class, MinistrySeeder::class]);

        $churchId = (int) Church::query()->orderBy('id')->value('id');
        $ministry = Ministry::query()->where('church_id', $churchId)->orderBy('name')->firstOrFail();

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
            ->put(route('volunteers.self-signup.edit.update'), [
                'first_name' => 'Pedro',
                'last_name' => 'Lima',
                'birth_date' => '1992-07-10',
                'has_whatsapp' => true,
                'email' => 'pedro@example.com',
                'phone' => '11966665555',
                'has_social_networks' => true,
                'attendance_duration' => 'years_1_3',
                'is_official_member' => false,
                'has_previous_ministry_volunteer_experience' => false,
                'is_active_in_ministry' => false,
                'wants_other_ministry' => true,
                'other_ministry_ids' => [$ministry->id],
                'gifts_to_develop' => 'Música',
                'professional_area' => 'TI',
                'lgpd_data_consent' => true,
                'current_password' => 'senhaErrada',
                'password' => 'novaSenha456',
                'password_confirmation' => 'novaSenha456',
            ])
            ->assertRedirect(route('volunteers.self-signup.edit', absolute: false))
            ->assertSessionHasErrors('current_password');

        $this->assertTrue(Hash::check('senhaAtual123', $user->fresh()->password));
    }

    public function test_edit_passes_resume_page_from_etapa_query(): void
    {
        $this->seed([RolePermissionSeeder::class, ChurchSeeder::class, MinistrySeeder::class]);

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
            ->assertInertia(fn ($page) => $page->where('resumePage', 3));
    }
}
