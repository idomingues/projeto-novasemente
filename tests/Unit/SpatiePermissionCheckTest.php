<?php

namespace Tests\Unit;

use App\Models\User;
use App\Support\SpatiePermissionCheck;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SpatiePermissionCheckTest extends TestCase
{
    use RefreshDatabase;

    public function test_returns_false_when_permission_does_not_exist(): void
    {
        $user = User::factory()->create();

        $this->assertFalse(SpatiePermissionCheck::userHas($user, 'library.manage'));
    }
}
