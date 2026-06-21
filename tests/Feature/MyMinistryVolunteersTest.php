<?php

namespace Tests\Feature;

use App\Models\Church;
use App\Models\Ministry;
use App\Models\User;
use App\Models\Volunteer;
use App\Models\VolunteerMinistryInvitation;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class MyMinistryVolunteersTest extends TestCase
{
    use RefreshDatabase;

    public function test_lider_ministerio_role_can_update_volunteer_leader_status_without_checkbox(): void
    {
        $this->seed();

        $church = Church::query()->firstOrFail();
        $ministry = Ministry::query()->where('church_id', $church->id)->firstOrFail();

        $leader = User::factory()->create([
            'church_id' => $church->id,
            'is_ministry_leader' => false,
        ]);
        $leader->assignRole(Role::firstOrCreate(['name' => 'lider_ministerio']));
        $leader->ministries()->sync([$ministry->id]);

        $volunteer = Volunteer::query()->create([
            'user_id' => null,
            'name' => 'Voluntário Líder Teste',
            'email' => 'voluntario.lider.teste@example.com',
            'active' => true,
        ]);
        $volunteer->ministries()->attach($ministry->id);

        $invitation = VolunteerMinistryInvitation::query()->create([
            'church_id' => $church->id,
            'volunteer_id' => $volunteer->id,
            'ministry_id' => $ministry->id,
            'invited_by_user_id' => $leader->id,
            'token' => VolunteerMinistryInvitation::createToken(),
            'status' => 'pending',
        ]);

        $response = $this->actingAs($leader)->patch(
            route('ministry-lead.my-volunteers.update', $invitation),
            ['leader_status' => 'active'],
        );

        $response->assertRedirect();
        $response->assertSessionHasNoErrors();

        $invitation->refresh();
        $this->assertSame('active', $invitation->leader_status);
        $this->assertTrue($volunteer->ministries()->whereKey($ministry->id)->exists());
    }

    public function test_leader_denied_status_detaches_volunteer_from_ministry(): void
    {
        $this->seed();

        $church = Church::query()->firstOrFail();
        $ministry = Ministry::query()->where('church_id', $church->id)->firstOrFail();

        $leader = User::factory()->create([
            'church_id' => $church->id,
            'is_ministry_leader' => false,
        ]);
        $leader->assignRole(Role::firstOrCreate(['name' => 'lider_ministerio']));
        $leader->ministries()->sync([$ministry->id]);

        $volunteer = Volunteer::query()->create([
            'user_id' => null,
            'name' => 'Voluntário Recusado',
            'email' => 'voluntario.recusado@example.com',
            'active' => true,
        ]);
        $volunteer->ministries()->attach($ministry->id);

        $invitation = VolunteerMinistryInvitation::query()->create([
            'church_id' => $church->id,
            'volunteer_id' => $volunteer->id,
            'ministry_id' => $ministry->id,
            'invited_by_user_id' => $leader->id,
            'token' => VolunteerMinistryInvitation::createToken(),
            'status' => 'pending',
        ]);

        $response = $this->actingAs($leader)->patch(
            route('ministry-lead.my-volunteers.update', $invitation),
            [
                'leader_status' => 'denied',
                'leader_note' => 'Perfil não compatível com a equipe neste ciclo.',
            ],
        );

        $response->assertRedirect();
        $response->assertSessionHasNoErrors();

        $invitation->refresh();
        $this->assertSame('denied', $invitation->leader_status);
        $this->assertFalse($volunteer->fresh()->ministries()->whereKey($ministry->id)->exists());
    }

    public function test_leader_can_open_my_volunteers_index_with_joined_volunteers(): void
    {
        $this->seed();

        $church = Church::query()->firstOrFail();
        $ministry = Ministry::query()->where('church_id', $church->id)->firstOrFail();

        $leader = User::factory()->create([
            'church_id' => $church->id,
            'is_ministry_leader' => false,
        ]);
        $leader->assignRole(Role::firstOrCreate(['name' => 'lider_ministerio']));
        $leader->ministries()->sync([$ministry->id]);

        $volunteer = Volunteer::query()->create([
            'name' => 'Voluntário Lista',
            'email' => 'lista.voluntario@example.com',
            'active' => true,
        ]);

        VolunteerMinistryInvitation::query()->create([
            'church_id' => $church->id,
            'volunteer_id' => $volunteer->id,
            'ministry_id' => $ministry->id,
            'invited_by_user_id' => $leader->id,
            'token' => VolunteerMinistryInvitation::createToken(),
            'status' => 'accepted',
        ]);

        $this->actingAs($leader)
            ->withSession(['working_church_id' => $church->id])
            ->get(route('ministry-lead.my-volunteers.index'))
            ->assertOk();
    }

    public function test_non_leader_cannot_access_my_volunteers_index(): void
    {
        $this->seed();

        $user = User::factory()->create(['is_ministry_leader' => false]);
        $user->assignRole(Role::firstOrCreate(['name' => 'membro']));

        $this->actingAs($user)
            ->get(route('ministry-lead.my-volunteers.index'))
            ->assertForbidden();
    }

    public function test_forwarded_volunteer_without_leader_status_appears_as_novo(): void
    {
        $this->seed();

        $church = Church::query()->firstOrFail();
        $ministry = Ministry::query()->where('church_id', $church->id)->firstOrFail();

        $leader = User::factory()->create([
            'church_id' => $church->id,
            'is_ministry_leader' => true,
        ]);
        $leader->assignRole(Role::firstOrCreate(['name' => 'lider_ministerio']));
        $leader->ministries()->sync([$ministry->id]);

        $volunteer = Volunteer::query()->create([
            'name' => 'Encaminhado Novo',
            'email' => 'encaminhado.novo@example.com',
            'active' => true,
        ]);

        VolunteerMinistryInvitation::query()->create([
            'church_id' => $church->id,
            'volunteer_id' => $volunteer->id,
            'ministry_id' => $ministry->id,
            'invited_by_user_id' => $leader->id,
            'token' => VolunteerMinistryInvitation::createToken(),
            'status' => 'pending',
            'channel' => 'email',
            'sent_at' => now(),
        ]);

        $response = $this->actingAs($leader)
            ->withSession(['working_church_id' => $church->id])
            ->get(route('ministry-lead.my-volunteers.index'));

        $response->assertOk();
        $page = json_decode(json_encode($response->viewData('page')), true);
        $rows = $page['props']['invitations']['data'] ?? [];
        $row = collect($rows)->firstWhere('volunteer.email', 'encaminhado.novo@example.com');

        $this->assertNotNull($row);
        $this->assertNull($row['leaderStatus']);
    }

    public function test_attached_volunteer_without_invitation_leader_status_is_not_active(): void
    {
        $this->seed();

        $church = Church::query()->firstOrFail();
        $ministry = Ministry::query()->where('church_id', $church->id)->firstOrFail();

        $leader = User::factory()->create([
            'church_id' => $church->id,
            'is_ministry_leader' => true,
        ]);
        $leader->assignRole(Role::firstOrCreate(['name' => 'lider_ministerio']));
        $leader->ministries()->sync([$ministry->id]);

        $volunteer = Volunteer::query()->create([
            'name' => 'Vinculado Sem Convite',
            'email' => 'vinculado.sem.convite@example.com',
            'active' => true,
        ]);
        $volunteer->ministries()->attach($ministry->id);

        $response = $this->actingAs($leader)
            ->withSession(['working_church_id' => $church->id])
            ->get(route('ministry-lead.my-volunteers.index'));

        $response->assertOk();
        $page = json_decode(json_encode($response->viewData('page')), true);
        $rows = $page['props']['activeVolunteers'] ?? [];
        $row = collect($rows)->firstWhere('volunteer.email', 'vinculado.sem.convite@example.com');

        $this->assertNotNull($row);
        $this->assertNull($row['leaderStatus']);
    }
}
