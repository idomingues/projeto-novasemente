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

        $this->get(route('media.public', ['path' => 'logos/nonexistent.webp']))
            ->assertOk()
            ->assertHeaderContains('content-type', 'image');

        $this->get(route('media.public', ['path' => 'users/photos/missing.jpg']))
            ->assertNotFound();

        $this->get(route('media.public', ['path' => '../.env']))
            ->assertNotFound();
    }
}
