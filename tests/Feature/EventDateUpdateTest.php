<?php

namespace Tests\Feature;

use App\Models\Church;
use App\Models\Event;
use App\Models\User;
use App\Support\EventFormSupport;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class EventDateUpdateTest extends TestCase
{
    use RefreshDatabase;

    private function adminWithEvents(Church $church): User
    {
        Permission::firstOrCreate(['name' => 'events.manage']);
        Permission::firstOrCreate(['name' => 'events.view']);
        $admin = User::factory()->create(['church_id' => $church->id]);
        $admin->assignRole(Role::firstOrCreate(['name' => 'admin']));
        $admin->givePermissionTo(['events.manage', 'events.view']);

        return $admin;
    }

    public function test_datetime_local_without_timezone_is_read_as_sao_paulo(): void
    {
        config(['app.timezone' => 'America/Sao_Paulo']);

        $parsed = EventFormSupport::parseFormDateTime('2026-08-01T19:00');

        $this->assertNotNull($parsed);
        $this->assertSame('America/Sao_Paulo', $parsed->timezoneName);
        $this->assertSame('2026-08-01 19:00:00', $parsed->format('Y-m-d H:i:s'));
    }

    public function test_update_persists_datetime_local_fields_via_post_method_spoof(): void
    {
        $this->seed();
        $church = Church::query()->firstOrFail();
        $admin = $this->adminWithEvents($church);

        $event = Event::query()->create([
            'church_id' => $church->id,
            'title' => 'SAVE THE DATE',
            'starts_at' => Carbon::parse('2026-07-23 04:00:00', 'America/Sao_Paulo'),
            'ends_at' => Carbon::parse('2026-08-01 14:00:00', 'America/Sao_Paulo'),
            'published_at' => Carbon::parse('2026-07-22 20:00:00', 'America/Sao_Paulo'),
            'all_day' => false,
            'is_active' => true,
            'created_by' => $admin->id,
        ]);

        $this->actingAs($admin)
            ->withSession(['working_church_id' => $church->id])
            ->from(route('events.index'))
            ->post(route('events.update', $event), [
                'title' => 'SAVE THE DATE • 01/08',
                'description' => 'Convite especial',
                'starts_at' => '2026-08-01T19:00',
                'ends_at' => '2026-08-01T22:30',
                'published_at' => '2026-07-20T10:00',
                'all_day' => '0',
                'location' => 'Auditório',
                '_method' => 'PUT',
            ])
            ->assertSessionDoesntHaveErrors()
            ->assertRedirect(route('events.index', [
                'modal' => 'edit',
                'id' => $event->id,
            ]));

        $event->refresh();
        $tz = (string) config('app.timezone');
        $this->assertSame('2026-08-01 19:00:00', $event->starts_at->timezone($tz)->format('Y-m-d H:i:s'));
        $this->assertSame('2026-08-01 22:30:00', $event->ends_at?->timezone($tz)->format('Y-m-d H:i:s'));
        $this->assertSame('2026-07-20 10:00:00', $event->published_at?->timezone($tz)->format('Y-m-d H:i:s'));
        $this->assertSame('SAVE THE DATE • 01/08', $event->title);
    }

    public function test_json_update_returns_modal_redirect_and_keeps_dates(): void
    {
        $this->seed();
        $church = Church::query()->firstOrFail();
        $admin = $this->adminWithEvents($church);

        $event = Event::query()->create([
            'church_id' => $church->id,
            'title' => 'Ensaio',
            'starts_at' => Carbon::parse('2026-08-10 09:00:00', 'America/Sao_Paulo'),
            'published_at' => Carbon::parse('2026-08-01 08:00:00', 'America/Sao_Paulo'),
            'all_day' => false,
            'is_active' => true,
            'created_by' => $admin->id,
        ]);

        $this->actingAs($admin)
            ->withSession(['working_church_id' => $church->id])
            ->putJson(route('events.update', $event), [
                'title' => 'Ensaio',
                'starts_at' => '2026-08-22T19:30',
                'ends_at' => '2026-08-22T21:00',
                'published_at' => '2026-08-14T12:00',
                'all_day' => false,
            ])
            ->assertCreated()
            ->assertJsonPath('redirect', route('events.index', [
                'modal' => 'edit',
                'id' => $event->id,
            ]));

        $event->refresh();
        $tz = (string) config('app.timezone');
        $this->assertSame('2026-08-22 19:30:00', $event->starts_at->timezone($tz)->format('Y-m-d H:i:s'));
        $this->assertSame('2026-08-22 21:00:00', $event->ends_at?->timezone($tz)->format('Y-m-d H:i:s'));
        $this->assertSame('2026-08-14 12:00:00', $event->published_at?->timezone($tz)->format('Y-m-d H:i:s'));
    }
}
