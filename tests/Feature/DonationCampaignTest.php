<?php

namespace Tests\Feature;

use App\Mail\CampaignDonationDonorMail;
use App\Mail\CampaignDonationTreasurerMail;
use App\Mail\CampaignThanksDonorMail;
use App\Models\CampaignDonation;
use App\Models\Church;
use App\Models\DonationCampaign;
use App\Models\DonationCampaignPhoto;
use App\Models\User;
use App\Models\UserInboxNotification;
use App\Services\ReceiptOcrService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Mockery;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class DonationCampaignTest extends TestCase
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

    private function ensureCampaignPermissions(): void
    {
        $guard = config('auth.defaults.guard');
        foreach (['campaigns.view', 'campaigns.manage', 'finance.view'] as $name) {
            Permission::firstOrCreate(['name' => $name, 'guard_name' => $guard]);
        }

        $adminRole = Role::firstOrCreate(['name' => 'admin', 'guard_name' => $guard]);
        $adminRole->givePermissionTo(['campaigns.view', 'campaigns.manage', 'finance.view']);

        $financeRole = Role::firstOrCreate(['name' => 'financeiro', 'guard_name' => $guard]);
        $financeRole->givePermissionTo(['finance.view']);

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    public function test_admin_can_create_campaign(): void
    {
        $this->ensureCampaignPermissions();
        [$user, $church] = $this->adminWithChurch();

        $response = $this->actingAs($user)
            ->withSession(['working_church_id' => $church->id])
            ->post(route('donation-campaigns.store'), [
                'title' => 'Viagem dos desbravadores',
                'description' => 'Meta para viagem',
                'goal_amount' => 20000,
                'starts_at' => '2026-07-01',
                'status' => 'active',
                'allow_over_goal' => true,
            ]);

        $response->assertRedirect(route('donation-campaigns.index'));
        $this->assertDatabaseHas('donation_campaigns', [
            'title' => 'Viagem dos desbravadores',
            'church_id' => $church->id,
            'goal_amount' => 20000,
        ]);
        $campaign = DonationCampaign::query()->where('title', 'Viagem dos desbravadores')->firstOrFail();
        $this->assertSame('2026-07-01', $campaign->starts_at?->toDateString());
    }

    public function test_admin_can_create_campaign_with_brazilian_formatted_goal_amount(): void
    {
        $this->ensureCampaignPermissions();
        [$user, $church] = $this->adminWithChurch();

        $response = $this->actingAs($user)
            ->withSession(['working_church_id' => $church->id])
            ->post(route('donation-campaigns.store'), [
                'title' => 'Construção da igreja',
                'description' => 'Meta em formato brasileiro',
                'goal_amount' => '4.733.262,14',
                'starts_at' => '2026-07-02',
                'status' => 'active',
                'allow_over_goal' => true,
            ]);

        $response->assertRedirect(route('donation-campaigns.index'));
        $this->assertDatabaseHas('donation_campaigns', [
            'title' => 'Construção da igreja',
            'church_id' => $church->id,
            'goal_amount' => 4733262.14,
        ]);
        $campaign = DonationCampaign::query()->where('title', 'Construção da igreja')->firstOrFail();
        $this->assertSame('2026-07-02', $campaign->starts_at?->toDateString());
    }

    public function test_admin_can_update_campaign_with_brazilian_formatted_goal_amount(): void
    {
        $this->ensureCampaignPermissions();
        [$user, $church] = $this->adminWithChurch();

        $campaign = DonationCampaign::create([
            'church_id' => $church->id,
            'title' => 'Construção da igreja',
            'goal_amount' => 1000,
            'status' => 'active',
            'created_by' => $user->id,
        ]);

        $response = $this->actingAs($user)
            ->withSession(['working_church_id' => $church->id])
            ->put(route('donation-campaigns.update', $campaign), [
                'title' => 'Construção da igreja',
                'description' => 'Meta atualizada',
                'goal_amount' => '4.733.262,14',
                'starts_at' => '2026-08-15',
                'status' => 'active',
                'allow_over_goal' => true,
            ]);

        $response->assertRedirect(route('donation-campaigns.index'));
        $this->assertDatabaseHas('donation_campaigns', [
            'id' => $campaign->id,
            'goal_amount' => 4733262.14,
        ]);
        $campaign->refresh();
        $this->assertSame('2026-08-15', $campaign->starts_at?->toDateString());
    }

    public function test_admin_can_update_campaign_without_starts_at_from_older_form(): void
    {
        $this->ensureCampaignPermissions();
        [$user, $church] = $this->adminWithChurch();

        $campaign = DonationCampaign::create([
            'church_id' => $church->id,
            'title' => 'Campanha legado',
            'goal_amount' => 1000,
            'starts_at' => '2026-07-01',
            'status' => 'active',
            'created_by' => $user->id,
        ]);

        $response = $this->actingAs($user)
            ->withSession(['working_church_id' => $church->id])
            ->put(route('donation-campaigns.update', $campaign), [
                'title' => 'Campanha legado atualizada',
                'description' => 'Campos antigos ainda salvam.',
                'goal_amount' => '4.733.262,14',
                'status' => 'closed',
                'allow_over_goal' => false,
            ]);

        $response->assertRedirect(route('donation-campaigns.index'));

        $campaign->refresh();
        $this->assertSame('Campanha legado atualizada', $campaign->title);
        $this->assertSame('Campos antigos ainda salvam.', $campaign->description);
        $this->assertSame(4733262.14, (float) $campaign->goal_amount);
        $this->assertSame('closed', $campaign->status);
        $this->assertFalse($campaign->allow_over_goal);
        $this->assertSame('2026-07-01', $campaign->starts_at?->toDateString());
    }

    public function test_admin_can_update_campaign_with_goal_above_previous_validation_limit(): void
    {
        $this->ensureCampaignPermissions();
        [$user, $church] = $this->adminWithChurch();

        $campaign = DonationCampaign::create([
            'church_id' => $church->id,
            'title' => 'Campanha grande',
            'goal_amount' => 4733262.14,
            'starts_at' => '2026-07-03',
            'status' => 'active',
            'created_by' => $user->id,
        ]);

        $response = $this->actingAs($user)
            ->withSession(['working_church_id' => $church->id])
            ->put(route('donation-campaigns.update', $campaign), [
                'title' => 'Campanha grande',
                'description' => 'Meta ampliada',
                'goal_amount' => '10.600.000,00',
                'starts_at' => '2026-07-03',
                'status' => 'active',
                'allow_over_goal' => true,
            ]);

        $response->assertRedirect(route('donation-campaigns.index'));

        $campaign->refresh();
        $this->assertSame(10600000.0, (float) $campaign->goal_amount);
    }

    public function test_future_campaign_is_not_accepting_donations_until_start_date(): void
    {
        $this->ensureCampaignPermissions();
        [$admin, $church] = $this->adminWithChurch();

        $campaign = DonationCampaign::create([
            'church_id' => $church->id,
            'title' => 'Campanha futura',
            'goal_amount' => 1500,
            'status' => 'active',
            'starts_at' => now()->addDays(5)->toDateString(),
            'created_by' => $admin->id,
        ]);

        $this->assertFalse($campaign->fresh()->isAcceptingDonations());
    }

    public function test_donation_via_receipt_updates_campaign_progress(): void
    {
        Storage::fake('public');
        $this->ensureCampaignPermissions();

        [$admin, $church] = $this->adminWithChurch();
        $donor = User::factory()->create(['church_id' => $church->id]);

        $campaign = DonationCampaign::create([
            'church_id' => $church->id,
            'title' => 'Reforma do templo',
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
            ->postJson(route('mobile.campaigns.receipt', $campaign), [
                'receipt' => $file,
            ]);

        $upload->assertOk()
            ->assertJsonPath('suggested_amount', 250);

        $confirm = $this->actingAs($donor)
            ->post(route('mobile.campaigns.donate', $campaign), [
                'amount' => 250,
                'is_anonymous' => false,
            ]);

        $confirm->assertRedirect(route('mobile.campaigns.show', $campaign));

        $campaign->refresh();
        $this->assertSame(250.0, (float) $campaign->raised_amount);
        $this->assertSame(1, CampaignDonation::query()->count());
    }

    public function test_duplicate_receipt_is_rejected(): void
    {
        Storage::fake('public');
        $this->ensureCampaignPermissions();

        [$admin, $church] = $this->adminWithChurch();
        $donor = User::factory()->create(['church_id' => $church->id]);

        $campaign = DonationCampaign::create([
            'church_id' => $church->id,
            'title' => 'Campanha teste',
            'goal_amount' => 1000,
            'status' => 'active',
            'created_by' => $admin->id,
        ]);

        CampaignDonation::create([
            'campaign_id' => $campaign->id,
            'user_id' => $donor->id,
            'amount' => 100,
            'receipt_path' => 'donations/receipts/existing.jpg',
            'receipt_hash' => hash('sha256', 'same-file-content'),
            'confirmed_at' => now(),
        ]);

        $mock = Mockery::mock(ReceiptOcrService::class);
        $this->app->instance(ReceiptOcrService::class, $mock);
        $mock->shouldNotReceive('extractAmount');

        $file = UploadedFile::fake()->createWithContent('dup.jpg', 'same-file-content');

        $response = $this->actingAs($donor)
            ->postJson(route('mobile.campaigns.receipt', $campaign), [
                'receipt' => $file,
            ]);

        $response->assertStatus(422);
    }

    public function test_treasurer_dashboard_shows_monthly_total_and_search(): void
    {
        $this->ensureCampaignPermissions();

        [$admin, $church] = $this->adminWithChurch();
        $donor = User::factory()->create(['name' => 'Maria Silva', 'church_id' => $church->id]);

        $financeRole = Role::firstOrCreate(['name' => 'financeiro']);
        $financeRole->givePermissionTo(Permission::firstOrCreate(['name' => 'finance.view', 'guard_name' => config('auth.defaults.guard')]));
        $treasurer = User::factory()->create(['church_id' => $church->id]);
        $treasurer->assignRole($financeRole);

        $campaign = DonationCampaign::create([
            'church_id' => $church->id,
            'title' => 'Viagem desbravadores',
            'goal_amount' => 20000,
            'raised_amount' => 300,
            'status' => 'active',
            'created_by' => $admin->id,
        ]);

        CampaignDonation::create([
            'campaign_id' => $campaign->id,
            'user_id' => $donor->id,
            'amount' => 300,
            'receipt_path' => 'donations/receipts/a.jpg',
            'receipt_hash' => hash('sha256', 'a'),
            'confirmed_at' => now(),
        ]);

        $response = $this->actingAs($treasurer)
            ->withSession(['working_church_id' => $church->id])
            ->get(route('finance.treasurer', ['search' => 'Maria']));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Finance/TreasurerDashboard')
            ->where('monthTotal', 300)
            ->has('donations.data', 1)
        );
    }

    public function test_treasurer_dashboard_uses_larger_pagination_size(): void
    {
        $this->ensureCampaignPermissions();

        [$admin, $church] = $this->adminWithChurch();
        $donor = User::factory()->create(['name' => 'Maria Doadora', 'church_id' => $church->id]);

        $financeRole = Role::firstOrCreate(['name' => 'financeiro']);
        $financeRole->givePermissionTo(Permission::firstOrCreate(['name' => 'finance.view', 'guard_name' => config('auth.defaults.guard')]));
        $treasurer = User::factory()->create(['church_id' => $church->id]);
        $treasurer->assignRole($financeRole);

        $campaign = DonationCampaign::create([
            'church_id' => $church->id,
            'title' => 'Construção da igreja',
            'goal_amount' => 500000,
            'raised_amount' => 0,
            'status' => 'active',
            'created_by' => $admin->id,
        ]);

        for ($i = 1; $i <= 120; $i++) {
            CampaignDonation::create([
                'campaign_id' => $campaign->id,
                'user_id' => $donor->id,
                'amount' => 10 + $i,
                'receipt_path' => "donations/receipts/{$i}.jpg",
                'receipt_hash' => hash('sha256', 'receipt-'.$i),
                'confirmed_at' => now()->subMinutes($i),
            ]);
        }

        $response = $this->actingAs($treasurer)
            ->withSession(['working_church_id' => $church->id])
            ->get(route('finance.treasurer'));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Finance/TreasurerDashboard')
            ->has('donations.data', 100)
            ->where('donations.current_page', 1)
            ->where('donations.last_page', 2)
        );
    }

    public function test_donor_can_submit_dispute(): void
    {
        $this->ensureCampaignPermissions();
        [$admin, $church] = $this->adminWithChurch();
        $donor = User::factory()->create(['church_id' => $church->id]);

        $campaign = DonationCampaign::create([
            'church_id' => $church->id,
            'title' => 'Campanha',
            'goal_amount' => 1000,
            'raised_amount' => 50,
            'status' => 'active',
            'created_by' => $admin->id,
        ]);

        $donation = CampaignDonation::create([
            'campaign_id' => $campaign->id,
            'user_id' => $donor->id,
            'amount' => 50,
            'receipt_path' => 'donations/receipts/x.jpg',
            'receipt_hash' => hash('sha256', 'x'),
            'confirmed_at' => now(),
        ]);

        $this->actingAs($donor)
            ->post(route('mobile.campaigns.dispute', $donation), [
                'dispute_message' => 'O valor no comprovante era R$ 500,00 e não R$ 50,00.',
            ])
            ->assertRedirect(route('mobile.campaigns.my-donations'));

        $donation->refresh();
        $this->assertSame(CampaignDonation::DISPUTE_PENDING, $donation->dispute_status);
    }

    public function test_treasurer_can_adjust_donation_amount(): void
    {
        $this->ensureCampaignPermissions();
        [$admin, $church] = $this->adminWithChurch();

        $campaign = DonationCampaign::create([
            'church_id' => $church->id,
            'title' => 'Campanha',
            'goal_amount' => 1000,
            'raised_amount' => 50,
            'status' => 'active',
            'created_by' => $admin->id,
        ]);

        $donation = CampaignDonation::create([
            'campaign_id' => $campaign->id,
            'user_id' => $admin->id,
            'amount' => 50,
            'receipt_path' => 'donations/receipts/y.jpg',
            'receipt_hash' => hash('sha256', 'y'),
            'confirmed_at' => now(),
        ]);

        $this->actingAs($admin)
            ->withSession(['working_church_id' => $church->id])
            ->patch(route('finance.donations.update', $donation->getKey()), [
                'amount' => 500,
                'adjustment_note' => 'Correção após análise do comprovante.',
            ])
            ->assertRedirect();

        $donation->refresh();
        $campaign->refresh();
        $this->assertSame(500.0, (float) $donation->amount);
        $this->assertSame(50.0, (float) $donation->amount_before_adjustment);
        $this->assertSame(500.0, (float) $campaign->raised_amount);

        $this->assertDatabaseHas('campaign_donation_adjustments', [
            'campaign_donation_id' => $donation->id,
            'amount_before' => 50,
            'amount_after' => 500,
            'adjustment_note' => 'Correção após análise do comprovante.',
            'adjusted_by' => $admin->id,
        ]);
    }

    public function test_adjustment_requires_justification_min_length(): void
    {
        $this->ensureCampaignPermissions();
        [$admin, $church] = $this->adminWithChurch();

        $campaign = DonationCampaign::create([
            'church_id' => $church->id,
            'title' => 'Campanha',
            'goal_amount' => 1000,
            'raised_amount' => 50,
            'status' => 'active',
            'created_by' => $admin->id,
        ]);

        $donation = CampaignDonation::create([
            'campaign_id' => $campaign->id,
            'user_id' => $admin->id,
            'amount' => 50,
            'receipt_path' => 'donations/receipts/z.jpg',
            'receipt_hash' => hash('sha256', 'z'),
            'confirmed_at' => now(),
        ]);

        $this->actingAs($admin)
            ->withSession(['working_church_id' => $church->id])
            ->patch(route('finance.donations.update', $donation->getKey()), [
                'amount' => 500,
                'adjustment_note' => 'curto',
            ])
            ->assertSessionHasErrors('adjustment_note');

        $this->assertDatabaseCount('campaign_donation_adjustments', 0);
    }

    public function test_progress_percent_uses_floor_until_goal_reached(): void
    {
        $this->ensureCampaignPermissions();
        [$admin, $church] = $this->adminWithChurch();

        $campaign = DonationCampaign::create([
            'church_id' => $church->id,
            'title' => 'Campanha quase na meta',
            'goal_amount' => 2000,
            'raised_amount' => 1990,
            'status' => 'active',
            'created_by' => $admin->id,
        ]);

        $this->assertSame(99, $campaign->progressPercent());
        $this->assertSame(10.0, $campaign->remainingAmount());

        $campaign->update(['raised_amount' => 2000]);
        $campaign->refresh();
        $this->assertSame(100, $campaign->progressPercent());
        $this->assertSame(0.0, $campaign->remainingAmount());
    }

    public function test_donation_sends_email_to_treasurer_when_configured(): void
    {
        Mail::fake();
        Storage::fake('public');
        $this->ensureCampaignPermissions();

        [$admin, $church] = $this->adminWithChurch();
        $church->update(['treasurer_notification_email' => 'tesoureiro@example.com']);
        $donor = User::factory()->create(['church_id' => $church->id, 'name' => 'João Doador']);

        $campaign = DonationCampaign::create([
            'church_id' => $church->id,
            'title' => 'Obra social',
            'goal_amount' => 5000,
            'status' => 'active',
            'created_by' => $admin->id,
        ]);

        $mock = Mockery::mock(ReceiptOcrService::class);
        $mock->shouldReceive('extractAmount')->once()->andReturn([
            'suggested_amount' => 120.0,
            'confidence' => 'high',
            'raw_text' => 'R$ 120,00',
        ]);
        $this->app->instance(ReceiptOcrService::class, $mock);

        $file = UploadedFile::fake()->image('comprovante.jpg');

        $this->actingAs($donor)
            ->postJson(route('mobile.campaigns.receipt', $campaign), ['receipt' => $file])
            ->assertOk();

        $this->actingAs($donor)
            ->post(route('mobile.campaigns.donate', $campaign), [
                'amount' => 120,
                'is_anonymous' => false,
            ])
            ->assertRedirect(route('mobile.campaigns.show', $campaign));

        Mail::assertQueued(CampaignDonationTreasurerMail::class, function (CampaignDonationTreasurerMail $mail) {
            return (float) $mail->donation->amount === 120.0;
        });

        Mail::assertNotQueued(CampaignDonationDonorMail::class);
    }

    public function test_donor_receives_email_when_opted_in(): void
    {
        Mail::fake();
        Storage::fake('public');
        $this->ensureCampaignPermissions();

        [$admin, $church] = $this->adminWithChurch();
        $donor = User::factory()->create([
            'church_id' => $church->id,
            'email' => 'doador@example.com',
            'name' => 'Maria Doadora',
        ]);

        $campaign = DonationCampaign::create([
            'church_id' => $church->id,
            'title' => 'Campanha solidária',
            'goal_amount' => 5000,
            'status' => 'active',
            'created_by' => $admin->id,
        ]);

        $mock = Mockery::mock(ReceiptOcrService::class);
        $mock->shouldReceive('extractAmount')->once()->andReturn([
            'suggested_amount' => 80.0,
            'confidence' => 'high',
            'raw_text' => 'R$ 80,00',
        ]);
        $this->app->instance(ReceiptOcrService::class, $mock);

        $file = UploadedFile::fake()->image('comprovante.jpg');

        $this->actingAs($donor)
            ->postJson(route('mobile.campaigns.receipt', $campaign), ['receipt' => $file])
            ->assertOk();

        $this->actingAs($donor)
            ->post(route('mobile.campaigns.donate', $campaign), [
                'amount' => 80,
                'is_anonymous' => false,
                'send_email_confirmation' => true,
            ])
            ->assertRedirect(route('mobile.campaigns.show', $campaign));

        Mail::assertQueued(CampaignDonationDonorMail::class, function (CampaignDonationDonorMail $mail) use ($donor) {
            return $mail->donation->user_id === $donor->id
                && (float) $mail->donation->amount === 80.0;
        });

        $this->assertDatabaseHas('campaign_donations', [
            'user_id' => $donor->id,
            'donor_email_confirmation_requested' => true,
        ]);
    }

    public function test_admin_can_publish_thanks_after_campaign_closed(): void
    {
        $this->ensureCampaignPermissions();
        [$user, $church] = $this->adminWithChurch();

        $campaign = DonationCampaign::create([
            'church_id' => $church->id,
            'title' => 'Campanha encerrada',
            'goal_amount' => 1000,
            'raised_amount' => 1000,
            'status' => 'closed',
            'created_by' => $user->id,
        ]);

        $this->actingAs($user)
            ->withSession(['working_church_id' => $church->id])
            ->post(route('donation-campaigns.thanks.publish', $campaign), [
                'thanks_message' => 'Obrigado a todos que contribuíram!',
            ])
            ->assertRedirect();

        $campaign->refresh();
        $this->assertNotNull($campaign->thanks_published_at);
        $this->assertSame('Obrigado a todos que contribuíram!', $campaign->thanks_message);
    }

    public function test_admin_can_upload_multiple_campaign_story_photos_at_once(): void
    {
        Storage::fake('public');
        $this->ensureCampaignPermissions();
        [$user, $church] = $this->adminWithChurch();

        $campaign = DonationCampaign::create([
            'church_id' => $church->id,
            'title' => 'Campanha com galeria',
            'goal_amount' => 1000,
            'status' => 'active',
            'created_by' => $user->id,
        ]);

        $photoA = UploadedFile::fake()->image('obra-1.jpg');
        $photoB = UploadedFile::fake()->image('obra-2.jpg');

        $this->actingAs($user)
            ->withSession(['working_church_id' => $church->id])
            ->post(route('donation-campaigns.photos.store', $campaign), [
                'kind' => DonationCampaignPhoto::KIND_STORY,
                'photos' => [$photoA, $photoB],
            ])
            ->assertRedirect()
            ->assertSessionHas('success', '2 fotos adicionadas.');

        $campaign->refresh();

        $this->assertSame(2, $campaign->photos()->where('kind', DonationCampaignPhoto::KIND_STORY)->count());

        $storedPaths = $campaign->photos()
            ->where('kind', DonationCampaignPhoto::KIND_STORY)
            ->orderBy('sort_order')
            ->pluck('image_path')
            ->all();

        $this->assertCount(2, $storedPaths);
        foreach ($storedPaths as $path) {
            Storage::disk('public')->assertExists($path);
        }
    }

    public function test_publishing_thanks_can_notify_donors_by_email_and_inbox(): void
    {
        Mail::fake();
        $this->ensureCampaignPermissions();
        [$admin, $church] = $this->adminWithChurch();

        $donorWithEmail = User::factory()->create([
            'church_id' => $church->id,
            'notify_via_app' => true,
            'notify_via_email' => true,
        ]);
        $donorInboxOnly = User::factory()->create([
            'church_id' => $church->id,
            'notify_via_app' => true,
            'notify_via_email' => false,
        ]);

        $campaign = DonationCampaign::create([
            'church_id' => $church->id,
            'title' => 'Campanha com doadores',
            'goal_amount' => 1000,
            'raised_amount' => 150,
            'status' => 'closed',
            'created_by' => $admin->id,
        ]);

        foreach ([$donorWithEmail, $donorInboxOnly] as $donor) {
            CampaignDonation::create([
                'campaign_id' => $campaign->id,
                'source' => CampaignDonation::SOURCE_APP,
                'user_id' => $donor->id,
                'amount' => 75,
                'receipt_path' => 'donations/receipts/test-'.$donor->id.'.jpg',
                'receipt_hash' => hash('sha256', 'receipt-'.$donor->id),
                'confirmed_at' => now(),
            ]);
        }

        $this->actingAs($admin)
            ->withSession(['working_church_id' => $church->id])
            ->post(route('donation-campaigns.thanks.publish', $campaign), [
                'thanks_message' => 'Gratidão a cada um que contribuiu!',
                'notify_donors' => true,
            ])
            ->assertRedirect()
            ->assertSessionHas('success');

        $campaign->refresh();
        $this->assertNotNull($campaign->thanks_published_at);
        $this->assertNotNull($campaign->thanks_donors_notified_at);

        Mail::assertQueued(CampaignThanksDonorMail::class, 1);
        Mail::assertQueued(CampaignThanksDonorMail::class, function (CampaignThanksDonorMail $mail) use ($donorWithEmail, $campaign) {
            return $mail->donor->id === $donorWithEmail->id
                && $mail->campaign->id === $campaign->id;
        });

        $this->assertDatabaseHas('user_inbox_notifications', [
            'user_id' => $donorWithEmail->id,
            'title' => 'Agradecimento pela sua contribuição',
        ]);
        $this->assertDatabaseHas('user_inbox_notifications', [
            'user_id' => $donorInboxOnly->id,
            'title' => 'Agradecimento pela sua contribuição',
        ]);
    }

    public function test_mobile_show_includes_story_and_thanks_content(): void
    {
        $this->ensureCampaignPermissions();
        [$admin, $church] = $this->adminWithChurch();

        $campaign = DonationCampaign::create([
            'church_id' => $church->id,
            'title' => 'Campanha com mídia',
            'goal_amount' => 3000,
            'status' => 'closed',
            'starts_at' => '2026-05-01',
            'story_video_url' => 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            'thanks_message' => 'Gratidão!',
            'thanks_published_at' => now(),
            'created_by' => $admin->id,
        ]);

        DonationCampaignPhoto::create([
            'campaign_id' => $campaign->id,
            'kind' => DonationCampaignPhoto::KIND_STORY,
            'image_path' => 'donations/campaign-media/story.jpg',
            'sort_order' => 1,
        ]);

        $response = $this->get(route('mobile.campaigns.show', $campaign));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Mobile/DonationCampaigns/Show')
            ->where('campaign.starts_at', '2026-05-01')
            ->where('donationUrl', 'https://7me.app/71/y8nzix')
            ->where('campaign.story_youtube_embed_url', 'https://www.youtube.com/embed/dQw4w9WgXcQ')
            ->where('campaign.thanks_is_published', true)
            ->where('campaign.show_caixa_fixo_story', false)
            ->has('campaign.story_photos', 1)
        );
    }

    public function test_admin_can_enable_caixa_fixo_story_on_campaign(): void
    {
        $this->ensureCampaignPermissions();
        [$user, $church] = $this->adminWithChurch();

        $campaign = DonationCampaign::create([
            'church_id' => $church->id,
            'title' => 'Caixa Fixo da Igreja',
            'goal_amount' => 177948.95,
            'starts_at' => '2026-01-01',
            'status' => 'active',
            'created_by' => $user->id,
        ]);

        $response = $this->actingAs($user)
            ->withSession(['working_church_id' => $church->id])
            ->put(route('donation-campaigns.update', $campaign), [
                'title' => 'Caixa Fixo da Igreja',
                'description' => 'Sustento mensal da casa.',
                'goal_amount' => '177.948,95',
                'starts_at' => '2026-01-01',
                'status' => 'active',
                'allow_over_goal' => true,
                'show_caixa_fixo_story' => true,
            ]);

        $response->assertRedirect(route('donation-campaigns.index'));
        $campaign->refresh();
        $this->assertTrue($campaign->show_caixa_fixo_story);

        $this->get(route('mobile.campaigns.show', $campaign))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Mobile/DonationCampaigns/Show')
                ->where('campaign.show_caixa_fixo_story', true)
                ->where('donationUrl', 'https://7me.app/71/r8ctoh')
            );
    }

    public function test_admin_can_update_caixa_fixo_story_values(): void
    {
        $this->ensureCampaignPermissions();
        [$user, $church] = $this->adminWithChurch();

        $campaign = DonationCampaign::create([
            'church_id' => $church->id,
            'title' => 'Caixa Fixo da Igreja',
            'goal_amount' => 177948.95,
            'starts_at' => '2026-01-01',
            'status' => 'active',
            'show_caixa_fixo_story' => true,
            'created_by' => $user->id,
        ]);

        $payload = [
            'monthly_total' => '180.000,00',
            'monthly_raised' => '95.000,00',
            'annual_year' => 2026,
            'cost_items' => [
                [
                    'label' => 'Parcela da Construção (AP)',
                    'amount' => '50.000,00',
                    'tone' => 'sky',
                    'compact' => false,
                ],
                [
                    'label' => 'Gás',
                    'amount' => '100,00',
                    'tone' => 'red',
                    'compact' => true,
                ],
            ],
            'annual_lines' => [
                [
                    'label' => 'Saldo inicial',
                    'amount' => '400.000,00',
                    'tone' => 'emerald',
                    'emphasize' => false,
                    'flow' => null,
                ],
                [
                    'label' => 'Despesas 2026',
                    'amount' => '-800.000,00',
                    'tone' => 'amber',
                    'emphasize' => false,
                    'flow' => 'out',
                ],
                [
                    'label' => 'Saldo atual',
                    'amount' => '50.000,00',
                    'tone' => 'brand',
                    'emphasize' => true,
                    'flow' => null,
                ],
            ],
        ];

        $response = $this->actingAs($user)
            ->withSession(['working_church_id' => $church->id])
            ->patch(route('donation-campaigns.caixa-fixo.update', $campaign), $payload);

        $response->assertRedirect();
        $campaign->refresh();

        $this->assertNotNull($campaign->caixa_fixo_story);
        $this->assertEquals(180000.0, (float) $campaign->caixa_fixo_story['monthly_total']);
        $this->assertEquals(95000.0, (float) $campaign->caixa_fixo_story['monthly_raised']);
        $this->assertEquals(50000.0, (float) $campaign->caixa_fixo_story['cost_items'][0]['amount']);
        $this->assertEquals(27.78, (float) $campaign->caixa_fixo_story['cost_items'][0]['percent']);
        $this->assertEquals(-800000.0, (float) $campaign->caixa_fixo_story['annual_lines'][1]['amount']);

        $this->get(route('mobile.campaigns.show', $campaign))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Mobile/DonationCampaigns/Show')
                ->where('campaign.caixa_fixo_story.monthly_total', 180000)
                ->where('campaign.caixa_fixo_story.monthly_raised', 95000)
                ->where('campaign.caixa_fixo_story.cost_items.0.amount', 50000)
            );
    }

    public function test_admin_can_enable_and_update_construcao_story(): void
    {
        $this->ensureCampaignPermissions();
        [$user, $church] = $this->adminWithChurch();

        $campaign = DonationCampaign::create([
            'church_id' => $church->id,
            'title' => 'Construção da Igreja',
            'goal_amount' => 10000000,
            'starts_at' => '2023-11-01',
            'status' => 'active',
            'created_by' => $user->id,
        ]);

        $response = $this->actingAs($user)
            ->withSession(['working_church_id' => $church->id])
            ->put(route('donation-campaigns.update', $campaign), [
                'title' => 'Construção da Igreja',
                'description' => 'Campanha da construção.',
                'goal_amount' => '10.000.000,00',
                'starts_at' => '2023-11-01',
                'status' => 'active',
                'allow_over_goal' => true,
                'show_caixa_fixo_story' => false,
                'show_construcao_story' => true,
            ]);

        $response->assertRedirect(route('donation-campaigns.index'));
        $campaign->refresh();
        $this->assertTrue($campaign->show_construcao_story);
        $this->assertFalse($campaign->show_caixa_fixo_story);

        $payload = [
            'launch_date' => '2023-11-01',
            'as_of_date' => '2026-08-02',
            'raised_amount' => '6.000.000,00',
            'eyebrow' => 'Campanha da construção',
            'title' => 'Uma casa construída com fidelidade',
            'paragraphs' => ['Parágrafo de apoio da construção.'],
            'highlights' => ['Destaque um', 'Destaque dois'],
        ];

        $this->actingAs($user)
            ->withSession(['working_church_id' => $church->id])
            ->patch(route('donation-campaigns.construcao.update', $campaign), $payload)
            ->assertRedirect();

        $campaign->refresh();
        $this->assertEquals(6000000.0, (float) $campaign->construcao_story['raised_amount']);
        $this->assertSame('2026-08-02', $campaign->construcao_story['as_of_date']);
        $this->assertTrue($campaign->show_construcao_story);
        $this->assertFalse($campaign->show_caixa_fixo_story);

        $this->get(route('mobile.campaigns.show', $campaign))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Mobile/DonationCampaigns/Show')
                ->where('campaign.show_construcao_story', true)
                ->where('campaign.construcao_story.raised_amount', 6000000)
                ->where('campaign.construcao_story.as_of_date', '2026-08-02')
            );
    }

    public function test_campaigns_with_story_cannot_be_deleted(): void
    {
        $this->ensureCampaignPermissions();
        [$user, $church] = $this->adminWithChurch();

        $caixaFixo = DonationCampaign::create([
            'church_id' => $church->id,
            'title' => 'Caixa Fixo da Igreja',
            'goal_amount' => 177948.95,
            'starts_at' => '2026-01-01',
            'status' => 'active',
            'show_caixa_fixo_story' => true,
            'created_by' => $user->id,
        ]);

        $construcao = DonationCampaign::create([
            'church_id' => $church->id,
            'title' => 'Construção da Igreja',
            'goal_amount' => 10000000,
            'starts_at' => '2023-11-01',
            'status' => 'active',
            'show_construcao_story' => true,
            'created_by' => $user->id,
        ]);

        $plain = DonationCampaign::create([
            'church_id' => $church->id,
            'title' => 'Campanha comum',
            'goal_amount' => 1000,
            'starts_at' => '2026-01-01',
            'status' => 'active',
            'created_by' => $user->id,
        ]);

        $this->actingAs($user)
            ->withSession(['working_church_id' => $church->id])
            ->delete(route('donation-campaigns.destroy', $caixaFixo))
            ->assertRedirect(route('donation-campaigns.index'));

        $this->actingAs($user)
            ->withSession(['working_church_id' => $church->id])
            ->delete(route('donation-campaigns.destroy', $construcao))
            ->assertRedirect(route('donation-campaigns.index'));

        $this->assertDatabaseHas('donation_campaigns', ['id' => $caixaFixo->id]);
        $this->assertDatabaseHas('donation_campaigns', ['id' => $construcao->id]);

        $this->actingAs($user)
            ->withSession(['working_church_id' => $church->id])
            ->delete(route('donation-campaigns.destroy', $plain))
            ->assertRedirect(route('donation-campaigns.index'));

        $this->assertDatabaseMissing('donation_campaigns', ['id' => $plain->id]);
    }

    public function test_donation_notifies_treasurer_and_campaign_creator_in_app(): void
    {
        Mail::fake();
        Storage::fake('public');
        $this->ensureCampaignPermissions();

        [$admin, $church] = $this->adminWithChurch();

        $financeRole = Role::firstOrCreate(['name' => 'financeiro']);
        $financeRole->givePermissionTo(Permission::firstOrCreate(['name' => 'finance.view', 'guard_name' => config('auth.defaults.guard')]));

        $treasurer = User::factory()->create(['church_id' => $church->id, 'notify_via_app' => true]);
        $treasurer->assignRole($financeRole);

        $creator = User::factory()->create(['church_id' => $church->id, 'notify_via_app' => true]);
        $donor = User::factory()->create(['church_id' => $church->id, 'name' => 'Carlos Doador']);

        $campaign = DonationCampaign::create([
            'church_id' => $church->id,
            'title' => 'Reforma do telhado',
            'goal_amount' => 10000,
            'status' => 'active',
            'created_by' => $creator->id,
        ]);

        $mock = Mockery::mock(ReceiptOcrService::class);
        $mock->shouldReceive('extractAmount')->once()->andReturn([
            'suggested_amount' => 150.0,
            'confidence' => 'high',
            'raw_text' => 'R$ 150,00',
        ]);
        $this->app->instance(ReceiptOcrService::class, $mock);

        $file = UploadedFile::fake()->image('comprovante.jpg');

        $this->actingAs($donor)
            ->postJson(route('mobile.campaigns.receipt', $campaign), ['receipt' => $file])
            ->assertOk();

        $this->actingAs($donor)
            ->post(route('mobile.campaigns.donate', $campaign), [
                'amount' => 150,
                'is_anonymous' => false,
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('user_inbox_notifications', [
            'user_id' => $treasurer->id,
            'title' => 'Nova contribuição — Reforma do telhado',
        ]);

        $this->assertDatabaseHas('user_inbox_notifications', [
            'user_id' => $creator->id,
            'title' => 'Contribuição na sua campanha — Reforma do telhado',
        ]);

        $treasurerNotification = UserInboxNotification::query()
            ->where('user_id', $treasurer->id)
            ->first();

        $this->assertNotNull($treasurerNotification);
        $this->assertStringContainsString('Reforma do telhado', $treasurerNotification->body);
        $this->assertStringContainsString('financeiro', $treasurerNotification->action_url ?? '');
    }

    public function test_admin_can_register_manual_donation(): void
    {
        $this->ensureCampaignPermissions();
        [$admin, $church] = $this->adminWithChurch();

        $campaign = DonationCampaign::create([
            'church_id' => $church->id,
            'created_by' => $admin->id,
            'title' => 'Obra social',
            'goal_amount' => 5000,
            'raised_amount' => 0,
            'status' => 'active',
            'allow_over_goal' => true,
        ]);

        $response = $this->actingAs($admin)
            ->withSession(['working_church_id' => $church->id])
            ->post(route('donation-campaigns.donations.manual', $campaign), [
                'amount' => 250.50,
                'external_donor_name' => 'Maria Souza',
                'manual_registration_note' => 'Doação em dinheiro recebida no culto de domingo.',
                'is_anonymous' => false,
            ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('campaign_donations', [
            'campaign_id' => $campaign->id,
            'source' => CampaignDonation::SOURCE_MANUAL,
            'external_donor_name' => 'Maria Souza',
            'amount' => 250.50,
            'registered_by' => $admin->id,
        ]);

        $campaign->refresh();
        $this->assertSame(250.50, (float) $campaign->raised_amount);
    }

    public function test_manual_donation_requires_registration_note(): void
    {
        $this->ensureCampaignPermissions();
        [$admin, $church] = $this->adminWithChurch();

        $campaign = DonationCampaign::create([
            'church_id' => $church->id,
            'created_by' => $admin->id,
            'title' => 'Obra social',
            'goal_amount' => 5000,
            'raised_amount' => 0,
            'status' => 'active',
            'allow_over_goal' => true,
        ]);

        $this->actingAs($admin)
            ->withSession(['working_church_id' => $church->id])
            ->post(route('donation-campaigns.donations.manual', $campaign), [
                'amount' => 100,
                'external_donor_name' => 'João',
                'manual_registration_note' => 'curto',
            ])
            ->assertSessionHasErrors('manual_registration_note');
    }

    public function test_manual_donation_blocked_on_archived_campaign(): void
    {
        $this->ensureCampaignPermissions();
        [$admin, $church] = $this->adminWithChurch();

        $campaign = DonationCampaign::create([
            'church_id' => $church->id,
            'created_by' => $admin->id,
            'title' => 'Campanha antiga',
            'goal_amount' => 1000,
            'raised_amount' => 0,
            'status' => 'archived',
            'allow_over_goal' => true,
        ]);

        $this->actingAs($admin)
            ->withSession(['working_church_id' => $church->id])
            ->post(route('donation-campaigns.donations.manual', $campaign), [
                'amount' => 50,
                'external_donor_name' => 'Pedro',
                'manual_registration_note' => 'Tentativa em campanha arquivada.',
            ])
            ->assertRedirect()
            ->assertSessionHas('error');
    }
}
