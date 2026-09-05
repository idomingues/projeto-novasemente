<?php

namespace Tests\Feature;

use App\Models\Church;
use App\Models\SaturdayProgram;
use App\Models\User;
use App\Services\SaturdayProgramService;
use Carbon\Carbon;
use Database\Seeders\ChurchSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class SaturdayProgramTest extends TestCase
{
    use RefreshDatabase;

    private function grantManage(User $user): void
    {
        $guard = config('auth.defaults.guard');
        foreach (['programacao-sabado.view', 'programacao-sabado.manage'] as $name) {
            Permission::findOrCreate($name, $guard);
        }
        $role = Role::findOrCreate('admin', $guard);
        $role->givePermissionTo(['programacao-sabado.view', 'programacao-sabado.manage']);
        $user->assignRole($role);
    }

    public function test_hub_includes_programacao_sabado_route_when_feature_enabled(): void
    {
        $this->seed();

        $this->get(route('mobile.conheca'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('Mobile/ConhecaNovaSemente'));

        $this->get(route('mobile.programacao-sabado'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Mobile/ProgramacaoSabado')
                ->where('program.status', 'waiting')
                ->where('program.message', SaturdayProgramService::WAITING_MESSAGE));
    }

    public function test_mobile_shows_pdf_until_saturday_15_then_waiting(): void
    {
        Storage::fake('public');
        $this->seed(ChurchSeeder::class);
        $church = Church::query()->firstOrFail();

        $path = UploadedFile::fake()->create('culto.pdf', 120, 'application/pdf')
            ->store('saturday-programs/pdfs', 'public');

        SaturdayProgram::query()->create([
            'church_id' => $church->id,
            'saturday_date' => '2026-09-05',
            'title' => 'Culto de sábado',
            'pdf_path' => $path,
            'published_at' => Carbon::parse('2026-09-04 10:00:00', 'America/Sao_Paulo'),
            'is_active' => true,
        ]);

        Carbon::setTestNow(Carbon::parse('2026-09-05 14:59:00', 'America/Sao_Paulo'));
        $this->withSession(['working_church_id' => $church->id])
            ->get(route('mobile.programacao-sabado'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Mobile/ProgramacaoSabado')
                ->where('program.status', 'available')
                ->where('program.title', 'Culto de sábado')
                ->where('program.saturday_date', '2026-09-05'));

        Carbon::setTestNow(Carbon::parse('2026-09-05 15:00:00', 'America/Sao_Paulo'));
        $this->withSession(['working_church_id' => $church->id])
            ->get(route('mobile.programacao-sabado'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Mobile/ProgramacaoSabado')
                ->where('program.status', 'waiting')
                ->where('program.message', SaturdayProgramService::WAITING_MESSAGE));

        Carbon::setTestNow();
    }

    public function test_admin_can_publish_pdf_for_saturday(): void
    {
        Storage::fake('public');
        $this->seed(ChurchSeeder::class);
        $church = Church::query()->firstOrFail();
        $user = User::factory()->create(['church_id' => $church->id]);
        $this->grantManage($user);

        $file = UploadedFile::fake()->create('programacao.pdf', 200, 'application/pdf');

        $this->actingAs($user)
            ->withSession(['working_church_id' => $church->id])
            ->post(route('programacao-sabado.store'), [
                'saturday_date' => '2026-09-05',
                'title' => 'Programação 5/9',
                'pdf_file' => $file,
            ])
            ->assertRedirect();

        $row = SaturdayProgram::query()->firstOrFail();
        $this->assertSame($church->id, (int) $row->church_id);
        $this->assertSame('2026-09-05', $row->saturday_date->toDateString());
        $this->assertSame('Programação 5/9', $row->title);
        $this->assertTrue($row->is_active);
        Storage::disk('public')->assertExists($row->pdf_path);
    }

    public function test_store_rejects_non_saturday_date(): void
    {
        Storage::fake('public');
        $this->seed(ChurchSeeder::class);
        $church = Church::query()->firstOrFail();
        $user = User::factory()->create(['church_id' => $church->id]);
        $this->grantManage($user);

        $this->actingAs($user)
            ->withSession(['working_church_id' => $church->id])
            ->post(route('programacao-sabado.store'), [
                'saturday_date' => '2026-09-04',
                'pdf_file' => UploadedFile::fake()->create('x.pdf', 10, 'application/pdf'),
            ])
            ->assertSessionHasErrors('saturday_date');
    }

    public function test_expire_command_deactivates_and_deletes_pdf(): void
    {
        Storage::fake('public');
        $this->seed(ChurchSeeder::class);
        $church = Church::query()->firstOrFail();

        $path = UploadedFile::fake()->create('old.pdf', 80, 'application/pdf')
            ->store('saturday-programs/pdfs', 'public');

        $program = SaturdayProgram::query()->create([
            'church_id' => $church->id,
            'saturday_date' => '2026-09-05',
            'title' => null,
            'pdf_path' => $path,
            'published_at' => Carbon::parse('2026-09-01 08:00:00', 'America/Sao_Paulo'),
            'is_active' => true,
        ]);

        Carbon::setTestNow(Carbon::parse('2026-09-05 15:05:00', 'America/Sao_Paulo'));

        $this->artisan('app:expire-saturday-programs')
            ->assertSuccessful();

        $program->refresh();
        $this->assertFalse($program->is_active);
        $this->assertSame('', $program->pdf_path);
        Storage::disk('public')->assertMissing($path);

        Carbon::setTestNow();
    }
}
