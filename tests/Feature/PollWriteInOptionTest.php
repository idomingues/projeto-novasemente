<?php

namespace Tests\Feature;

use App\Models\Church;
use App\Models\Poll;
use App\Models\PollOption;
use App\Models\PollVote;
use App\Models\User;
use Database\Seeders\ChurchSeeder;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class PollWriteInOptionTest extends TestCase
{
    use RefreshDatabase;

    private function memberWithPoll(): array
    {
        $this->seed([RolePermissionSeeder::class, ChurchSeeder::class]);
        Role::firstOrCreate(['name' => 'membro', 'guard_name' => 'web']);

        $churchId = (int) Church::query()->orderBy('id')->value('id');
        $member = User::factory()->create(['church_id' => $churchId]);
        $member->assignRole('membro');

        $poll = Poll::query()->create([
            'church_id' => $churchId,
            'created_by' => $member->id,
            'question' => 'Se você pudesse conversar por cinco minutos com um personagem bíblico, quem escolheria?',
            'allow_multiple' => false,
            'response_type' => Poll::RESPONSE_CHOICE,
            'status' => Poll::STATUS_OPEN,
            'display_enabled' => true,
        ]);

        $abraao = PollOption::query()->create([
            'poll_id' => $poll->id,
            'label' => 'Abraão',
            'sort_order' => 0,
            'is_write_in' => false,
        ]);
        $writeIn = PollOption::query()->create([
            'poll_id' => $poll->id,
            'label' => Poll::WRITE_IN_OPTION_LABEL,
            'sort_order' => 1,
            'is_write_in' => true,
        ]);

        return compact('member', 'poll', 'abraao', 'writeIn');
    }

    public function test_write_in_answer_becomes_a_poll_option(): void
    {
        ['member' => $member, 'poll' => $poll, 'writeIn' => $writeIn] = $this->memberWithPoll();

        $this->actingAs($member)
            ->post(route('mobile.polls.vote', $poll), [
                'option_ids' => [$writeIn->id],
                'other_text' => 'Moisés',
            ])
            ->assertRedirect(route('mobile.polls.show', $poll));

        $this->assertDatabaseHas('poll_options', [
            'poll_id' => $poll->id,
            'label' => 'Moisés',
            'is_write_in' => 0,
            'created_via_write_in' => 1,
        ]);

        $moises = PollOption::query()
            ->where('poll_id', $poll->id)
            ->where('label', 'Moisés')
            ->first();

        $this->assertNotNull($moises);
        $this->assertDatabaseHas('poll_votes', [
            'poll_id' => $poll->id,
            'user_id' => $member->id,
            'poll_option_id' => $moises->id,
        ]);
        $this->assertDatabaseMissing('poll_votes', [
            'poll_id' => $poll->id,
            'poll_option_id' => $writeIn->id,
        ]);
    }

    public function test_write_in_reuses_existing_option_case_insensitive(): void
    {
        ['member' => $member, 'poll' => $poll, 'abraao' => $abraao, 'writeIn' => $writeIn] = $this->memberWithPoll();

        $this->actingAs($member)
            ->post(route('mobile.polls.vote', $poll), [
                'option_ids' => [$writeIn->id],
                'other_text' => 'abraão',
            ])
            ->assertRedirect();

        $this->assertSame(2, PollOption::query()->where('poll_id', $poll->id)->count());
        $this->assertDatabaseHas('poll_votes', [
            'poll_id' => $poll->id,
            'poll_option_id' => $abraao->id,
        ]);
    }

    public function test_write_in_rejects_single_letter(): void
    {
        ['member' => $member, 'poll' => $poll, 'writeIn' => $writeIn] = $this->memberWithPoll();

        $this->actingAs($member)
            ->from(route('mobile.polls.show', $poll))
            ->post(route('mobile.polls.vote', $poll), [
                'option_ids' => [$writeIn->id],
                'other_text' => 'E',
            ])
            ->assertRedirect()
            ->assertSessionHasErrors('other_text');

        $this->assertDatabaseMissing('poll_options', [
            'poll_id' => $poll->id,
            'label' => 'E',
        ]);
    }

    public function test_write_in_reuses_similar_option_without_accent(): void
    {
        ['member' => $member, 'poll' => $poll, 'abraao' => $abraao, 'writeIn' => $writeIn] = $this->memberWithPoll();

        $this->actingAs($member)
            ->post(route('mobile.polls.vote', $poll), [
                'option_ids' => [$writeIn->id],
                'other_text' => 'Abraao',
            ])
            ->assertRedirect();

        $this->assertSame(2, PollOption::query()->where('poll_id', $poll->id)->count());
        $this->assertDatabaseHas('poll_votes', [
            'poll_option_id' => $abraao->id,
        ]);
    }

    public function test_member_can_change_vote_and_orphan_write_in_is_removed(): void
    {
        ['member' => $member, 'poll' => $poll, 'abraao' => $abraao, 'writeIn' => $writeIn] = $this->memberWithPoll();

        $this->actingAs($member)
            ->post(route('mobile.polls.vote', $poll), [
                'option_ids' => [$writeIn->id],
                'other_text' => 'Moisés',
            ])
            ->assertRedirect();

        $moises = PollOption::query()->where('poll_id', $poll->id)->where('label', 'Moisés')->first();
        $this->assertNotNull($moises);

        $this->actingAs($member)
            ->post(route('mobile.polls.vote', $poll), [
                'option_ids' => [$abraao->id],
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('poll_votes', [
            'poll_id' => $poll->id,
            'user_id' => $member->id,
            'poll_option_id' => $abraao->id,
        ]);
        $this->assertSame(1, PollVote::query()->where('poll_id', $poll->id)->where('user_id', $member->id)->count());
        $this->assertDatabaseMissing('poll_options', [
            'id' => $moises->id,
        ]);
    }
}
