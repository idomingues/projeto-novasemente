<?php

namespace Tests\Feature;

use App\Http\Controllers\MobileChurchSolicitationController;
use App\Models\Church;
use App\Models\ChurchSolicitation;
use App\Models\ChurchSolicitationMessage;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ClearPendingVolunteerRequestsCommandTest extends TestCase
{
    use RefreshDatabase;

    public function test_dry_run_does_not_delete(): void
    {
        $this->seed();
        [$pending, $inProgress, $completed, $other] = $this->seedSolicitations();

        $this->artisan('volunteer-requests:clear-pending')
            ->assertSuccessful()
            ->expectsOutputToContain('Nada foi alterado');

        $this->assertNotNull($pending->fresh());
        $this->assertNotNull($inProgress->fresh());
        $this->assertNotNull($completed->fresh());
        $this->assertNotNull($other->fresh());
    }

    public function test_force_deletes_pending_and_in_progress_volunteer_requests_only(): void
    {
        $this->seed();
        [$pending, $inProgress, $completed, $other] = $this->seedSolicitations();

        $this->artisan('volunteer-requests:clear-pending', ['--force' => true])
            ->assertSuccessful()
            ->expectsOutputToContain('Excluídos 2 pedido(s)');

        $this->assertNull($pending->fresh());
        $this->assertNull($inProgress->fresh());
        $this->assertNotNull($completed->fresh());
        $this->assertNotNull($other->fresh());
        $this->assertSame(0, ChurchSolicitationMessage::query()->count());
    }

    public function test_force_with_church_scopes_deletion(): void
    {
        $this->seed();
        $church = Church::query()->firstOrFail();
        $user = User::factory()->create();

        $keep = ChurchSolicitation::query()->create([
            'church_id' => $church->id,
            'user_id' => $user->id,
            'type' => MobileChurchSolicitationController::TYPE_VOLUNTEER_REQUEST,
            'status' => 'pending',
            'subject' => 'Pedido desta igreja',
            'message' => 'Keep scoped',
        ]);

        $this->artisan('volunteer-requests:clear-pending', [
            '--force' => true,
            '--church' => 'igreja-inexistente',
        ])->assertFailed();

        $this->assertNotNull($keep->fresh());

        $this->artisan('volunteer-requests:clear-pending', [
            '--force' => true,
            '--church' => (string) $church->id,
        ])->assertSuccessful();

        $this->assertNull($keep->fresh());
    }

    /**
     * @return array{0: ChurchSolicitation, 1: ChurchSolicitation, 2: ChurchSolicitation, 3: ChurchSolicitation}
     */
    private function seedSolicitations(): array
    {
        $church = Church::query()->firstOrFail();
        $user = User::factory()->create();

        $pending = ChurchSolicitation::query()->create([
            'church_id' => $church->id,
            'user_id' => $user->id,
            'type' => MobileChurchSolicitationController::TYPE_VOLUNTEER_REQUEST,
            'status' => 'pending',
            'subject' => 'Pedido pendente',
            'message' => 'Pendente',
        ]);
        $inProgress = ChurchSolicitation::query()->create([
            'church_id' => $church->id,
            'user_id' => $user->id,
            'type' => MobileChurchSolicitationController::TYPE_VOLUNTEER_REQUEST,
            'status' => 'in_progress',
            'subject' => 'Pedido em andamento',
            'message' => 'Chat iniciado',
        ]);
        $completed = ChurchSolicitation::query()->create([
            'church_id' => $church->id,
            'user_id' => $user->id,
            'type' => MobileChurchSolicitationController::TYPE_VOLUNTEER_REQUEST,
            'status' => 'completed',
            'subject' => 'Pedido concluído',
            'message' => 'Já anexado',
            'completed_at' => now(),
        ]);
        $other = ChurchSolicitation::query()->create([
            'church_id' => $church->id,
            'user_id' => $user->id,
            'type' => 'baptism',
            'status' => 'pending',
            'subject' => 'Batismo',
            'message' => 'Não é pedido de voluntário',
        ]);

        ChurchSolicitationMessage::query()->create([
            'church_solicitation_id' => $pending->id,
            'sender_type' => 'staff',
            'sender_user_id' => $user->id,
            'content' => 'Mensagem no pedido pendente',
        ]);

        return [$pending, $inProgress, $completed, $other];
    }
}
