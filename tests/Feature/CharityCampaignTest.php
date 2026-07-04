<?php

namespace Tests\Feature;

use App\Mail\CharityCampaignThanksDonorMail;
use App\Models\AppNotification;
use App\Models\CharityCampaign;
use App\Models\CharityDonation;
use App\Models\CharityItemDonation;
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

    public function test_admin_can_create_item_charity_campaign_and_broadcast_publication(): void
    {
        $this->ensureDonationPermissions();
        [$user, $church] = $this->adminWithChurch();

        $response = $this->actingAs($user)
            ->withSession(['working_church_id' => $church->id])
            ->post(route('charity-campaigns.store'), [
                'type' => CharityCampaign::TYPE_ITEMS,
                'title' => 'Precisamos de monitores',
                'description' => 'Doação de objetos para a sala das crianças.',
                'goal_quantity' => 2,
                'unit_label' => 'monitores',
                'starts_at' => '2026-07-10',
                'status' => 'active',
            ]);

        $response->assertRedirect(route('charity-campaigns.index'));

        $campaign = CharityCampaign::query()->where('title', 'Precisamos de monitores')->firstOrFail();

        $this->assertSame(CharityCampaign::TYPE_ITEMS, $campaign->type);
        $this->assertSame(2, $campaign->goal_quantity);
        $this->assertSame('monitores', $campaign->unit_label);

        $notification = AppNotification::query()->latest('id')->first();
        $this->assertNotNull($notification);
        $this->assertSame('Nova campanha de doação de objetos: Precisamos de monitores', $notification->title);
    }

    public function test_user_can_pledge_item_donation_and_team_can_confirm_receipt(): void
    {
        $this->ensureDonationPermissions();
        [$admin, $church] = $this->adminWithChurch();
        $donor = User::factory()->create(['church_id' => $church->id]);

        $campaign = CharityCampaign::create([
            'church_id' => $church->id,
            'type' => CharityCampaign::TYPE_ITEMS,
            'progress_mode' => CharityCampaign::PROGRESS_QUANTITY,
            'title' => 'Monitores para a sala',
            'goal_quantity' => 2,
            'unit_label' => 'monitores',
            'status' => 'active',
            'created_by' => $admin->id,
        ]);

        $pledge = $this->actingAs($donor)
            ->post(route('mobile.donations.items.pledge', $campaign), [
                'item_description' => 'Monitor 23 polegadas',
                'quantity' => 2,
                'notes' => 'Consigo entregar no próximo sábado.',
            ]);

        $pledge->assertRedirect(route('mobile.donations.show', $campaign));

        $itemDonation = CharityItemDonation::query()->firstOrFail();
        $this->assertSame(CharityItemDonation::STATUS_PLEDGED, $itemDonation->status);

        $campaign->refresh();
        $this->assertSame(2, $campaign->pledged_quantity);
        $this->assertSame(0, $campaign->collected_quantity);

        $receive = $this->actingAs($admin)
            ->post(route('charity-campaigns.items.receive', $itemDonation->id));

        $receive->assertRedirect();

        $itemDonation->refresh();
        $campaign->refresh();

        $this->assertSame(CharityItemDonation::STATUS_RECEIVED, $itemDonation->status);
        $this->assertSame(2, $campaign->pledged_quantity);
        $this->assertSame(2, $campaign->collected_quantity);
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

    public function test_publishing_charity_thanks_notifies_item_donors(): void
    {
        Mail::fake();
        $this->ensureDonationPermissions();

        [$admin, $church] = $this->adminWithChurch();
        $donor = User::factory()->create([
            'church_id' => $church->id,
            'email' => 'itens@example.com',
            'notify_via_email' => true,
            'notify_via_app' => true,
        ]);

        $campaign = CharityCampaign::create([
            'church_id' => $church->id,
            'type' => CharityCampaign::TYPE_ITEMS,
            'progress_mode' => CharityCampaign::PROGRESS_QUANTITY,
            'title' => 'Cobertores solidários',
            'goal_quantity' => 10,
            'unit_label' => 'cobertores',
            'status' => CharityCampaign::STATUS_CLOSED,
            'created_by' => $admin->id,
        ]);

        CharityItemDonation::create([
            'campaign_id' => $campaign->id,
            'user_id' => $donor->id,
            'item_description' => 'Cobertor casal',
            'quantity' => 2,
            'unit_label' => 'cobertores',
            'status' => CharityItemDonation::STATUS_RECEIVED,
            'pledged_at' => now()->subDay(),
            'received_at' => now(),
        ]);

        $response = $this->actingAs($admin)
            ->withSession(['working_church_id' => $church->id])
            ->post(route('charity-campaigns.thanks.publish', $campaign), [
                'thanks_message' => 'Obrigado por cada item entregue.',
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

    public function test_treasurer_can_view_item_donation_treasury_dashboard(): void
    {
        $this->ensureDonationPermissions();

        [$admin, $church] = $this->adminWithChurch();
        $treasurer = User::factory()->create(['church_id' => $church->id]);
        $treasurer->assignRole(Role::firstOrCreate(['name' => 'financeiro']));

        $campaign = CharityCampaign::create([
            'church_id' => $church->id,
            'type' => CharityCampaign::TYPE_ITEMS,
            'progress_mode' => CharityCampaign::PROGRESS_QUANTITY,
            'title' => 'Cadeiras infantis',
            'goal_quantity' => 4,
            'unit_label' => 'cadeiras',
            'status' => 'active',
            'created_by' => $admin->id,
        ]);

        CharityItemDonation::create([
            'campaign_id' => $campaign->id,
            'external_donor_name' => 'Marina Costa',
            'item_description' => 'Cadeira azul',
            'quantity' => 2,
            'unit_label' => 'cadeiras',
            'status' => CharityItemDonation::STATUS_PLEDGED,
            'pledged_at' => now(),
        ]);

        $response = $this->actingAs($treasurer)
            ->withSession(['working_church_id' => $church->id])
            ->get(route('finance.charity-donations.index', ['campaign_type' => 'items']));

        $response->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('Finance/DonationTreasurerDashboard')
            ->where('filters.campaign_type', 'items')
            ->where('campaigns.0.title', 'Cadeiras infantis')
            ->where('donations.data.0.item_description', 'Cadeira azul')
            ->where('donations.data.0.quantity', 2)
        );
    }
}
