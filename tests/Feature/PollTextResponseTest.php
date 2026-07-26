<?php

namespace Tests\Feature;

use App\Models\Church;
use App\Models\Poll;
use App\Models\User;
use Database\Seeders\ChurchSeeder;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class PollTextResponseTest extends TestCase
{
    use RefreshDatabase;

    public function test_member_can_submit_text_poll_without_public_results(): void
    {
        $this->seed([RolePermissionSeeder::class, ChurchSeeder::class]);
        Role::firstOrCreate(['name' => 'membro', 'guard_name' => 'web']);

        $churchId = (int) Church::query()->orderBy('id')->value('id');
        $member = User::factory()->create(['church_id' => $churchId]);
        $member->assignRole('membro');

        $poll = Poll::query()->create([
            'church_id' => $churchId,
            'created_by' => $member->id,
            'question' => 'O que você gostaria de encontrar em nosso App?',
            'allow_multiple' => false,
            'response_type' => Poll::RESPONSE_TEXT,
            'status' => Poll::STATUS_OPEN,
            'display_enabled' => false,
        ]);

        $this->actingAs($member)
            ->post(route('mobile.polls.vote', $poll), [
                'answer_text' => "Calendário de eventos\nNotificações melhores",
            ])
            ->assertRedirect(route('mobile.polls.show', $poll));

        $this->assertDatabaseHas('poll_votes', [
            'poll_id' => $poll->id,
            'user_id' => $member->id,
            'answer_text' => "Calendário de eventos\nNotificações melhores",
            'poll_option_id' => null,
        ]);

        $this->actingAs($member)
            ->get(route('mobile.polls.show', $poll))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Mobile/Polls/Show')
                ->where('poll.response_type', 'text')
                ->where('poll.shows_results', false)
                ->where('poll.has_voted', true)
                ->where('poll.results', null)
                ->where('poll.my_answer_text', "Calendário de eventos\nNotificações melhores"));
    }

    public function test_admin_can_create_text_poll_without_options(): void
    {
        $this->seed([RolePermissionSeeder::class, ChurchSeeder::class]);
        $guard = 'web';
        Permission::firstOrCreate(['name' => 'polls.manage', 'guard_name' => $guard]);
        $role = Role::firstOrCreate(['name' => 'admin', 'guard_name' => $guard]);
        $role->givePermissionTo('polls.manage');

        $churchId = (int) Church::query()->orderBy('id')->value('id');
        $admin = User::factory()->create(['church_id' => $churchId]);
        $admin->assignRole('admin');

        $this->actingAs($admin)
            ->withSession(['working_church_id' => $churchId])
            ->post(route('polls.store'), [
                'question' => 'O que você gostaria de encontrar em nosso App?',
                'response_type' => 'text',
                'status' => 'open',
                'options' => [],
                'display_enabled' => true,
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('polls', [
            'church_id' => $churchId,
            'question' => 'O que você gostaria de encontrar em nosso App?',
            'response_type' => 'text',
            'display_enabled' => 0,
        ]);
    }
}
