<?php

namespace Tests\Feature;

use App\Mail\CharityCampaignThanksDonorMail;
use App\Models\AppNotification;
use App\Models\CharityCampaign;
use App\Models\CharityDonation;
use App\Models\Church;
use App\Models\User;
use App\Services\ReceiptOcrService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Mockery;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class CharityCampaignTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    private function adminWithChurch(): array
    {
        $church = Church::query()->firstOrFail();
        $user = User::factory()->create(['church_id' => $church->id]);
        $user->assignRole(Role::firstOrCreate(['name' => 'admin']));

        return [$user, $church];
    }

    private function ensureDonationPermissions(): void
    {
        $guard = config('auth.defaults.guard');
        foreach (['donations.view', 'donations.manage', 'finance.view'] as $name) {
            Permission::firstOrCreate(['name' => $name, 'guard_name' => $guard]);
        }

        $adminRole = Role::firstOrCreate(['name' => 'admin', 'guard_name' => $guard]);
        $adminRole->givePermissionTo(['donations.view', 'donations.manage', 'finance.view']);

        $financeRole = Role::firstOrCreate(['name' => 'financeiro', 'guard_name' => $guard]);
        $financeRole->givePermissionTo(['finance.view', 'donations.view']);

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    public function test_admin_can_create_charity_campaign_and_broadcast_publication(): void
    {
        $this->ensureDonationPermissions();
        [$user, $church] = $this->adminWithChurch();

        $response = $this->actingAs($user)
            ->withSession(['working_church_id' => $church->id])
            ->post(route('charity-campaigns.store'), [
                'title' => 'Campanha do agasalho',
                'description' => 'Arrecadação para o inverno.',
                'goal_amount' => 3000,
                'starts_at' => '2026-07-10',
                'status' => 'active',
                'allow_over_goal' => true,
            ]);

        $response->assertRedirect(route('charity-campaigns.index'));

        $campaign = CharityCampaign::query()->where('title', 'Campanha do agasalho')->firstOrFail();

        $this->assertSame($church->id, $campaign->church_id);
        $this->assertSame('2026-07-10', $campaign->starts_at?->toDateString());

        $notification = AppNotification::query()->latest('id')->first();
        $this->assertNotNull($notification);
        $this->assertSame('Nova campanha de doação: Campanha do agasalho', $notification->title);
        $this->assertSame(route('mobile.donations.show', $campaign, absolute: true), $notification->action_url);
    }

    public function test_donation_via_receipt_updates_charity_campaign_progress(): void
    {
        Storage::fake('public');
        $this->ensureDonationPermissions();

        [$admin, $church] = $this->adminWithChurch();
        $donor = User::factory()->create(['church_id' => $church->id]);

        $campaign = CharityCampaign::create([
            'church_id' => $church->id,
            'title' => 'Cestas básicas',
            'goal_amount' => 5000,
            'status' => 'active',
            'created_by' => $admin->id,
        ]);

        $mock = Mockery::mock(ReceiptOcrService::class);
        $mock->shouldReceive('extractAmount')->once()->andReturn([
            'suggested_amount' => 250.0,
            'confidence' => 'medium',
            'raw_text' => 'R$ 250,00',
        ]);
        $this->app->instance(ReceiptOcrService::class, $mock);

        $file = UploadedFile::fake()->image('comprovante.jpg');

        $upload = $this->actingAs($donor)
            ->postJson(route('mobile.donations.receipt', $campaign), [
                'receipt' => $file,
            ]);

        $upload->assertOk()->assertJsonPath('suggested_amount', 250);

        $confirm = $this->actingAs($donor)
            ->post(route('mobile.donations.donate', $campaign), [
                'amount' => 250,
                'is_anonymous' => false,
            ]);

        $confirm->assertRedirect(route('mobile.donations.show', $campaign));

        $campaign->refresh();
        $this->assertSame(250.0, (float) $campaign->raised_amount);
        $this->assertSame(1, CharityDonation::query()->count());
    }

    public function test_publishing_charity_thanks_notifies_donors(): void
    {
        Mail::fake();
        $this->ensureDonationPermissions();

        [$admin, $church] = $this->adminWithChurch();
        $donor = User::factory()->create([
            'church_id' => $church->id,
            'email' => 'doador@example.com',
            'notify_via_email' => true,
            'notify_via_app' => true,
        ]);

        $campaign = CharityCampaign::create([
            'church_id' => $church->id,
            'title' => 'Mutirão solidário',
            'goal_amount' => 4000,
            'status' => CharityCampaign::STATUS_CLOSED,
            'created_by' => $admin->id,
        ]);

        CharityDonation::create([
            'campaign_id' => $campaign->id,
            'user_id' => $donor->id,
            'amount' => 180.00,
            'receipt_path' => 'charity/receipts/comprovante.jpg',
            'receipt_hash' => hash('sha256', 'charity-thanks'),
            'confirmed_at' => now(),
        ]);

        $response = $this->actingAs($admin)
            ->withSession(['working_church_id' => $church->id])
            ->post(route('charity-campaigns.thanks.publish', $campaign), [
                'thanks_message' => 'Obrigado por apoiar esta campanha.',
                'notify_donors' => true,
            ]);

        $response->assertRedirect();

        Mail::assertQueued(CharityCampaignThanksDonorMail::class, 1);

        $this->assertDatabaseHas('user_inbox_notifications', [
            'user_id' => $donor->id,
            'title' => 'Agradecimento pela sua doação',
        ]);
    }

    public function test_treasurer_can_view_donation_treasury_dashboard(): void
    {
        $this->ensureDonationPermissions();

        [$admin, $church] = $this->adminWithChurch();
        $treasurer = User::factory()->create(['church_id' => $church->id]);
        $treasurer->assignRole(Role::firstOrCreate(['name' => 'financeiro']));

        $campaign = CharityCampaign::create([
            'church_id' => $church->id,
            'title' => 'Natal solidário',
            'goal_amount' => 7000,
            'status' => 'active',
            'created_by' => $admin->id,
        ]);

        CharityDonation::create([
            'campaign_id' => $campaign->id,
            'external_donor_name' => 'Marina Costa',
            'source' => CharityDonation::SOURCE_MANUAL,
            'amount' => 320.50,
            'confirmed_at' => now(),
            'receipt_hash' => 'manual:dashboard',
        ]);

        $response = $this->actingAs($treasurer)
            ->withSession(['working_church_id' => $church->id])
            ->get(route('finance.charity-donations.index'));

        $response->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('Finance/DonationTreasurerDashboard')
            ->where('campaigns.0.title', 'Natal solidário')
            ->where('donations.data.0.campaign_title', 'Natal solidário')
            ->where('donations.data.0.amount', 320.5)
        );
    }
}
