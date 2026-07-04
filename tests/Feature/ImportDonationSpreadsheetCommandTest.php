<?php

namespace Tests\Feature;

use App\Models\CampaignDonation;
use App\Models\DonationCampaign;
use Database\Seeders\ChurchSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Tests\TestCase;

class ImportDonationSpreadsheetCommandTest extends TestCase
{
    use RefreshDatabase;

    public function test_command_creates_campaign_imports_rows_and_is_idempotent_on_rerun(): void
    {
        $this->seed(ChurchSeeder::class);

        $path = $this->createSpreadsheet([
            ['Construção Nova Sede', 'Oferta Direta', '09/05/2025', '09/05/2025', 150.75, 'Doador Anonimo'],
            ['Construção Nova Sede', 'Adiantamento', '10/05/2025', '10/05/2025', 50.00, 'Maria Souza'],
            ['Construção Nova Sede', 'Adiantamento', '10/05/2025', '10/05/2025', 50.00, 'Maria Souza'],
        ]);

        $this->artisan('donations:import-spreadsheet', [
            'path' => $path,
            '--create-campaign' => true,
        ])->assertSuccessful();

        $campaign = DonationCampaign::query()->firstOrFail();

        $this->assertSame('Construção Nova Sede', $campaign->title);
        $this->assertSame(250.75, (float) $campaign->raised_amount);
        $this->assertDatabaseCount('campaign_donations', 3);
        $this->assertDatabaseHas('campaign_donations', [
            'campaign_id' => $campaign->id,
            'source' => CampaignDonation::SOURCE_MANUAL,
            'external_donor_name' => 'Maria Souza',
            'amount' => 50.00,
            'is_anonymous' => false,
            'confirmed_at' => '2025-05-10 00:00:00',
        ]);

        $anonymousDonation = CampaignDonation::query()->where('is_anonymous', true)->firstOrFail();
        $this->assertSame('Doador Anonimo', $anonymousDonation->external_donor_name);
        $this->assertStringContainsString('Report Data', (string) $anonymousDonation->manual_registration_note);
        $this->assertSame('2025-05-09 00:00:00', $anonymousDonation->confirmed_at?->format('Y-m-d H:i:s'));

        $this->artisan('donations:import-spreadsheet', [
            'path' => $path,
            '--create-campaign' => true,
        ])->assertSuccessful();

        $this->assertDatabaseCount('donation_campaigns', 1);
        $this->assertDatabaseCount('campaign_donations', 3);
    }

    public function test_command_dry_run_does_not_persist_rows(): void
    {
        $this->seed(ChurchSeeder::class);

        $path = $this->createSpreadsheet([
            ['Construção Nova Sede', 'Oferta Direta', '09/05/2025', '09/05/2025', 150.75, 'Doador Anonimo'],
        ]);

        $this->artisan('donations:import-spreadsheet', [
            'path' => $path,
            '--create-campaign' => true,
            '--dry-run' => true,
        ])->assertSuccessful();

        $this->assertDatabaseCount('donation_campaigns', 0);
        $this->assertDatabaseCount('campaign_donations', 0);
    }

    /**
     * @param  array<int, array{0: string, 1: string, 2: string, 3: string, 4: float, 5: string}>  $rows
     */
    private function createSpreadsheet(array $rows): string
    {
        $dir = storage_path('app/testing');
        if (! is_dir($dir)) {
            mkdir($dir, 0777, true);
        }

        $path = $dir.'/donations-import-'.uniqid().'.xlsx';
        $spreadsheet = new Spreadsheet;
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Report Data');
        $sheet->fromArray([
            'Nome do Departamento',
            'Nome Tipo Movimento',
            'Data do Movimento',
            'Data do Evento',
            'Valor',
            'Descrição',
        ], null, 'A1');

        $rowNumber = 2;
        foreach ($rows as $row) {
            $sheet->fromArray($row, null, 'A'.$rowNumber);
            $rowNumber++;
        }

        $writer = new Xlsx($spreadsheet);
        $writer->save($path);

        return $path;
    }
}
