<?php

namespace Tests\Feature;

use App\Models\Church;
use App\Models\User;
use App\Models\UserHomeCardBookmark;
use Database\Seeders\ChurchSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class HomeCardBookmarkTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_home_has_empty_bookmarks(): void
    {
        $this->seed(ChurchSeeder::class);

        $this->get(route('mobile.home'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Mobile/Home')
                ->where('bookmarkedHomeCards', []));
    }

    public function test_user_can_toggle_home_card_bookmark(): void
    {
        $this->seed(ChurchSeeder::class);
        $church = Church::query()->firstOrFail();
        $user = User::factory()->create([
            'church_id' => $church->id,
            'email' => 'member@example.com',
        ]);

        $this->actingAs($user)
            ->postJson(route('mobile.home.bookmarks.toggle'), ['card_key' => 'biblia'])
            ->assertOk()
            ->assertJsonPath('bookmarked', true)
            ->assertJsonPath('bookmarkedHomeCards.0', 'biblia');

        $this->assertDatabaseHas('user_home_card_bookmarks', [
            'user_id' => $user->id,
            'card_key' => 'biblia',
        ]);

        $this->actingAs($user)
            ->withSession(['working_church_id' => $church->id])
            ->get(route('mobile.home'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('bookmarkedHomeCards', ['biblia']));

        $this->actingAs($user)
            ->postJson(route('mobile.home.bookmarks.toggle'), ['card_key' => 'biblia'])
            ->assertOk()
            ->assertJsonPath('bookmarked', false)
            ->assertJsonPath('bookmarkedHomeCards', []);

        $this->assertSame(0, UserHomeCardBookmark::query()->where('user_id', $user->id)->count());
    }

    public function test_user_can_bookmark_enquetes_card(): void
    {
        $this->seed(ChurchSeeder::class);
        $church = Church::query()->firstOrFail();
        $user = User::factory()->create([
            'church_id' => $church->id,
            'email' => 'polls-member@example.com',
        ]);

        $this->actingAs($user)
            ->postJson(route('mobile.home.bookmarks.toggle'), ['card_key' => 'enquetes'])
            ->assertOk()
            ->assertJsonPath('bookmarked', true)
            ->assertJsonPath('bookmarkedHomeCards.0', 'enquetes');

        $this->assertDatabaseHas('user_home_card_bookmarks', [
            'user_id' => $user->id,
            'card_key' => 'enquetes',
        ]);
    }

    public function test_invalid_card_key_is_rejected(): void
    {
        $this->seed(ChurchSeeder::class);
        $church = Church::query()->firstOrFail();
        $user = User::factory()->create([
            'church_id' => $church->id,
            'email' => 'member@example.com',
        ]);

        $this->actingAs($user)
            ->postJson(route('mobile.home.bookmarks.toggle'), ['card_key' => 'admin-panel'])
            ->assertStatus(422);
    }

    public function test_legacy_suporte_app_bookmark_is_aliased_to_sobre_o_app(): void
    {
        $this->seed(ChurchSeeder::class);
        $church = Church::query()->firstOrFail();
        $user = User::factory()->create([
            'church_id' => $church->id,
            'email' => 'legacy-bookmark@example.com',
        ]);

        UserHomeCardBookmark::query()->create([
            'user_id' => $user->id,
            'card_key' => 'suporte-app',
        ]);

        $this->actingAs($user)
            ->withSession(['working_church_id' => $church->id])
            ->get(route('mobile.home'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('bookmarkedHomeCards', ['sobre-o-app']));

        $this->actingAs($user)
            ->postJson(route('mobile.home.bookmarks.toggle'), ['card_key' => 'suporte-app'])
            ->assertOk()
            ->assertJsonPath('bookmarked', false)
            ->assertJsonPath('bookmarkedHomeCards', []);

        $this->assertSame(0, UserHomeCardBookmark::query()->where('user_id', $user->id)->count());

        $this->actingAs($user)
            ->postJson(route('mobile.home.bookmarks.toggle'), ['card_key' => 'suporte-app'])
            ->assertOk()
            ->assertJsonPath('bookmarked', true)
            ->assertJsonPath('bookmarkedHomeCards.0', 'sobre-o-app');

        $this->assertDatabaseHas('user_home_card_bookmarks', [
            'user_id' => $user->id,
            'card_key' => 'sobre-o-app',
        ]);
        $this->assertDatabaseMissing('user_home_card_bookmarks', [
            'user_id' => $user->id,
            'card_key' => 'suporte-app',
        ]);
    }
}
