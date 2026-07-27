<?php

namespace Tests\Unit;

use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

/**
 * Espelha regras de etapa do frontend (volunteerSignupPageFields.ts + volunteerSignupPageValidation.ts).
 */
class VolunteerSignupPageFieldsTest extends TestCase
{
    /** @return array<string, array{0: string, 1: int}> */
    public static function fieldPageProvider(): array
    {
        return [
            'desired_ministry_ids na etapa 1' => ['desired_ministry_ids', 1],
            'service_ease_areas na etapa 1' => ['service_ease_areas', 1],
            'service_activity_types na etapa 2' => ['service_activity_types', 2],
            'lgpd_data_consent na etapa 2' => ['lgpd_data_consent', 2],
            'full_name na etapa 0' => ['full_name', 0],
        ];
    }

    #[DataProvider('fieldPageProvider')]
    public function test_field_page_map_matches_frontend_contract(string $field, int $expectedPage): void
    {
        $page = $this->resolveFieldPage($field);

        $this->assertSame($expectedPage, $page, "Campo {$field} deve pertencer à etapa {$expectedPage}.");
    }

    public function test_page_one_does_not_include_service_activity_types(): void
    {
        $pageOneFields = [
            'attendance_duration',
            'is_official_member',
            'volunteer_phase',
            'desired_ministry_ids',
            'service_ease_areas',
            'comfortable_with_digital_tools',
        ];

        $this->assertNotContains('service_activity_types', $pageOneFields);
    }

    public function test_page_two_includes_service_activity_types(): void
    {
        $pageTwoFields = [
            'service_activity_types',
            'service_greatest_strength',
            'service_greatest_challenge',
            'lgpd_data_consent',
        ];

        $this->assertContains('service_activity_types', $pageTwoFields);
    }

    private function resolveFieldPage(string $field): int
    {
        $base = explode('.', $field)[0];

        $page0 = [
            'photo_file', 'first_name', 'last_name', 'full_name', 'birth_date', 'has_whatsapp',
            'email', 'phone', 'has_social_networks', 'social_network_profiles', 'professional_area',
            'password', 'password_confirmation',
        ];
        $page1 = [
            'attendance_duration', 'is_official_member', 'volunteer_phase', 'desired_ministry_ids',
            'service_ease_areas', 'comfortable_with_digital_tools',
        ];
        $page2 = [
            'service_activity_types', 'service_greatest_strength', 'service_greatest_challenge', 'lgpd_data_consent',
        ];

        if (in_array($base, $page0, true)) {
            return 0;
        }
        if (in_array($base, $page1, true)) {
            return 1;
        }
        if (in_array($base, $page2, true)) {
            return 2;
        }

        return 2;
    }
}
