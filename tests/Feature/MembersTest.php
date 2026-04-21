<?php

namespace Tests\Feature;

use App\Models\Church;
use App\Models\Ministry;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class MembersTest extends TestCase
{
    use RefreshDatabase;

    public function test_guests_cannot_access_members_index(): void
    {
        $response = $this->get('/members');

        $response->assertRedirect('/login');
    }

    public function test_admin_can_view_members_index(): void
    {
        $this->seed();

        $user = User::factory()->create();
        $role = Role::firstOrCreate(['name' => 'admin']);
        $user->assignRole($role);

        $churchId = Church::query()->value('id');
        User::factory()->count(2)->create(['church_id' => $churchId]);

        $response = $this->actingAs($user)->get('/members');

        $response->assertStatus(200);
    }

    public function test_volunteer_member_requires_at_least_one_department_when_ministries_exist(): void
    {
        $this->seed();

        $admin = User::query()->where('email', 'ivan@iresult.com.br')->firstOrFail();
        $churchId = (int) Church::query()->value('id');
        $this->assertGreaterThan(0, Ministry::query()->where('church_id', $churchId)->count());

        $this->actingAs($admin)
            ->withSession(['working_church_id' => $churchId])
            ->post(route('members.store'), [
                'name' => 'Sem Depto',
                'email' => 'sem-depto-membro@example.com',
                'password' => 'Password1!xx',
                'password_confirmation' => 'Password1!xx',
                'status' => 'active',
                'is_volunteer' => true,
                'volunteer_ministry_ids' => [],
                'notify_via_app' => true,
                'notify_via_email' => true,
                'notify_via_whatsapp' => false,
                'lgpd_accepted' => true,
            ])
            ->assertSessionHasErrors('volunteer_ministry_ids');
    }

    public function test_store_member_syncs_volunteer_departments(): void
    {
        $this->seed();

        $admin = User::query()->where('email', 'ivan@iresult.com.br')->firstOrFail();
        $churchId = (int) Church::query()->value('id');
        $ministryId = (int) Ministry::query()->where('church_id', $churchId)->orderBy('id')->value('id');
        $this->assertGreaterThan(0, $ministryId);

        $this->actingAs($admin)
            ->withSession(['working_church_id' => $churchId])
            ->post(route('members.store'), [
                'name' => 'Com Depto',
                'email' => 'com-depto-membro@example.com',
                'password' => 'Password1!xx',
                'password_confirmation' => 'Password1!xx',
                'status' => 'active',
                'is_volunteer' => true,
                'volunteer_ministry_ids' => [$ministryId],
                'notify_via_app' => true,
                'notify_via_email' => true,
                'notify_via_whatsapp' => false,
                'lgpd_accepted' => true,
            ])
            ->assertRedirect(route('members.index'));

        $user = User::query()->where('email', 'com-depto-membro@example.com')->firstOrFail();
        $this->assertTrue($user->is_volunteer);
        $this->assertTrue(
            $user->volunteerProfile?->ministries()->where('ministries.id', $ministryId)->exists() ?? false
        );
    }

    public function test_store_member_assigns_selected_role(): void
    {
        $this->seed();

        $admin = User::query()->where('email', 'ivan@iresult.com.br')->firstOrFail();
        $churchId = (int) Church::query()->value('id');

        $this->actingAs($admin)
            ->withSession(['working_church_id' => $churchId])
            ->post(route('members.store'), [
                'name' => 'User Pastor Role',
                'email' => 'pastor-role-member@example.com',
                'password' => 'Password1!xx',
                'password_confirmation' => 'Password1!xx',
                'status' => 'active',
                'is_volunteer' => false,
                'volunteer_ministry_ids' => [],
                'notify_via_app' => true,
                'notify_via_email' => true,
                'notify_via_whatsapp' => false,
                'lgpd_accepted' => true,
                'role_name' => 'pastor',
            ])
            ->assertRedirect(route('members.index'));

        $user = User::query()->where('email', 'pastor-role-member@example.com')->firstOrFail();
        $this->assertTrue($user->hasRole('pastor'));
    }

    public function test_store_member_without_role_keeps_user_without_any_profile(): void
    {
        $this->seed();

        $admin = User::query()->where('email', 'ivan@iresult.com.br')->firstOrFail();
        $churchId = (int) Church::query()->value('id');

        $this->actingAs($admin)
            ->withSession(['working_church_id' => $churchId])
            ->post(route('members.store'), [
                'name' => 'User Sem Perfil',
                'email' => 'sem-perfil-member@example.com',
                'password' => 'Password1!xx',
                'password_confirmation' => 'Password1!xx',
                'status' => 'active',
                'is_volunteer' => false,
                'volunteer_ministry_ids' => [],
                'notify_via_app' => true,
                'notify_via_email' => true,
                'notify_via_whatsapp' => false,
                'lgpd_accepted' => true,
                'role_name' => '',
            ])
            ->assertRedirect(route('members.index'));

        $user = User::query()->where('email', 'sem-perfil-member@example.com')->firstOrFail();
        $this->assertCount(0, $user->getRoleNames());
    }
}
