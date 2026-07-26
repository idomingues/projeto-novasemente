<?php

namespace Tests\Feature;

use App\Models\Church;
use App\Models\TalentCategory;
use App\Models\TalentListing;
use App\Models\User;
use App\Models\UserInboxNotification;
use App\Services\TalentConnectionNotifier;
use App\Support\NotificationFeed;
use Database\Seeders\ChurchSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class TalentConnectionPendingNotificationTest extends TestCase
{
    use RefreshDatabase;

    public function test_pending_listing_notifies_moderator_only_once_when_called_twice(): void
    {
        Mail::fake();
        $this->seed(ChurchSeeder::class);
        $church = Church::query()->firstOrFail();

        $guard = (string) config('auth.defaults.guard');
        Permission::firstOrCreate(['name' => 'talents.moderate', 'guard_name' => $guard]);
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $author = User::factory()->create(['church_id' => $church->id]);
        $moderator = User::factory()->create([
            'church_id' => $church->id,
            'notify_via_app' => true,
            'notify_via_email' => false,
        ]);
        $moderator->givePermissionTo('talents.moderate');
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $category = TalentCategory::query()->create([
            'church_id' => $church->id,
            'name' => 'Serviços',
            'slug' => 'servicos-teste',
            'sort_order' => 1,
            'is_active' => true,
        ]);

        $listing = TalentListing::query()->create([
            'church_id' => $church->id,
            'user_id' => $author->id,
            'category_id' => $category->id,
            'title' => 'Gestão Financeira terceirizada',
            'type' => TalentListing::TYPE_OFFER,
            'description' => 'Serviço de gestão.',
            'contact_whatsapp' => '11999999999',
            'status' => TalentListing::STATUS_PENDING,
            'member_declaration_at' => now(),
        ]);

        $notifier = app(TalentConnectionNotifier::class);
        $notifier->notifyModeratorsOfPendingListing($listing);
        $notifier->notifyModeratorsOfPendingListing($listing);

        $this->assertSame(1, UserInboxNotification::query()
            ->where('user_id', $moderator->id)
            ->where('title', 'Publicação aguardando aprovação')
            ->count());
    }

    public function test_feed_collapses_near_identical_inbox_duplicates(): void
    {
        $this->seed(ChurchSeeder::class);
        $church = Church::query()->firstOrFail();
        $user = User::factory()->create(['church_id' => $church->id]);

        $first = UserInboxNotification::query()->create([
            'user_id' => $user->id,
            'title' => 'Publicação aguardando aprovação',
            'body' => 'LUAN enviou «Gestão Financeira terceirizada» na Central de Serviços.',
            'action_url' => '/talents/admin?inbox=1',
        ]);
        $first->created_at = now()->subSeconds(30);
        $first->saveQuietly();

        UserInboxNotification::query()->create([
            'user_id' => $user->id,
            'title' => 'Publicação aguardando aprovação',
            'body' => 'LUAN enviou «Gestão Financeira terceirizada» na Central de Serviços.',
            'action_url' => '/talents/admin?inbox=2',
        ]);

        $request = Request::create('/');
        $request->setUserResolver(fn () => $user);

        $feed = NotificationFeed::mergedForUser($request, $church->id, 50);
        $matches = array_values(array_filter(
            $feed,
            fn (array $n) => $n['title'] === 'Publicação aguardando aprovação',
        ));

        $this->assertCount(1, $matches);
    }
}
