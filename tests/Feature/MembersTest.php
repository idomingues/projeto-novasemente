<?php

namespace Tests\Feature;

use App\Models\Member;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class MembersTest extends TestCase
{
    use RefreshDatabase;

    public function test_guests_cannot_access_members_index(): void
    {
        $response = $this->get('/members');

        $response->assertRedirect('/login');
    }

    public function test_admin_can_view_members_index(): void
    {
        $this->seed();

        $user = User::factory()->create();
        $role = Role::firstOrCreate(['name' => 'admin']);
        $user->assignRole($role);

        Member::factory()->count(2)->create();

        $response = $this->actingAs($user)->get('/members');

        $response->assertStatus(200);
    }
}

