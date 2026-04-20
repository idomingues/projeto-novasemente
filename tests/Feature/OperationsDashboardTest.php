<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OperationsDashboardTest extends TestCase
{
    use RefreshDatabase;

    public function test_super_admin_can_view_operations_dashboard(): void
    {
        $this->seed();

        $user = User::query()->where('email', 'ivan@iresult.com.br')->first();
        $this->assertNotNull($user);
        $this->assertTrue($user->hasRole('super_admin'));

        $this->actingAs($user)
            ->get(route('operations.index'))
            ->assertOk();
    }

    public function test_non_super_admin_cannot_view_operations_dashboard(): void
    {
        $this->seed();

        $user = User::factory()->create(['email' => 'only-admin@example.com']);
        $user->syncRoles(['admin']);

        $this->actingAs($user)
            ->get(route('operations.index'))
            ->assertForbidden();
    }
}
