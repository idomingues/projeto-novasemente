<?php

namespace Tests\Feature;

use App\Http\Controllers\MobileChurchSolicitationController;
use App\Models\Church;
use App\Models\ChurchSolicitation;
use App\Models\Ministry;
use App\Models\User;
use App\Models\Volunteer;
use App\Support\VolunteerPipelineBootstrap;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class VolunteerRequestSuggestTest extends TestCase
{
    use RefreshDatabase;

    private function actingAsAdmin(): User
    {
        $this->seed();

        $user = User::factory()->create();
        $user->assignRole(Role::firstOrCreate(['name' => 'admin']));

        return $user;
    }

    public function test_staff_can_fetch_ranked_volunteer_suggestions_for_request(): void
    {
        $admin = $this->actingAsAdmin();
        $church = Church::query()->firstOrFail();
        $ministry = Ministry::query()->where('church_id', $church->id)->orderBy('name')->firstOrFail();

        $strong = Volunteer::query()->create([
            'name' => 'Maria Recepção Forte',
            'email' => 'maria.recepcao@example.com',
            'active' => true,
            'has_whatsapp' => true,
            'has_previous_ministry_volunteer_experience' => true,
            'other_ministry_interest' => 'Gosto de recepção e acolhimento no culto',
            'lgpd_data_consent' => true,
        ]);
        $weak = Volunteer::query()->create([
            'name' => 'João Sem Match',
            'email' => 'joao.sem@example.com',
            'active' => true,
            'other_ministry_interest' => 'Prefiro área técnica de som',
        ]);

        VolunteerPipelineBootstrap::ensureRowForVolunteerInChurch($strong, (int) $church->id);
        VolunteerPipelineBootstrap::ensureRowForVolunteerInChurch($weak, (int) $church->id);
        VolunteerPipelineBootstrap::moveVolunteerToStageByNormalizedName($strong, (int) $church->id, 'pronto para servir');

        $strong->ministries()->attach($ministry->id, [
            'clearance_status' => 'cleared',
            'cleared_at' => now(),
        ]);

        $solicitation = ChurchSolicitation::query()->create([
            'church_id' => $church->id,
            'user_id' => $admin->id,
            'type' => MobileChurchSolicitationController::TYPE_VOLUNTEER_REQUEST,
            'status' => 'pending',
            'subject' => 'Pedido de voluntário — '.$ministry->name,
            'message' => 'Precisamos de alguém para recepção no culto',
            'meta' => [
                'ministry_id' => $ministry->id,
                'source' => 'staff',
            ],
        ]);

        $response = $this->actingAs($admin)
            ->withSession(['working_church_id' => $church->id])
            ->getJson(route('volunteer-requests.staff.suggest-volunteers', $solicitation))
            ->assertOk()
            ->json();

        $this->assertSame($ministry->name, $response['ministryName']);
        $this->assertNotEmpty($response['suggestions']);

        $top = $response['suggestions'][0];
        $this->assertSame($strong->id, $top['id']);
        $this->assertGreaterThanOrEqual(12, $top['score']);
        $this->assertNotEmpty($top['reasons']);
    }

    public function test_suggest_requires_ministry_on_request(): void
    {
        $admin = $this->actingAsAdmin();
        $church = Church::query()->firstOrFail();

        $solicitation = ChurchSolicitation::query()->create([
            'church_id' => $church->id,
            'user_id' => $admin->id,
            'type' => MobileChurchSolicitationController::TYPE_VOLUNTEER_REQUEST,
            'status' => 'pending',
            'subject' => 'Pedido sem departamento',
            'message' => 'Teste',
            'meta' => ['source' => 'staff'],
        ]);

        $response = $this->actingAs($admin)
            ->withSession(['working_church_id' => $church->id])
            ->getJson(route('volunteer-requests.staff.suggest-volunteers', $solicitation))
            ->assertOk()
            ->json();

        $this->assertSame([], $response['suggestions']);
        $this->assertStringContainsString('departamento', (string) $response['message']);
    }
}
