<?php

namespace Tests\Feature;

use App\Models\Church;
use App\Models\Ministry;
use App\Models\User;
use App\Support\MemberRoleAssignment;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;
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

        $response = $this->actingAs($user)->get('/users');

        $response->assertOk();
    }

    public function test_admin_role_gets_assignable_roles_even_without_members_manage_permission(): void
    {
        $this->seed();

        $user = User::factory()->create();
        $guard = (string) config('auth.defaults.guard');
        $adminRole = Role::firstOrCreate(['name' => 'admin', 'guard_name' => $guard]);
        $user->assignRole($adminRole);
        $kept = array_values(array_filter(
            $adminRole->permissions()->pluck('name')->map(fn ($n) => (string) $n)->all(),
            fn (string $n) => ! in_array($n, ['members.manage', 'roles.manage'], true)
        ));
        $adminRole->syncPermissions($kept);
        app(PermissionRegistrar::class)->forgetCachedPermissions();
        $user->unsetRelation('roles')->unsetRelation('permissions');

        $names = MemberRoleAssignment::assignableRoleNames($user->fresh());

        $this->assertNotEmpty($names);
        $this->assertNotContains('admin', $names);
        $this->assertNotContains('super_admin', $names);
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
            ->assertRedirect(route('users.index'));

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
            ->assertRedirect(route('users.index'));

        $user = User::query()->where('email', 'pastor-role-member@example.com')->firstOrFail();
        $this->assertTrue($user->hasRole('pastor'));
        $pastorId = (int) Role::query()->where('name', 'pastor')->where('guard_name', config('auth.defaults.guard'))->value('id');
        $this->assertSame($pastorId, (int) $user->fresh()->role_id);
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
            ->assertRedirect(route('users.index'));

        $user = User::query()->where('email', 'sem-perfil-member@example.com')->firstOrFail();
        $this->assertCount(0, $user->getRoleNames());
    }

    public function test_update_member_syncs_assignable_roles_with_put_and_post_method_spoof(): void
    {
        $this->seed();

        $admin = User::query()->where('email', 'ivan@iresult.com.br')->firstOrFail();
        $churchId = (int) Church::query()->value('id');
        $member = User::factory()->create([
            'church_id' => $churchId,
            'email' => 'update-role-member@example.com',
        ]);
        $this->assertCount(0, $member->fresh()->getRoleNames());

        $payload = [
            'name' => $member->name,
            'email' => $member->email,
            'phone' => '',
            'birth_date' => '',
            'status' => 'active',
            'is_volunteer' => false,
            'volunteer_ministry_ids' => [],
            'notify_via_app' => true,
            'notify_via_email' => true,
            'notify_via_whatsapp' => false,
            'role_name' => 'pastor',
        ];

        // PUT directo (cliente de testes) — o papel deve persistir.
        $putResponse = $this->actingAs($admin)
            ->withSession(['working_church_id' => $churchId])
            ->from(route('users.index'))
            ->put(route('members.update', $member), $payload);

        $putResponse->assertSessionDoesntHaveErrors();
        $putResponse->assertRedirect(route('users.index'));

        $this->assertTrue($member->fresh()->hasRole('pastor'));

        // Mesmo fluxo que o painel com forceFormData: POST + _method (PHP preenche multipart em POST).
        $this->actingAs($admin)
            ->withSession(['working_church_id' => $churchId])
            ->from(route('users.index'))
            ->post(route('members.update', $member), array_merge($payload, ['role_name' => 'secretaria', '_method' => 'PUT']))
            ->assertRedirect(route('users.index'));

        $this->assertTrue($member->fresh()->hasRole('secretaria'));
        $secretariaId = (int) Role::query()->where('name', 'secretaria')->where('guard_name', config('auth.defaults.guard'))->value('id');
        $this->assertSame($secretariaId, (int) $member->fresh()->role_id);
    }

    public function test_update_member_assigns_role_when_multipart_includes_photo(): void
    {
        $this->seed();

        $admin = User::query()->where('email', 'ivan@iresult.com.br')->firstOrFail();
        $churchId = (int) Church::query()->value('id');
        $member = User::factory()->create([
            'church_id' => $churchId,
            'email' => 'multipart-role-member@example.com',
        ]);
        $this->assertCount(0, $member->fresh()->getRoleNames());

        $payload = [
            'name' => $member->name,
            'email' => $member->email,
            'phone' => '',
            'birth_date' => '',
            'status' => 'active',
            'is_volunteer' => false,
            'volunteer_ministry_ids' => [],
            'notify_via_app' => true,
            'notify_via_email' => true,
            'notify_via_whatsapp' => false,
            'role_name' => 'pastor',
            '_method' => 'PUT',
            'photo' => UploadedFile::fake()->image('face.jpg', 100, 100),
        ];

        $this->actingAs($admin)
            ->withSession(['working_church_id' => $churchId])
            ->from(route('users.index'))
            ->post(route('members.update', $member), $payload)
            ->assertRedirect(route('users.index'));

        $this->assertTrue($member->fresh()->hasRole('pastor'));
    }

    public function test_update_member_can_clear_role_with_empty_role_name(): void
    {
        $this->seed();

        $admin = User::query()->where('email', 'ivan@iresult.com.br')->firstOrFail();
        $churchId = (int) Church::query()->value('id');
        $member = User::factory()->create([
            'church_id' => $churchId,
            'email' => 'clear-role-member@example.com',
        ]);
        $member->assignRole('pastor');
        $member->syncRoleIdFromSpatieAssignments();
        $this->assertTrue($member->fresh()->hasRole('pastor'));

        $payload = [
            'name' => $member->name,
            'email' => $member->email,
            'phone' => '',
            'birth_date' => '',
            'status' => 'active',
            'is_volunteer' => false,
            'volunteer_ministry_ids' => [],
            'notify_via_app' => true,
            'notify_via_email' => true,
            'notify_via_whatsapp' => false,
            'role_name' => '',
        ];

        $this->actingAs($admin)
            ->withSession(['working_church_id' => $churchId])
            ->from(route('users.index'))
            ->put(route('members.update', $member), $payload)
            ->assertRedirect(route('users.index'));

        $this->assertCount(0, $member->fresh()->getRoleNames());
        $this->assertNull($member->fresh()->role_id);
    }

    public function test_user_cannot_change_own_role_assignment(): void
    {
        $this->seed();

        $churchId = (int) Church::query()->value('id');
        $guard = (string) config('auth.defaults.guard');
        $superRole = Role::firstOrCreate(['name' => 'super_admin', 'guard_name' => $guard]);
        $super = User::factory()->create([
            'church_id' => $churchId,
            'email' => 'self-role-lock@example.com',
        ]);
        $super->assignRole($superRole);
        app(PermissionRegistrar::class)->forgetCachedPermissions();
        $this->assertTrue($super->fresh()->hasRole('super_admin'));

        $payload = [
            'name' => $super->name,
            'email' => $super->email,
            'phone' => (string) ($super->phone ?? ''),
            'birth_date' => '',
            'status' => 'active',
            'is_volunteer' => false,
            'volunteer_ministry_ids' => [],
            'notify_via_app' => true,
            'notify_via_email' => true,
            'notify_via_whatsapp' => false,
            'role_name' => '',
        ];

        $this->actingAs($super)
            ->withSession(['working_church_id' => $churchId])
            ->from(route('users.index'))
            ->put(route('members.update', $super), $payload)
            ->assertRedirect(route('users.index'))
            ->assertSessionHas('error');

        $this->assertTrue($super->fresh()->hasRole('super_admin'));
    }

    public function test_super_admin_can_set_new_password_when_updating_member(): void
    {
        $this->seed();

        $super = User::query()->where('email', 'ivan@iresult.com.br')->firstOrFail();
        $this->assertTrue($super->hasRole('super_admin'));
        $churchId = (int) Church::query()->value('id');
        $member = User::factory()->create([
            'church_id' => $churchId,
            'email' => 'pwd-update-member@example.com',
            'password' => Hash::make('Original-Password1!'),
        ]);

        $payload = [
            'name' => $member->name,
            'email' => $member->email,
            'phone' => '',
            'birth_date' => '',
            'status' => 'active',
            'is_volunteer' => false,
            'volunteer_ministry_ids' => [],
            'notify_via_app' => true,
            'notify_via_email' => true,
            'notify_via_whatsapp' => false,
            'password' => 'Replaced-Password2!',
            'password_confirmation' => 'Replaced-Password2!',
        ];

        $this->actingAs($super)
            ->withSession(['working_church_id' => $churchId])
            ->put(route('members.update', $member), $payload)
            ->assertSessionDoesntHaveErrors()
            ->assertRedirect(route('users.index'));

        $this->assertTrue(Hash::check('Replaced-Password2!', $member->fresh()->password));
    }

    public function test_admin_can_set_new_password_when_updating_member(): void
    {
        $this->seed();

        $churchId = (int) Church::query()->value('id');
        $guard = (string) config('auth.defaults.guard');
        $adminRole = Role::firstOrCreate(['name' => 'admin', 'guard_name' => $guard]);
        $manager = User::factory()->create(['church_id' => $churchId]);
        $manager->assignRole($adminRole);
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $member = User::factory()->create([
            'church_id' => $churchId,
            'email' => 'pwd-admin-update@example.com',
            'password' => Hash::make('Stable-Password1!'),
        ]);

        $payload = [
            'name' => $member->name,
            'email' => $member->email,
            'phone' => '',
            'birth_date' => '',
            'status' => 'active',
            'is_volunteer' => false,
            'volunteer_ministry_ids' => [],
            'notify_via_app' => true,
            'notify_via_email' => true,
            'notify_via_whatsapp' => false,
            'password' => 'Replaced-Password2!',
            'password_confirmation' => 'Replaced-Password2!',
        ];

        $this->actingAs($manager)
            ->withSession(['working_church_id' => $churchId])
            ->put(route('members.update', $member), $payload)
            ->assertSessionDoesntHaveErrors()
            ->assertRedirect(route('users.index'));

        $this->assertTrue(Hash::check('Replaced-Password2!', $member->fresh()->password));
    }

    public function test_member_update_without_manage_permission_does_not_change_password_even_if_sent(): void
    {
        $this->seed();

        $churchId = (int) Church::query()->value('id');
        $guard = (string) config('auth.defaults.guard');
        $viewerRole = Role::firstOrCreate(['name' => 'membro', 'guard_name' => $guard]);
        $viewer = User::factory()->create(['church_id' => $churchId]);
        $viewer->assignRole($viewerRole);
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $member = User::factory()->create([
            'church_id' => $churchId,
            'email' => 'pwd-locked-member@example.com',
            'password' => Hash::make('Stable-Password1!'),
        ]);
        $hashBefore = $member->fresh()->password;

        $payload = [
            'name' => $member->name,
            'email' => $member->email,
            'phone' => '',
            'birth_date' => '',
            'status' => 'active',
            'is_volunteer' => false,
            'volunteer_ministry_ids' => [],
            'notify_via_app' => true,
            'notify_via_email' => true,
            'notify_via_whatsapp' => false,
            'password' => 'Hacker-Password2!',
            'password_confirmation' => 'Hacker-Password2!',
        ];

        $this->actingAs($viewer)
            ->withSession(['working_church_id' => $churchId])
            ->put(route('members.update', $member), $payload);

        $this->assertSame($hashBefore, $member->fresh()->password);
        $this->assertFalse(Hash::check('Hacker-Password2!', $member->fresh()->password));
    }

    public function test_members_index_filters_leaders_and_ministry(): void
    {
        $this->seed();

        $churchId = (int) Church::query()->value('id');
        $guard = (string) config('auth.defaults.guard');
        $admin = User::factory()->create(['church_id' => $churchId]);
        $admin->assignRole(Role::firstOrCreate(['name' => 'admin', 'guard_name' => $guard]));

        $ministryA = Ministry::query()->create([
            'church_id' => $churchId,
            'name' => 'Dept Filtro Único A',
        ]);

        $leader = User::factory()->create([
            'church_id' => $churchId,
            'email' => 'lider-filtro@example.com',
            'is_ministry_leader' => true,
        ]);
        $leader->assignRole(Role::firstOrCreate(['name' => 'lider_ministerio', 'guard_name' => $guard]));
        $leader->ministries()->sync([(int) $ministryA->id]);

        User::factory()->create([
            'church_id' => $churchId,
            'email' => 'outro@example.com',
        ]);

        $session = ['working_church_id' => $churchId];

        $this->actingAs($admin)
            ->withSession($session)
            ->get(route('users.index', ['leaders_only' => 1]))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Users/Index')
                ->where('filters.leaders_only', '1')
                ->has('members.data', 1)
                ->where('members.data.0.email', 'lider-filtro@example.com'));

        $this->actingAs($admin)
            ->withSession($session)
            ->get(route('users.index', ['ministry_id' => $ministryA->id]))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->has('members.data', 1)
                ->where('members.data.0.email', 'lider-filtro@example.com'));
    }
}
