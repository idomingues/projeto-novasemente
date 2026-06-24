<?php

namespace Tests\Unit;

use App\Support\VolunteerSignupServiceActivityTypes;
use Tests\TestCase;

class VolunteerSignupServiceActivityTypesTest extends TestCase
{
    public function test_labels_for_stored_formats_selected_slugs(): void
    {
        $label = VolunteerSignupServiceActivityTypes::labelsForStored(
            json_encode(['adults_direct', 'technical_production'], JSON_UNESCAPED_UNICODE)
        );

        $this->assertStringContainsString('adultos', mb_strtolower($label));
        $this->assertStringContainsString('técnicas', mb_strtolower($label));
    }
}
