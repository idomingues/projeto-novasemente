<?php

namespace Tests\Feature;

use App\Domain\Users\Actions\CreateChurchUserProfile;
use App\Domain\Users\Actions\UpdateChurchUserProfile;
use App\Models\Church;
use App\Models\User;
use App\Models\Volunteer;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MemberVolunteerSeparationTest extends TestCase
{
    use RefreshDatabase;

    public function test_app_member_without_volunteer_flag_has_no_volunteer_row(): void
    {
        $this->seed();

        $churchId = (int) Church::query()->value('id');

        $user = app(CreateChurchUserProfile::class)([
            'name' => 'Só App',
            'email' => 'so-app@example.com',
            'password' => 'Password1!xx',
            'church_id' => $churchId,
            'status' => 'active',
            'is_volunteer' => false,
            'is_ministry_leader' => false,
            'volunteer_ministry_ids' => [],
        ]);

        $this->assertFalse($user->is_volunteer);
        $this->assertNull($user->volunteerProfile);
        $this->assertDatabaseMissing('volunteers', ['user_id' => $user->id]);
    }

    public function test_volunteer_member_gets_operational_volunteer_row(): void
    {
        $this->seed();

        $churchId = (int) Church::query()->value('id');

        $user = app(CreateChurchUserProfile::class)([
            'name' => 'Voluntário App',
            'email' => 'vol-app@example.com',
            'password' => 'Password1!xx',
            'church_id' => $churchId,
            'status' => 'active',
            'is_volunteer' => true,
            'is_ministry_leader' => false,
            'volunteer_ministry_ids' => [],
        ]);

        $volunteer = $user->volunteerProfile;
        $this->assertNotNull($volunteer);
        $this->assertFalse((bool) $volunteer->app_access_only);
    }

    public function test_unchecking_volunteer_removes_app_only_mirror(): void
    {
        $this->seed();

        $churchId = (int) Church::query()->value('id');

        $user = User::factory()->create([
            'church_id' => $churchId,
            'email' => 'toggle-vol@example.com',
            'is_volunteer' => true,
        ]);
        $user->syncVolunteerRecord();
        $this->assertNotNull($user->fresh()->volunteerProfile);

        app(UpdateChurchUserProfile::class)($user, [
            'name' => $user->name,
            'email' => $user->email,
            'status' => 'active',
            'is_volunteer' => false,
            'is_ministry_leader' => false,
            'volunteer_ministry_ids' => [],
        ]);

        $user->refresh();
        $this->assertFalse($user->is_volunteer);
        $this->assertNull($user->volunteerProfile);
    }

    public function test_church_roster_query_excludes_app_access_only_mirrors(): void
    {
        $this->seed();

        $churchId = (int) Church::query()->value('id');

        $mirror = Volunteer::query()->create([
            'name' => 'Espelho App',
            'email' => 'espelho-app@example.com',
            'app_access_only' => true,
            'active' => true,
        ]);

        $operational = Volunteer::query()->create([
            'name' => 'Voluntário Real',
            'email' => 'real-vol@example.com',
            'app_access_only' => false,
            'active' => true,
        ]);

        $visibleIds = \App\Support\VolunteerChurchRosterBuilder::volunteersVisibleInChurchQuery($churchId)
            ->pluck('id')
            ->map(fn ($id) => (int) $id)
            ->all();

        $this->assertContains((int) $operational->id, $visibleIds);
        $this->assertNotContains((int) $mirror->id, $visibleIds);
    }
}
