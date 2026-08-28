<?php

namespace Tests\Feature;

use App\Models\Church;
use App\Models\ConvivaCheckin;
use App\Models\ConvivaClass;
use App\Models\User;
use App\Support\ConvivaSaturday;
use Carbon\Carbon;
use Database\Seeders\ChurchSeeder;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class ConvivaCheckinTest extends TestCase
{
    use RefreshDatabase;

    private function seedBase(): array
    {
        $this->seed([RolePermissionSeeder::class, ChurchSeeder::class]);
        Role::firstOrCreate(['name' => 'membro', 'guard_name' => 'web']);

        $churchId = (int) Church::query()->orderBy('id')->value('id');
        $member = User::factory()->create(['church_id' => $churchId]);
        $member->assignRole('membro');

        $class = ConvivaClass::query()->create([
            'church_id' => $churchId,
            'room_name' => 'Sala 1',
            'teacher_name' => 'Maria Silva',
            'is_active' => true,
            'sort_order' => 1,
        ]);

        $classB = ConvivaClass::query()->create([
            'church_id' => $churchId,
            'room_name' => 'Sala 2',
            'teacher_name' => 'João Pereira',
            'is_active' => true,
            'sort_order' => 2,
        ]);

        return compact('churchId', 'member', 'class', 'classB');
    }

    public function test_admin_can_create_conviva_class(): void
    {
        $this->seed([RolePermissionSeeder::class, ChurchSeeder::class]);
        $churchId = (int) Church::query()->orderBy('id')->value('id');
        $admin = User::factory()->create(['church_id' => $churchId]);
        $admin->assignRole('admin');

        $this->actingAs($admin)
            ->withSession(['working_church_id' => $churchId])
            ->post(route('conviva.store'), [
                'room_name' => 'Mezanino A',
                'teacher_name' => 'Ana Costa',
                'is_active' => true,
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('conviva_classes', [
            'church_id' => $churchId,
            'room_name' => 'Mezanino A',
            'teacher_name' => 'Ana Costa',
        ]);
    }

    public function test_checkin_only_on_saturday(): void
    {
        ['member' => $member, 'class' => $class] = $this->seedBase();

        Carbon::setTestNow(ConvivaSaturday::now()->next(Carbon::WEDNESDAY)->setTime(10, 0));

        $this->actingAs($member)
            ->post(route('mobile.conviva.checkin.store'), [
                'conviva_class_id' => $class->id,
            ])
            ->assertSessionHasErrors('conviva_class_id');

        $this->assertDatabaseCount('conviva_checkins', 0);

        Carbon::setTestNow();
    }

    public function test_member_can_checkin_on_saturday_and_switch_class(): void
    {
        ['churchId' => $churchId, 'member' => $member, 'class' => $class, 'classB' => $classB] = $this->seedBase();

        Carbon::setTestNow(ConvivaSaturday::now()->next(Carbon::SATURDAY)->setTime(10, 30));

        $this->actingAs($member)
            ->post(route('mobile.conviva.checkin.store'), [
                'conviva_class_id' => $class->id,
            ])
            ->assertRedirect(route('mobile.conviva.checkin'));

        $this->assertTrue(
            ConvivaCheckin::query()
                ->where('church_id', $churchId)
                ->where('user_id', $member->id)
                ->where('conviva_class_id', $class->id)
                ->whereDate('checkin_date', Carbon::now()->toDateString())
                ->exists()
        );

        $this->actingAs($member)
            ->post(route('mobile.conviva.checkin.store'), [
                'conviva_class_id' => $classB->id,
            ])
            ->assertRedirect(route('mobile.conviva.checkin'));

        $this->assertSame(1, ConvivaCheckin::query()->where('user_id', $member->id)->count());
        $this->assertTrue(
            ConvivaCheckin::query()
                ->where('user_id', $member->id)
                ->where('conviva_class_id', $classB->id)
                ->exists()
        );
        $this->assertDatabaseHas('conviva_preferences', [
            'user_id' => $member->id,
            'church_id' => $churchId,
            'conviva_class_id' => $classB->id,
        ]);

        Carbon::setTestNow();
    }

    public function test_admin_presence_lists_checkins_for_saturday(): void
    {
        ['churchId' => $churchId, 'member' => $member, 'class' => $class] = $this->seedBase();
        $admin = User::factory()->create(['church_id' => $churchId]);
        $admin->assignRole('admin');

        $saturday = ConvivaSaturday::now()->next(Carbon::SATURDAY)->toDateString();
        ConvivaCheckin::query()->create([
            'church_id' => $churchId,
            'user_id' => $member->id,
            'conviva_class_id' => $class->id,
            'checkin_date' => $saturday,
        ]);

        $this->actingAs($admin)
            ->withSession(['working_church_id' => $churchId])
            ->get(route('conviva.index', ['tab' => 'presencas', 'date' => $saturday]))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Conviva/Index')
                ->where('tab', 'presencas')
                ->where('presence.total', 1)
                ->where('presence.checkins.0.user_name', $member->name));
    }
}
