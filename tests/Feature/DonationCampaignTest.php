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
                'status' => 'active',
                'allow_over_goal' => true,
            ]);

        $response->assertRedirect(route('donation-campaigns.index'));
        $this->assertDatabaseHas('donation_campaigns', [
            'title' => 'Viagem dos desbravadores',
            'church_id' => $church->id,
            'goal_amount' => 20000,
        ]);
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
            ->patch(route('finance.donations.update', $donation), [
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
            ->patch(route('finance.donations.update', $donation), [
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
            'title' => 'Agradecimento pela sua doação',
        ]);
        $this->assertDatabaseHas('user_inbox_notifications', [
            'user_id' => $donorInboxOnly->id,
            'title' => 'Agradecimento pela sua doação',
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
            ->where('campaign.story_youtube_embed_url', 'https://www.youtube.com/embed/dQw4w9WgXcQ')
            ->where('campaign.thanks_is_published', true)
            ->has('campaign.story_photos', 1)
        );
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
            'title' => 'Nova doação registrada',
        ]);

        $this->assertDatabaseHas('user_inbox_notifications', [
            'user_id' => $creator->id,
            'title' => 'Doação na sua campanha',
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
