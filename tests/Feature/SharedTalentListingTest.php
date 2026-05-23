<?php

namespace Tests\Feature;

use App\Models\Church;
use App\Models\SharedTalentCategory;
use App\Models\SharedTalentListing;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class SharedTalentListingTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    private function memberWithChurch(): array
    {
        $church = Church::query()->firstOrFail();
        $user = User::factory()->create(['church_id' => $church->id]);
        $user->assignRole(Role::firstOrCreate(['name' => 'membro']));

        return [$user, $church];
    }

    private function moderatorWithChurch(): array
    {
        $church = Church::query()->firstOrFail();
        $user = User::factory()->create(['church_id' => $church->id]);
        $guard = config('auth.defaults.guard');
        Permission::firstOrCreate(['name' => 'shared_talents.moderate', 'guard_name' => $guard]);
        $user->givePermissionTo('shared_talents.moderate');
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        return [$user, $church];
    }

    private function category(): SharedTalentCategory
    {
        return SharedTalentCategory::query()->firstOrFail();
    }

    public function test_member_can_publish_listing_pending_moderation(): void
    {
        [$user, $church] = $this->memberWithChurch();
        $category = $this->category();

        $response = $this->actingAs($user)
            ->withSession(['working_church_id' => $church->id])
            ->post(route('mobile.shared-talents.store'), [
                'title' => 'Aula de violino',
                'category_id' => $category->id,
                'description' => 'Compartilho conhecimento básico de violino.',
                'slots_total' => 3,
                'age_range' => 'all',
                'modality' => 'in_person',
                'member_declaration' => true,
            ]);

        $response->assertRedirect(route('mobile.shared-talents.my-listings'));
        $this->assertDatabaseHas('shared_talent_listings', [
            'title' => 'Aula de violino',
            'user_id' => $user->id,
            'status' => SharedTalentListing::STATUS_PENDING,
        ]);
    }

    public function test_moderator_can_approve_listing(): void
    {
        [$member, $church] = $this->memberWithChurch();
        [$moderator] = $this->moderatorWithChurch();
        $category = $this->category();

        $listing = SharedTalentListing::create([
            'church_id' => $church->id,
            'user_id' => $member->id,
            'category_id' => $category->id,
            'title' => 'Reforço escolar',
            'description' => 'Apoio em matemática.',
            'slots_total' => 2,
            'slots_filled' => 0,
            'age_range' => SharedTalentListing::AGE_CHILDREN,
            'modality' => SharedTalentListing::MODALITY_ONLINE,
            'status' => SharedTalentListing::STATUS_PENDING,
            'member_declaration_at' => now(),
        ]);

        $response = $this->actingAs($moderator)
            ->withSession(['working_church_id' => $church->id])
            ->post(route('shared-talents.admin.listings.moderate', $listing), [
                'action' => 'approve',
            ]);

        $response->assertRedirect();
        $listing->refresh();
        $this->assertSame(SharedTalentListing::STATUS_ACTIVE, $listing->status);
    }

    public function test_catalog_shows_only_active_listings(): void
    {
        [$member, $church] = $this->memberWithChurch();
        $category = $this->category();

        SharedTalentListing::create([
            'church_id' => $church->id,
            'user_id' => $member->id,
            'category_id' => $category->id,
            'title' => 'Visível',
            'description' => 'Ativo',
            'slots_total' => 1,
            'modality' => 'online',
            'age_range' => 'all',
            'status' => SharedTalentListing::STATUS_ACTIVE,
            'member_declaration_at' => now(),
        ]);

        SharedTalentListing::create([
            'church_id' => $church->id,
            'user_id' => $member->id,
            'category_id' => $category->id,
            'title' => 'Oculto',
            'description' => 'Pendente',
            'slots_total' => 1,
            'modality' => 'online',
            'age_range' => 'all',
            'status' => SharedTalentListing::STATUS_PENDING,
            'member_declaration_at' => now(),
        ]);

        $response = $this->actingAs($member)
            ->withSession(['working_church_id' => $church->id])
            ->get(route('mobile.shared-talents.index'));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Mobile/SharedTalent/Index')
            ->has('listings', 1)
            ->where('listings.0.title', 'Visível'));
    }
}
