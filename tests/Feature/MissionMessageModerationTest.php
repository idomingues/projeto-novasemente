<?php

namespace Tests\Feature;

use App\Models\Church;
use App\Models\MissionMessage;
use App\Models\User;
use App\Models\UserInboxNotification;
use App\Services\MissionMessageNotifier;
use Database\Seeders\ChurchSeeder;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class MissionMessageModerationTest extends TestCase
{
    use RefreshDatabase;

    public function test_clean_message_is_published_immediately(): void
    {
        Http::fake([
            'api.openai.com/*' => Http::response([
                'results' => [['flagged' => false, 'categories' => []]],
            ]),
        ]);

        config([
            'mission.message_moderation.enabled' => true,
            'mission.message_moderation.openai_api_key' => 'test-key',
        ]);

        $this->seed(ChurchSeeder::class);
        $church = Church::query()->firstOrFail();
        $user = User::factory()->create(['church_id' => $church->id]);

        $this->actingAs($user)
            ->withSession(['working_church_id' => $church->id])
            ->post(route('mobile.mission.messages.store'), ['body' => 'Deus abençoe a equipe missionária!'])
            ->assertRedirect(route('mobile.mission.messages'))
            ->assertSessionHas('success');

        $this->assertDatabaseHas('mission_messages', [
            'church_id' => $church->id,
            'user_id' => $user->id,
            'body' => 'Deus abençoe a equipe missionária!',
            'moderation_status' => MissionMessage::STATUS_PUBLISHED,
        ]);
    }

    public function test_flagged_message_goes_to_pending_review_and_notifies_moderator(): void
    {
        Http::fake([
            'api.openai.com/*' => Http::response([
                'results' => [[
                    'flagged' => true,
                    'categories' => ['harassment' => true],
                ]],
            ]),
        ]);

        config([
            'mission.message_moderation.enabled' => true,
            'mission.message_moderation.openai_api_key' => 'test-key',
        ]);

        $this->seed([ChurchSeeder::class, RolePermissionSeeder::class]);
        $church = Church::query()->firstOrFail();
        $author = User::factory()->create(['church_id' => $church->id]);
        $moderator = User::factory()->create(['church_id' => $church->id]);
        $moderator->givePermissionTo('mission.manage');

        $this->actingAs($author)
            ->withSession(['working_church_id' => $church->id])
            ->post(route('mobile.mission.messages.store'), ['body' => 'mensagem ofensiva de teste'])
            ->assertRedirect(route('mobile.mission.messages'))
            ->assertSessionHas('info');

        $message = MissionMessage::query()->where('user_id', $author->id)->first();
        $this->assertNotNull($message);
        $this->assertSame(MissionMessage::STATUS_PENDING_REVIEW, $message->moderation_status);
        $this->assertNotNull($message->moderation_note);

        $this->assertDatabaseHas('user_inbox_notifications', [
            'user_id' => $moderator->id,
        ]);
    }

    public function test_notifier_sends_inbox_to_author(): void
    {
        $this->seed(ChurchSeeder::class);
        $church = Church::query()->firstOrFail();
        $author = User::factory()->create(['church_id' => $church->id, 'notify_via_app' => true]);

        $message = MissionMessage::create([
            'church_id' => $church->id,
            'user_id' => $author->id,
            'body' => 'Teste',
            'moderation_status' => MissionMessage::STATUS_PENDING_REVIEW,
            'is_hidden' => false,
        ]);

        app(MissionMessageNotifier::class)->notifyAuthorOfDecision($message->load('user'), 'approved');

        $this->assertDatabaseHas('user_inbox_notifications', [
            'user_id' => $author->id,
            'title' => 'Depoimento aprovado',
        ]);
    }

    public function test_admin_can_approve_pending_message_and_notify_author(): void
    {
        $this->seed([ChurchSeeder::class, RolePermissionSeeder::class]);
        $church = Church::query()->firstOrFail();
        $author = User::factory()->create(['church_id' => $church->id, 'notify_via_app' => true]);
        $admin = User::factory()->create(['church_id' => $church->id]);
        $admin->givePermissionTo('mission.manage');

        $message = MissionMessage::create([
            'church_id' => $church->id,
            'user_id' => $author->id,
            'body' => 'Recado em análise',
            'moderation_status' => MissionMessage::STATUS_PENDING_REVIEW,
            'moderation_note' => 'Sinalizado por: assédio.',
            'is_hidden' => false,
        ]);

        $response = $this->actingAs($admin)
            ->withSession(['working_church_id' => $church->id])
            ->patch(route('mission.content.messages.approve', $message));

        $response->assertRedirect()->assertSessionHas('success');

        $message->refresh();
        $this->assertSame(MissionMessage::STATUS_PUBLISHED, $message->moderation_status);

        $this->assertDatabaseHas('user_inbox_notifications', [
            'user_id' => $author->id,
            'title' => 'Depoimento aprovado',
        ]);
    }

    public function test_admin_can_reject_pending_message_and_notify_author(): void
    {
        $this->seed([ChurchSeeder::class, RolePermissionSeeder::class]);
        $church = Church::query()->firstOrFail();
        $author = User::factory()->create(['church_id' => $church->id, 'notify_via_app' => true]);
        $admin = User::factory()->create(['church_id' => $church->id]);
        $admin->givePermissionTo('mission.manage');

        $message = MissionMessage::create([
            'church_id' => $church->id,
            'user_id' => $author->id,
            'body' => 'Recado em análise',
            'moderation_status' => MissionMessage::STATUS_PENDING_REVIEW,
            'is_hidden' => false,
        ]);

        $this->actingAs($admin)
            ->withSession(['working_church_id' => $church->id])
            ->patch(route('mission.content.messages.reject', $message))
            ->assertRedirect();

        $message->refresh();
        $this->assertSame(MissionMessage::STATUS_REJECTED, $message->moderation_status);

        $this->assertTrue(
            UserInboxNotification::query()
                ->where('user_id', $author->id)
                ->where('title', 'Depoimento não publicado')
                ->exists()
        );
    }

    public function test_admin_team_message_is_published_highlighted_without_moderation(): void
    {
        config(['mission.message_moderation.enabled' => true]);

        $this->seed([ChurchSeeder::class, RolePermissionSeeder::class]);
        $church = Church::query()->firstOrFail();
        $admin = User::factory()->create(['church_id' => $church->id]);
        $admin->givePermissionTo('mission.manage');

        $this->actingAs($admin)
            ->withSession(['working_church_id' => $church->id])
            ->post(route('mission.content.messages.store'), ['body' => 'Mensagem oficial da equipe missionária.'])
            ->assertRedirect(route('mission.content.messages'))
            ->assertSessionHas('success');

        $this->assertDatabaseHas('mission_messages', [
            'church_id' => $church->id,
            'user_id' => $admin->id,
            'body' => 'Mensagem oficial da equipe missionária.',
            'moderation_status' => MissionMessage::STATUS_PUBLISHED,
            'is_team_highlight' => true,
        ]);

    }

    public function test_pending_messages_are_not_visible_on_mobile_feed(): void
    {
        $this->seed(ChurchSeeder::class);
        $church = Church::query()->firstOrFail();

        MissionMessage::create([
            'church_id' => $church->id,
            'user_id' => User::factory()->create(['church_id' => $church->id])->id,
            'body' => 'Só para moderador',
            'moderation_status' => MissionMessage::STATUS_PENDING_REVIEW,
            'is_hidden' => false,
        ]);

        $this->withSession(['working_church_id' => $church->id])
            ->get(route('mobile.mission.messages'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Mobile/MissionMessages')
                ->has('messages', 0));
    }
}
