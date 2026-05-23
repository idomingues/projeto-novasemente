<?php

namespace Tests\Feature;

use App\Models\Church;
use App\Models\SharedTalentCategory;
use App\Models\SharedTalentEnrollment;
use App\Models\SharedTalentListing;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class SharedTalentEnrollmentTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    private function usersAndListing(): array
    {
        $church = Church::query()->firstOrFail();
        $publisher = User::factory()->create(['church_id' => $church->id]);
        $participant = User::factory()->create(['church_id' => $church->id]);
        $publisher->assignRole(Role::firstOrCreate(['name' => 'membro']));
        $participant->assignRole(Role::firstOrCreate(['name' => 'membro']));
        $category = SharedTalentCategory::query()->firstOrFail();

        $listing = SharedTalentListing::create([
            'church_id' => $church->id,
            'user_id' => $publisher->id,
            'category_id' => $category->id,
            'title' => 'Informática básica',
            'description' => 'Introdução ao computador.',
            'slots_total' => 1,
            'slots_filled' => 0,
            'age_range' => SharedTalentListing::AGE_ADULTS,
            'modality' => SharedTalentListing::MODALITY_IN_PERSON,
            'status' => SharedTalentListing::STATUS_ACTIVE,
            'member_declaration_at' => now(),
        ]);

        return [$publisher, $participant, $church, $listing];
    }

    public function test_participant_can_enroll_once(): void
    {
        [$publisher, $participant, $church, $listing] = $this->usersAndListing();

        $this->actingAs($participant)
            ->withSession(['working_church_id' => $church->id])
            ->post(route('mobile.shared-talents.enroll', $listing), ['message' => 'Tenho interesse'])
            ->assertRedirect(route('mobile.shared-talents.my-enrollments'));

        $this->assertDatabaseHas('shared_talent_enrollments', [
            'listing_id' => $listing->id,
            'user_id' => $participant->id,
            'status' => SharedTalentEnrollment::STATUS_AWAITING_APPROVAL,
        ]);

        $this->actingAs($participant)
            ->withSession(['working_church_id' => $church->id])
            ->post(route('mobile.shared-talents.enroll', $listing))
            ->assertSessionHas('error');
    }

    public function test_publisher_confirm_fills_slot_and_marks_full(): void
    {
        [$publisher, $participant, $church, $listing] = $this->usersAndListing();

        $enrollment = SharedTalentEnrollment::create([
            'listing_id' => $listing->id,
            'user_id' => $participant->id,
            'status' => SharedTalentEnrollment::STATUS_AWAITING_APPROVAL,
        ]);

        $this->actingAs($publisher)
            ->withSession(['working_church_id' => $church->id])
            ->patch(route('mobile.shared-talents.enrollment.status', $enrollment), [
                'status' => SharedTalentEnrollment::STATUS_CONFIRMED,
            ])
            ->assertRedirect();

        $listing->refresh();
        $enrollment->refresh();

        $this->assertSame(SharedTalentEnrollment::STATUS_CONFIRMED, $enrollment->status);
        $this->assertSame(1, $listing->slots_filled);
        $this->assertSame(SharedTalentListing::STATUS_FULL, $listing->status);
    }
}
