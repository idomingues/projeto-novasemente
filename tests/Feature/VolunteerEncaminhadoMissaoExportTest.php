<?php

namespace Tests\Feature;

use App\Models\Church;
use App\Models\Ministry;
use App\Models\User;
use App\Models\Volunteer;
use App\Models\VolunteerMinistryInvitation;
use App\Support\VolunteerEncaminhadoMissaoExport;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PhpOffice\PhpSpreadsheet\IOFactory;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class VolunteerEncaminhadoMissaoExportTest extends TestCase
{
    use RefreshDatabase;

    private function actingAsAdmin(): User
    {
        $this->seed();

        $user = User::factory()->create();
        $user->assignRole(Role::firstOrCreate(['name' => 'admin']));

        return $user;
    }

    public function test_export_lists_missao_vinculados_and_encaminhados(): void
    {
        $admin = $this->actingAsAdmin();
        $church = Church::query()->firstOrFail();

        $missao = Ministry::query()->create([
            'church_id' => $church->id,
            'name' => 'Missão',
        ]);
        $outro = Ministry::query()->where('church_id', $church->id)->whereKeyNot($missao->id)->firstOrFail();

        $this->actingAs($admin)->post('/volunteers', [
            'name' => 'Vol Vinculado Missao',
            'email' => 'vol.vinc.missao@example.com',
            'ministry_ids' => [$missao->id],
            'active' => '1',
            'birth_date' => '1990-01-15',
            'app_password' => 'secret123',
            'app_password_confirmation' => 'secret123',
        ])->assertRedirect();

        $this->actingAs($admin)->post('/volunteers', [
            'name' => 'Vol Encaminhado Missao',
            'email' => 'vol.enc.missao@example.com',
            'ministry_ids' => [$outro->id],
            'active' => '1',
            'birth_date' => '1990-01-15',
            'app_password' => 'secret123',
            'app_password_confirmation' => 'secret123',
        ])->assertRedirect();

        $encVolunteer = Volunteer::query()->where('email', 'vol.enc.missao@example.com')->firstOrFail();

        VolunteerMinistryInvitation::query()->create([
            'church_id' => $church->id,
            'volunteer_id' => $encVolunteer->id,
            'ministry_id' => $missao->id,
            'invited_by_user_id' => $admin->id,
            'token' => VolunteerMinistryInvitation::createToken(),
            'status' => 'pending',
            'expires_at' => now()->addDays(14),
        ]);

        $sets = VolunteerEncaminhadoMissaoExport::missaoVolunteerIdSets((int) $church->id);
        $this->assertCount(1, $sets['vinculados']);
        $this->assertCount(1, $sets['encaminhados']);

        $path = storage_path('app/exports/test-missao-101.xlsx');
        $count = VolunteerEncaminhadoMissaoExport::saveToPath((int) $church->id, $path);
        $this->assertSame(2, $count);

        $sheet = IOFactory::load($path)->getActiveSheet();
        $rows = $sheet->toArray();
        $this->assertSame('Vínculo Missão', $rows[0][3]);
        $emails = array_column(array_slice($rows, 1), 1);
        $this->assertContains('vol.vinc.missao@example.com', $emails);
        $this->assertContains('vol.enc.missao@example.com', $emails);

        @unlink($path);
    }

    public function test_admin_can_download_export_route(): void
    {
        $admin = $this->actingAsAdmin();
        $church = Church::query()->firstOrFail();

        $this->actingAs($admin)
            ->withSession(['working_church_id' => $church->id])
            ->get(route('volunteers.export-encaminhado-missao'))
            ->assertOk()
            ->assertHeader('content-type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    }
}
