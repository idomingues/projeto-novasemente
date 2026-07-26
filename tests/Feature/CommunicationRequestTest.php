<?php

namespace Tests\Feature;

use App\Mail\SolicitationNewRequestMail;
use App\Models\Church;
use App\Models\ChurchSolicitation;
use App\Models\Ministry;
use App\Models\User;
use Database\Seeders\ChurchSeeder;
use Database\Seeders\MinistrySeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class CommunicationRequestTest extends TestCase
{
    use RefreshDatabase;

    private function leaderUser(Church $church): User
    {
        $guard = config('auth.defaults.guard', 'web');
        $user = User::factory()->create([
            'church_id' => $church->id,
            'is_ministry_leader' => true,
        ]);
        $user->forceFill(['is_ministry_leader' => true])->save();

        return $user;
    }

    public function test_leader_can_submit_art_creation_with_channels_and_attachments(): void
    {
        Storage::fake('public');
        Mail::fake();

        $this->seed([ChurchSeeder::class, MinistrySeeder::class]);
        $church = Church::query()->firstOrFail();
        $user = $this->leaderUser($church);
        $ministry = Ministry::query()->where('church_id', $church->id)->where('name', 'Louvor')->firstOrFail();
        $user->ministries()->sync([$ministry->id]);

        $response = $this->actingAs($user)
            ->withSession(['working_church_id' => $church->id])
            ->post(route('communication-requests.store'), [
                'demand_type' => 'art_creation',
                'priority' => 'high',
                'event_date' => '2026-06-15',
                'ministry_id' => $ministry->id,
                'preferred_date' => '2026-06-01',
                'message' => 'Arte para o retiro de jovens.',
                'art_channels' => ['instagram_story', 'whatsapp'],
                'attachment_files' => [
                    UploadedFile::fake()->image('logo.png'),
                ],
            ]);

        $response->assertRedirect(route('communication-requests.index'));
        $response->assertSessionHas('success');

        $solicitation = ChurchSolicitation::query()->latest('id')->first();
        $this->assertNotNull($solicitation);
        $this->assertSame('communication_request', $solicitation->type);
        $meta = $solicitation->meta ?? [];
        $this->assertSame('art_creation', $meta['communication_demand_type']);
        $this->assertSame('2026-06-15', $meta['communication_event_date']);
        $this->assertSame('Louvor', $meta['communication_ministry_name']);
        $this->assertEquals(['instagram_story', 'whatsapp'], $meta['communication_art_channels']);
        $this->assertCount(1, $meta['communication_attachments'] ?? []);

        Mail::assertQueued(SolicitationNewRequestMail::class, function (SolicitationNewRequestMail $mail) {
            return $mail->hasTo(config('communication.notify_email'));
        });
    }

    public function test_programming_coverage_stores_event_and_support(): void
    {
        Mail::fake();
        $this->seed([ChurchSeeder::class, MinistrySeeder::class]);
        $church = Church::query()->firstOrFail();
        $user = $this->leaderUser($church);

        $this->actingAs($user)
            ->withSession(['working_church_id' => $church->id])
            ->post(route('communication-requests.store'), [
                'demand_type' => 'programming_coverage',
                'priority' => 'medium',
                'message' => 'Cobertura do culto de domingo.',
                'coverage_event' => 'Culto dominical',
                'coverage_support' => ['stories', 'photo'],
            ])
            ->assertRedirect();

        $meta = ChurchSolicitation::query()->latest('id')->first()?->meta ?? [];
        $this->assertSame('Culto dominical', $meta['communication_coverage_event']);
        $this->assertEquals(['stories', 'photo'], $meta['communication_coverage_support']);
    }

    public function test_store_rejects_ministry_not_linked_to_user(): void
    {
        Mail::fake();
        $this->seed([ChurchSeeder::class, MinistrySeeder::class]);
        $church = Church::query()->firstOrFail();
        $user = $this->leaderUser($church);
        $otherMinistry = Ministry::query()->where('church_id', $church->id)->where('name', 'Recepção')->firstOrFail();
        $user->ministries()->sync([]);

        $this->actingAs($user)
            ->withSession(['working_church_id' => $church->id])
            ->post(route('communication-requests.store'), [
                'demand_type' => 'art_creation',
                'priority' => 'medium',
                'message' => 'Teste de validação.',
                'ministry_id' => $otherMinistry->id,
            ])
            ->assertSessionHasErrors('ministry_id');
    }
}
