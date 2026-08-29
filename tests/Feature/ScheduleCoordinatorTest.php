<?php

namespace Tests\Feature;

use App\Models\Church;
use App\Models\Ministry;
use App\Models\ScheduleAssignment;
use App\Models\ScheduleCoordinator;
use App\Models\User;
use App\Models\Volunteer;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ScheduleCoordinatorTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @return array{church: Church, ministry: Ministry, otherMinistry: Ministry, leader: User, coordinator: User, coordinatorVolunteer: Volunteer, teammateVolunteer: Volunteer}
     */
    private function boardContext(): array
    {
        $this->seed();

        $church = Church::query()->firstOrFail();
        $ministry = Ministry::query()->where('church_id', $church->id)->orderBy('id')->firstOrFail();
        $otherMinistry = Ministry::query()
            ->where('church_id', $church->id)
            ->where('id', '!=', $ministry->id)
            ->orderBy('id')
            ->firstOrFail();

        $leader = User::factory()->create([
            'church_id' => $church->id,
            'is_ministry_leader' => false,
        ]);
        $leader->forceFill(['is_ministry_leader' => true])->save();
        $leader->ministries()->sync([$ministry->id]);

        $coordinator = User::factory()->create([
            'church_id' => $church->id,
            'is_volunteer' => true,
            'is_ministry_leader' => false,
        ]);
        $coordinatorVolunteer = $coordinator->volunteerProfile;
        $this->assertNotNull($coordinatorVolunteer);
        $coordinatorVolunteer->ministries()->syncWithoutDetaching([$ministry->id]);
        $coordinatorVolunteer->forceFill(['active' => true])->save();

        $teammate = User::factory()->create([
            'church_id' => $church->id,
            'is_volunteer' => true,
            'is_ministry_leader' => false,
        ]);
        $teammateVolunteer = $teammate->volunteerProfile;
        $this->assertNotNull($teammateVolunteer);
        $teammateVolunteer->ministries()->syncWithoutDetaching([$ministry->id]);
        $teammateVolunteer->forceFill(['active' => true])->save();

        return [
            'church' => $church,
            'ministry' => $ministry,
            'otherMinistry' => $otherMinistry,
            'leader' => $leader,
            'coordinator' => $coordinator,
            'coordinatorVolunteer' => $coordinatorVolunteer,
            'teammateVolunteer' => $teammateVolunteer,
        ];
    }

    public function test_leader_defines_recurring_coordinator_on_first_and_third_saturday(): void
    {
        $ctx = $this->boardContext();

        $this->actingAs($ctx['leader'])
            ->withSession(['working_church_id' => $ctx['church']->id])
            ->post(route('escalas.coordinators.store'), [
                'ministry_id' => $ctx['ministry']->id,
                'volunteer_id' => $ctx['coordinatorVolunteer']->id,
                'saturday_number' => 1,
                'recurring' => true,
                'view_month' => now()->month,
                'view_year' => now()->year,
            ])
            ->assertRedirect()
            ->assertSessionHasNoErrors();

        $this->actingAs($ctx['leader'])
            ->withSession(['working_church_id' => $ctx['church']->id])
            ->post(route('escalas.coordinators.store'), [
                'ministry_id' => $ctx['ministry']->id,
                'volunteer_id' => $ctx['coordinatorVolunteer']->id,
                'saturday_number' => 3,
                'recurring' => true,
                'view_month' => now()->month,
                'view_year' => now()->year,
            ])
            ->assertRedirect()
            ->assertSessionHasNoErrors();

        $this->assertSame(2, ScheduleCoordinator::query()
            ->where('volunteer_id', $ctx['coordinatorVolunteer']->id)
            ->whereIn('saturday_number', [1, 3])
            ->count());
    }

    public function test_coordinator_can_add_and_remove_volunteer_only_on_their_saturday(): void
    {
        $ctx = $this->boardContext();

        ScheduleCoordinator::query()->create([
            'ministry_id' => $ctx['ministry']->id,
            'volunteer_id' => $ctx['coordinatorVolunteer']->id,
            'user_id' => $ctx['coordinator']->id,
            'saturday_number' => 1,
            'schedule_date' => null,
            'recurring' => true,
        ]);

        $this->actingAs($ctx['coordinator'])
            ->withSession(['working_church_id' => $ctx['church']->id])
            ->post(route('escalas.store'), [
                'ministry_id' => $ctx['ministry']->id,
                'volunteer_id' => $ctx['teammateVolunteer']->id,
                'saturday_number' => 1,
                'recurring' => true,
                'view_month' => now()->month,
                'view_year' => now()->year,
                'status' => 'pending',
            ])
            ->assertRedirect()
            ->assertSessionHasNoErrors();

        $assignment = ScheduleAssignment::query()
            ->where('volunteer_id', $ctx['teammateVolunteer']->id)
            ->where('saturday_number', 1)
            ->first();
        $this->assertNotNull($assignment);

        $this->actingAs($ctx['coordinator'])
            ->withSession(['working_church_id' => $ctx['church']->id])
            ->post(route('escalas.store'), [
                'ministry_id' => $ctx['ministry']->id,
                'volunteer_id' => $ctx['teammateVolunteer']->id,
                'saturday_number' => 2,
                'recurring' => true,
                'view_month' => now()->month,
                'view_year' => now()->year,
                'status' => 'pending',
            ])
            ->assertRedirect()
            ->assertSessionHasErrors('ministry_id');

        $this->actingAs($ctx['coordinator'])
            ->withSession(['working_church_id' => $ctx['church']->id])
            ->delete(route('escalas.destroy', $assignment), ['scope' => 'all'])
            ->assertRedirect()
            ->assertSessionHasNoErrors();

        $this->assertDatabaseMissing('schedule_assignments', ['id' => $assignment->id]);
    }

    public function test_coordinator_cannot_define_coordinator_or_open_checkin(): void
    {
        $ctx = $this->boardContext();

        ScheduleCoordinator::query()->create([
            'ministry_id' => $ctx['ministry']->id,
            'volunteer_id' => $ctx['coordinatorVolunteer']->id,
            'user_id' => $ctx['coordinator']->id,
            'saturday_number' => 1,
            'schedule_date' => null,
            'recurring' => true,
        ]);

        $this->actingAs($ctx['coordinator'])
            ->withSession(['working_church_id' => $ctx['church']->id])
            ->post(route('escalas.coordinators.store'), [
                'ministry_id' => $ctx['ministry']->id,
                'volunteer_id' => $ctx['teammateVolunteer']->id,
                'saturday_number' => 2,
                'recurring' => true,
            ])
            ->assertRedirect()
            ->assertSessionHasErrors('ministry_id');

        $this->actingAs($ctx['coordinator'])
            ->withSession(['working_church_id' => $ctx['church']->id])
            ->post(route('escalas.checkin-toggle'), [
                'schedule_date' => now()->next('Saturday')->format('Y-m-d'),
                'enabled' => true,
            ])
            ->assertForbidden();
    }

    public function test_ministry_without_coordinator_stays_read_only_for_volunteer(): void
    {
        $ctx = $this->boardContext();

        $this->actingAs($ctx['coordinator'])
            ->withSession(['working_church_id' => $ctx['church']->id])
            ->get(route('escalas.index', [
                'ministry_id' => $ctx['ministry']->id,
                'month' => now()->month,
                'year' => now()->year,
            ]))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Escalas/Index')
                ->where('canAssignCoordinator', false)
                ->where('canEdit', false)
                ->has('coordinators', 0)
            );

        $this->actingAs($ctx['leader'])
            ->withSession(['working_church_id' => $ctx['church']->id])
            ->get(route('escalas.index', [
                'ministry_id' => $ctx['ministry']->id,
                'month' => now()->month,
                'year' => now()->year,
            ]))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Escalas/Index')
                ->where('canAssignCoordinator', true)
                ->where('canEdit', true)
                ->has('coordinators', 0)
            );
    }

    public function test_coordinator_sees_schedule_board_and_shared_auth_flag(): void
    {
        $ctx = $this->boardContext();

        ScheduleCoordinator::query()->create([
            'ministry_id' => $ctx['ministry']->id,
            'volunteer_id' => $ctx['coordinatorVolunteer']->id,
            'user_id' => $ctx['coordinator']->id,
            'saturday_number' => 1,
            'schedule_date' => null,
            'recurring' => true,
        ]);

        $this->actingAs($ctx['coordinator'])
            ->withSession(['working_church_id' => $ctx['church']->id])
            ->get(route('escalas.index', [
                'ministry_id' => $ctx['ministry']->id,
                'month' => now()->month,
                'year' => now()->year,
            ]))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Escalas/Index')
                ->where('auth.isScheduleCoordinator', true)
                ->where('canAssignCoordinator', false)
                ->where('canEdit', true)
                ->has('editableSaturdayNumbers', 1)
                ->where('editableSaturdayNumbers.0', 1)
                ->has('coordinators', 1)
            );
    }
}
