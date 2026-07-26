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

    public function test_leader_options_include_all_ministry_leaders(): void
    {
        $this->seed([RolePermissionSeeder::class, ChurchSeeder::class]);

        Role::firstOrCreate(['name' => 'membro', 'guard_name' => 'web']);

        $churchId = (int) Church::query()->orderBy('id')->value('id');
        $louvor = Ministry::query()->create(['church_id' => $churchId, 'name' => 'Louvor']);
        $voluntariado = Ministry::query()->create(['church_id' => $churchId, 'name' => 'Voluntariado']);

        $member = User::factory()->create(['church_id' => $churchId]);
        $member->assignRole('membro');

        $leaderLouvor = $this->createMinistryLeader($churchId, 'Líder Louvor', [$louvor->id]);
        $leaderVoluntariado = $this->createMinistryLeader($churchId, 'Líder Voluntariado', [$voluntariado->id]);

        $options = SolicitationAssignees::leaderContactVolunteerOptions($churchId, $member);

        $this->assertCount(2, $options);
        $values = collect($options)->pluck('value')->all();
        $this->assertContains((int) $leaderLouvor->id, $values);
        $this->assertContains((int) $leaderVoluntariado->id, $values);
    }

    public function test_legacy_contact_routes_redirect_to_ns_whats(): void
    {
        $this->seed([RolePermissionSeeder::class, ChurchSeeder::class]);
        Role::firstOrCreate(['name' => 'membro', 'guard_name' => 'web']);

        $churchId = (int) Church::query()->orderBy('id')->value('id');
        $member = User::factory()->create(['church_id' => $churchId]);
        $member->assignRole('membro');

        $this->actingAs($member)->get(route('mobile.contact'))
            ->assertRedirect(route('mobile.ns-whats.index'));
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
        $user->forceFill(['is_ministry_leader' => true])->save();
        $user->ministries()->sync($ledMinistryIds);
        $user->ensureVolunteerProfile();

        return $user->volunteerProfile()->firstOrFail();
    }
}
