<?php

namespace Tests\Feature;

use App\Models\Church;
use App\Models\User;
use App\Support\ChurchAppFeatures;
use Database\Seeders\ChurchSeeder;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AppFeatureSettingsTest extends TestCase
{
    use RefreshDatabase;

    private Church $church;

    private User $admin;

    private User $member;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolePermissionSeeder::class);
        $this->seed(ChurchSeeder::class);

        $this->church = Church::query()->firstOrFail();
        $this->admin = User::factory()->create(['church_id' => $this->church->id]);
        $this->admin->assignRole('admin');

        $this->member = User::factory()->create(['church_id' => $this->church->id]);
        $this->member->assignRole('membro');
    }

    public function test_admin_can_view_and_update_app_features(): void
    {
        $this->withSession(['working_church_id' => $this->church->id])
            ->actingAs($this->admin)
            ->get(route('settings.app-features.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Settings/AppFeatures')
                ->has('groups', 4));

        $enabled = ChurchAppFeatures::allKeys();
        $disabledKey = 'mission';
        $enabled = array_values(array_diff($enabled, [$disabledKey]));

        $this->withSession(['working_church_id' => $this->church->id])
            ->actingAs($this->admin)
            ->put(route('settings.app-features.update'), [
                'enabled_features' => $enabled,
            ])
            ->assertRedirect(route('settings.app-features.index'))
            ->assertSessionHas('success');

        $this->church->refresh();
        $this->assertContains($disabledKey, $this->church->disabled_app_features ?? []);
    }

    public function test_stale_form_save_does_not_disable_features_absent_from_form(): void
    {
        $allKeys = ChurchAppFeatures::allKeys();
        $formKeys = array_values(array_diff($allKeys, ['revista_adventista']));

        ChurchAppFeatures::syncEnabledKeys($this->church, $formKeys, $formKeys);

        $this->church->refresh();
        $disabled = $this->church->disabled_app_features ?? [];
        $this->assertNotContains('revista_adventista', $disabled);
    }

    public function test_explicit_uncheck_on_form_disables_feature(): void
    {
        $allKeys = ChurchAppFeatures::allKeys();
        $enabled = array_values(array_diff($allKeys, ['revista_adventista']));

        ChurchAppFeatures::syncEnabledKeys($this->church, $enabled, $allKeys);

        $this->church->refresh();
        $this->assertContains('revista_adventista', $this->church->disabled_app_features ?? []);
    }

    public function test_disabled_feature_returns_404_for_member(): void
    {
        $this->church->update(['disabled_app_features' => ['mission']]);

        $this->withSession(['working_church_id' => $this->church->id])
            ->actingAs($this->member)
            ->get(route('mobile.mission'))
            ->assertNotFound();
    }

    public function test_disabled_feature_still_accessible_for_admin(): void
    {
        $this->church->update(['disabled_app_features' => ['mission']]);

        $this->withSession(['working_church_id' => $this->church->id])
            ->actingAs($this->admin)
            ->get(route('mobile.mission'))
            ->assertOk();
    }

    public function test_disabled_app_features_prop_reflects_church_settings(): void
    {
        $this->church->update(['disabled_app_features' => ['prayer', 'bible']]);

        $this->withSession(['working_church_id' => $this->church->id])
            ->actingAs($this->member)
            ->get(route('mobile.home'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('disabledAppFeatures', ['prayer', 'bible']));
    }

    public function test_member_cannot_access_app_features_settings(): void
    {
        $this->withSession(['working_church_id' => $this->church->id])
            ->actingAs($this->member)
            ->get(route('settings.app-features.index'))
            ->assertForbidden();
    }
}
