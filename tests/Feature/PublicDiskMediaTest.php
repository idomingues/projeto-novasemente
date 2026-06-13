<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class PublicDiskMediaTest extends TestCase
{
    use RefreshDatabase;

    public function test_media_route_serves_file_from_public_disk(): void
    {
        Storage::fake('public');
        Storage::disk('public')->put('logos/test.webp', 'fake-image-bytes');

        $this->get(route('media.public', ['path' => 'logos/test.webp']))
            ->assertOk();

        Storage::disk('public')->put('library/covers/cover.jpg', 'fake-cover');
        $this->get(route('media.public', ['path' => 'library/covers/cover.jpg']))
            ->assertOk();

        Storage::disk('public')->put('donations/campaign-covers/cover.png', 'fake-campaign-cover');
        $this->get(route('media.public', ['path' => 'donations/campaign-covers/cover.png']))
            ->assertOk();

        Storage::disk('public')->put('talents/demo/exemplo.png', 'fake-png-bytes');
        $this->get(route('media.public', ['path' => 'talents/demo/exemplo.png']))
            ->assertOk();

        Storage::disk('public')->put('shared-talents/demo/exemplo.png', 'fake-png-bytes');
        $this->get(route('media.public', ['path' => 'shared-talents/demo/exemplo.png']))
            ->assertOk();

        Storage::disk('public')->put('communities/covers/seven-bike.jpg', 'fake-community-cover');
        $this->get(route('media.public', ['path' => 'communities/covers/seven-bike.jpg']))
            ->assertOk();

        $this->get(route('media.public', ['path' => 'logos/nonexistent.webp']))
            ->assertOk()
            ->assertHeaderContains('content-type', 'image');

        $this->get(route('media.public', ['path' => 'users/photos/missing.jpg']))
            ->assertNotFound();

        $this->get(route('media.public', ['path' => '../.env']))
            ->assertNotFound();
    }
}
