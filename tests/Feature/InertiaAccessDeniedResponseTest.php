<?php

namespace Tests\Feature;

use App\Models\User;
use App\Support\InertiaAccessDeniedResponse;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class InertiaAccessDeniedResponseTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @return array<string, string>
     */
    private function inertiaHeaders(): array
    {
        $manifest = public_path('build/manifest.json');
        $version = is_file($manifest) ? hash_file('xxh128', $manifest) : '';

        return [
            'HTTP_X_INERTIA' => 'true',
            'HTTP_X_INERTIA_VERSION' => $version,
            'HTTP_ACCEPT' => 'text/html, application/xhtml+xml',
        ];
    }

    public function test_inertia_forbidden_redirects_with_friendly_flash(): void
    {
        $user = User::factory()->create();
        $user->assignRole(Role::firstOrCreate(['name' => 'membro', 'guard_name' => 'web']));

        $from = route('mobile.notifications', absolute: false);

        $response = $this->actingAs($user)
            ->from($from)
            ->get(route('roles.index', absolute: false), $this->inertiaHeaders());

        $response->assertStatus(303);
        $response->assertRedirect($from);
        $response->assertSessionHas('info', InertiaAccessDeniedResponse::FLASH_MESSAGE);

        $follow = $this->actingAs($user)->get($from, $this->inertiaHeaders());
        $follow->assertOk();
        $follow->assertHeader('x-inertia');
        $page = $follow->json();
        $this->assertIsArray($page);
        $this->assertSame(
            InertiaAccessDeniedResponse::FLASH_MESSAGE,
            $page['props']['flash']['info'] ?? null,
        );
    }
}
