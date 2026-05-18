<?php

namespace Tests\Feature;

use App\Models\Church;
use App\Models\MissionVolunteer;
use Database\Seeders\ChurchSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class MissionFormTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_mission_form_accepts_sixteen_question_payload(): void
    {
        Storage::fake('public');
        $this->seed(ChurchSeeder::class);
        $church = Church::query()->firstOrFail();

        $response = $this->withSession(['working_church_id' => $church->id])
            ->post(route('mission.store'), [
                'photo' => UploadedFile::fake()->image('face.jpg', 400, 400),
                'full_name' => 'Maria Silva',
                'birth_date' => '1990-03-15',
                'phone' => '11999998888',
                'full_address' => 'Rua das Flores, 100',
                'profession' => 'Enfermeiro(a)',
                'has_belief' => true,
                'belief_which' => 'Cristianismo (Protestantismo / Evangélicos)',
                'participates_religion' => true,
                'religion_which' => 'Igreja Batista',
                'baptized' => true,
                'seeks_in_community' => ['Música/Louvor'],
                'studied_bible' => 'Sim, parcialmente',
                'studied_bible_structured' => false,
                'first_time_nova_semente' => true,
                'first_contact_via' => 'Amigos',
                'wants_bible_study_partner' => 'Sim',
                'lgpd_consent' => true,
            ]);

        $response->assertRedirect(route('mission.form'));
        $response->assertSessionHas('success');

        $volunteer = MissionVolunteer::query()->where('full_name', 'Maria Silva')->first();
        $this->assertNotNull($volunteer);
        $this->assertSame('Enfermeiro(a)', $volunteer->profession);
        $this->assertEquals(['Música/Louvor'], $volunteer->seeks_in_community);
        $this->assertNull($volunteer->nps_score);
        $this->assertNull($volunteer->profile_type);
        $this->assertNotNull($volunteer->photo_path);
        Storage::disk('public')->assertExists($volunteer->photo_path);
    }
}
