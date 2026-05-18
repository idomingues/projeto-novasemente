<?php

namespace Tests\Feature;

use App\Models\AppNotification;
use App\Models\Church;
use App\Models\User;
use App\Models\UserInboxNotification;
use Database\Seeders\ChurchSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class AppNotificationTest extends TestCase
{
    use RefreshDatabase;

    private function adminUser(Church $church): User
    {
        $guard = (string) config('auth.defaults.guard');
        $user = User::factory()->create([
            'church_id' => $church->id,
        ]);
        $user->assignRole(Role::firstOrCreate(['name' => 'admin', 'guard_name' => $guard]));

        return $user;
    }

    public function test_admin_can_broadcast_notification_to_all_users(): void
    {
        $this->seed(ChurchSeeder::class);
        $church = Church::query()->firstOrFail();
        $admin = $this->adminUser($church);

        $response = $this->actingAs($admin)
            ->withSession(['working_church_id' => $church->id])
            ->post(route('notifications.store'), [
                'audience' => 'all',
                'title' => 'Aviso geral',
                'body' => 'Mensagem para todos.',
            ]);

        $response->assertRedirect();
        $response->assertSessionHas('success');

        $this->assertDatabaseHas('app_notifications', [
            'church_id' => $church->id,
            'title' => 'Aviso geral',
            'body' => 'Mensagem para todos.',
        ]);
        $this->assertSame(1, AppNotification::query()->count());
        $this->assertSame(0, UserInboxNotification::query()->count());
    }

    public function test_admin_can_send_notification_to_single_user(): void
    {
        $this->seed(ChurchSeeder::class);
        $church = Church::query()->firstOrFail();
        $admin = $this->adminUser($church);
        $recipient = User::factory()->create([
            'church_id' => $church->id,
            'notify_via_app' => true,
        ]);

        $response = $this->actingAs($admin)
            ->withSession(['working_church_id' => $church->id])
            ->post(route('notifications.store'), [
                'audience' => 'user',
                'user_id' => $recipient->id,
                'title' => 'Aviso pessoal',
                'body' => 'Mensagem só para você.',
            ]);

        $response->assertRedirect();
        $response->assertSessionHas('success');

        $this->assertSame(0, AppNotification::query()->count());
        $this->assertDatabaseHas('user_inbox_notifications', [
            'user_id' => $recipient->id,
            'title' => 'Aviso pessoal',
            'body' => 'Mensagem só para você.',
        ]);
    }

    public function test_cannot_send_to_user_from_another_church(): void
    {
        $this->seed(ChurchSeeder::class);
        $church = Church::query()->firstOrFail();
        $otherChurch = Church::query()->create([
            'name' => 'Outra Igreja',
            'slug' => 'outra-igreja-'.uniqid(),
        ]);
        $admin = $this->adminUser($church);
        $recipient = User::factory()->create([
            'church_id' => $otherChurch->id,
            'notify_via_app' => true,
        ]);

        $response = $this->actingAs($admin)
            ->withSession(['working_church_id' => $church->id])
            ->post(route('notifications.store'), [
                'audience' => 'user',
                'user_id' => $recipient->id,
                'title' => 'Aviso',
                'body' => 'Teste',
            ]);

        $response->assertSessionHasErrors('user_id');
        $this->assertSame(0, UserInboxNotification::query()->count());
    }
}
