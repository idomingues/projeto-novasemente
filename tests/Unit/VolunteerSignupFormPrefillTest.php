<?php

namespace Tests\Unit;

use App\Models\Church;
use App\Models\User;
use App\Support\VolunteerSignupFormPrefill;
use Database\Seeders\ChurchSeeder;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class VolunteerSignupFormPrefillTest extends TestCase
{
    use RefreshDatabase;

    public function test_prefill_splits_compound_surname_from_user_name(): void
    {
        $this->seed([RolePermissionSeeder::class, ChurchSeeder::class]);

        $churchId = (int) Church::query()->orderBy('id')->value('id');

        $user = User::factory()->create([
            'church_id' => $churchId,
            'is_volunteer' => true,
            'name' => 'Ivanildo Domingues Santos',
            'email' => 'ivanildo.prefill@example.com',
            'photo_url' => 'https://example.com/photos/ivanildo.jpg',
        ]);

        $prefill = VolunteerSignupFormPrefill::forUser($user->fresh());

        $this->assertSame('Ivanildo Domingues Santos', $prefill['full_name']);
        $this->assertSame('Ivanildo', $prefill['first_name']);
        $this->assertSame('Domingues Santos', $prefill['last_name']);
    }

    public function test_prefill_leaves_last_name_empty_for_single_word_user_name(): void
    {
        $this->seed([RolePermissionSeeder::class, ChurchSeeder::class]);

        $churchId = (int) Church::query()->orderBy('id')->value('id');

        $user = User::factory()->create([
            'church_id' => $churchId,
            'is_volunteer' => true,
            'name' => 'Ivanildo',
            'email' => 'ivanildo.solo@example.com',
            'photo_url' => 'https://example.com/photos/ivanildo.jpg',
        ]);

        $prefill = VolunteerSignupFormPrefill::forUser($user->fresh());

        $this->assertSame('Ivanildo', $prefill['full_name']);
        $this->assertSame('Ivanildo', $prefill['first_name']);
        $this->assertSame('', $prefill['last_name']);
    }
}
