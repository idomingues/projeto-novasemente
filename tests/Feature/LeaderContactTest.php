<?php

namespace Tests\Feature;

use App\Models\Church;
use App\Models\Ministry;
use App\Models\User;
use App\Models\Volunteer;
use App\Support\SolicitationAssignees;
use Database\Seeders\ChurchSeeder;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class LeaderContactTest extends TestCase
{
    use RefreshDatabase;

    public function test_leader_options_only_from_voluntariado_ministry(): void
    {
        $this->seed([RolePermissionSeeder::class, ChurchSeeder::class]);

        Role::firstOrCreate(['name' => 'lider_ministerio', 'guard_name' => 'web']);
        Role::firstOrCreate(['name' => 'membro', 'guard_name' => 'web']);

        $churchId = (int) Church::query()->orderBy('id')->value('id');
        $louvor = Ministry::query()->create(['church_id' => $churchId, 'name' => 'Louvor']);
        $voluntariado = Ministry::query()->create(['church_id' => $churchId, 'name' => 'Voluntariado']);

        $member = User::factory()->create(['church_id' => $churchId]);
        $member->assignRole('membro');
        $member->ensureVolunteerProfile();
        $member->volunteerProfile?->ministries()->sync([$louvor->id]);

        $this->createMinistryLeader($churchId, 'Líder Louvor', [$louvor->id]);
        $leaderVoluntariado = $this->createMinistryLeader($churchId, 'Líder Voluntariado', [$voluntariado->id]);

        $options = SolicitationAssignees::leaderContactVolunteerOptions($churchId, $member);

        $this->assertCount(1, $options);
        $this->assertSame((int) $leaderVoluntariado->id, $options[0]['value']);
        $this->assertSame('Líder Voluntariado', $options[0]['label']);
    }

    public function test_member_cannot_start_chat_with_leader_outside_voluntariado(): void
    {
        $this->seed([RolePermissionSeeder::class, ChurchSeeder::class]);

        Role::firstOrCreate(['name' => 'lider_ministerio', 'guard_name' => 'web']);
        Role::firstOrCreate(['name' => 'membro', 'guard_name' => 'web']);

        $churchId = (int) Church::query()->orderBy('id')->value('id');
        $louvor = Ministry::query()->create(['church_id' => $churchId, 'name' => 'Louvor']);
        Ministry::query()->create(['church_id' => $churchId, 'name' => 'Voluntariado']);

        $member = User::factory()->create(['church_id' => $churchId]);
        $member->assignRole('membro');
        $member->ensureVolunteerProfile();
        $member->volunteerProfile?->ministries()->sync([$louvor->id]);

        $leaderLouvor = $this->createMinistryLeader($churchId, 'Líder Louvor', [$louvor->id]);

        $response = $this->actingAs($member)->post(route('mobile.contact.store'), [
            'assigned_volunteer_id' => $leaderLouvor->id,
            'subject' => 'Teste',
            'message' => 'Mensagem de teste para o líder.',
        ]);

        $response->assertSessionHasErrors('assigned_volunteer_id');
    }

    public function test_leader_contact_ministry_is_voluntariado(): void
    {
        $this->seed([RolePermissionSeeder::class, ChurchSeeder::class]);

        $churchId = (int) Church::query()->orderBy('id')->value('id');
        $voluntariado = Ministry::query()->create(['church_id' => $churchId, 'name' => 'Voluntariado']);

        $ministry = SolicitationAssignees::leaderContactMinistryForChurch($churchId);

        $this->assertNotNull($ministry);
        $this->assertSame($voluntariado->id, $ministry['id']);
        $this->assertSame('Voluntariado', $ministry['name']);
    }

    /**
     * @param  list<int>  $ledMinistryIds
     */
    private function createMinistryLeader(int $churchId, string $name, array $ledMinistryIds): Volunteer
    {
        $user = User::factory()->create([
            'church_id' => $churchId,
            'name' => $name,
            'is_ministry_leader' => true,
        ]);
        $user->assignRole('lider_ministerio');
        $user->ministries()->sync($ledMinistryIds);
        $user->ensureVolunteerProfile();

        return $user->volunteerProfile()->firstOrFail();
    }
}
