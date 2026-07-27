<?php

namespace Tests\Feature;

use App\Models\Church;
use App\Models\Poll;
use App\Models\PollOption;
use App\Models\User;
use Database\Seeders\ChurchSeeder;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class PollWriteInOptionTest extends TestCase
{
    use RefreshDatabase;

    public function test_write_in_answer_becomes_a_poll_option(): void
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

        PollOption::query()->create([
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
        $this->seed([RolePermissionSeeder::class, ChurchSeeder::class]);
        Role::firstOrCreate(['name' => 'membro', 'guard_name' => 'web']);

        $churchId = (int) Church::query()->orderBy('id')->value('id');
        $member = User::factory()->create(['church_id' => $churchId]);
        $member->assignRole('membro');

        $poll = Poll::query()->create([
            'church_id' => $churchId,
            'created_by' => $member->id,
            'question' => 'Personagem',
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
}
