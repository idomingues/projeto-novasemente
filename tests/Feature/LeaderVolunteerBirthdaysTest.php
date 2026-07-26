<?php

namespace Tests\Feature;

use App\Models\Church;
use App\Models\Ministry;
use App\Models\User;
use App\Models\Volunteer;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class LeaderVolunteerBirthdaysTest extends TestCase
{
    use RefreshDatabase;

    public function test_ministry_leader_sees_only_own_area_birthdays_for_month(): void
    {
        $this->seed();

        $church = Church::query()->firstOrFail();
        $ministryA = Ministry::query()->create([
            'church_id' => $church->id,
            'name' => 'Departamento A Aniversários',
        ]);
        $ministryB = Ministry::query()->create([
            'church_id' => $church->id,
            'name' => 'Departamento B Aniversários',
        ]);

        $leader = User::factory()->create([
            'church_id' => $church->id,
            'is_ministry_leader' => true,
        ]);
        $leader->forceFill(['is_ministry_leader' => true])->save();
        $leader->ministries()->sync([$ministryA->id]);

        $today = now();
        $laterDay = $today->day === 1 ? min(15, (int) $today->daysInMonth) : 1;

        $ownToday = Volunteer::query()->create([
            'user_id' => null,
            'name' => 'Aniversariante Hoje',
            'email' => 'hoje.aniversario@example.com',
            'active' => true,
            'birth_date' => $today->copy()->subYears(25)->toDateString(),
        ]);
        $ownToday->ministries()->attach($ministryA->id);

        $ownLater = Volunteer::query()->create([
            'user_id' => null,
            'name' => 'Aniversariante Depois',
            'email' => 'depois.aniversario@example.com',
            'active' => true,
            'birth_date' => $today->copy()->subYears(30)->day($laterDay)->toDateString(),
        ]);
        $ownLater->ministries()->attach($ministryA->id);

        $otherDept = Volunteer::query()->create([
            'user_id' => null,
            'name' => 'Outro Departamento',
            'email' => 'outro.dept.aniversario@example.com',
            'active' => true,
            'birth_date' => $today->copy()->subYears(22)->toDateString(),
        ]);
        $otherDept->ministries()->attach($ministryB->id);

        $otherMonth = Volunteer::query()->create([
            'user_id' => null,
            'name' => 'Outro Mês',
            'email' => 'outro.mes.aniversario@example.com',
            'active' => true,
            'birth_date' => $today->copy()->subYears(20)->addMonths(1)->toDateString(),
        ]);
        $otherMonth->ministries()->attach($ministryA->id);

        $this->actingAs($leader)
            ->withSession(['working_church_id' => $church->id])
            ->get(route('mobile.leader.birthdays', [
                'month' => (int) $today->month,
                'year' => (int) $today->year,
            ]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Mobile/LeaderBirthdays')
                ->has('birthdays', 2)
                ->where('todayCount', 1)
                ->where('birthdays.0.name', 'Aniversariante Hoje')
                ->where('birthdays.0.isToday', true)
                ->where('birthdays.0.canCongratulate', false)
                ->where('birthdays.1.isToday', false)
            );
    }

    public function test_volunteer_sees_birthdays_of_same_area(): void
    {
        $this->seed();

        $church = Church::query()->firstOrFail();
        $ministry = Ministry::query()->create([
            'church_id' => $church->id,
            'name' => 'Área Compartilhada',
        ]);

        $viewerUser = User::factory()->create([
            'church_id' => $church->id,
            'is_volunteer' => true,
            'is_ministry_leader' => false,
        ]);
        $viewerUser->ensureVolunteerProfile();
        $viewerVolunteer = $viewerUser->volunteerProfile()->firstOrFail();
        $viewerVolunteer->forceFill([
            'name' => 'Voluntário Viewer',
            'email' => 'viewer.aniversario@example.com',
            'active' => true,
            'birth_date' => now()->subYears(40)->toDateString(),
        ])->save();
        $viewerVolunteer->ministries()->sync([$ministry->id]);

        $peerUser = User::factory()->create([
            'church_id' => $church->id,
            'name' => 'Colega Conta',
            'photo_url' => 'https://example.com/colega.jpg',
        ]);
        $peerUser->ensureVolunteerProfile();
        $peer = $peerUser->volunteerProfile()->firstOrFail();
        $peer->forceFill([
            'name' => 'Colega Aniversariante',
            'email' => 'colega.aniversario@example.com',
            'active' => true,
            'birth_date' => now()->subYears(27)->toDateString(),
        ])->save();
        $peer->ministries()->sync([$ministry->id]);

        $this->actingAs($viewerUser)
            ->withSession(['working_church_id' => $church->id])
            ->get(route('mobile.leader.birthdays', [
                'month' => (int) now()->month,
                'year' => (int) now()->year,
            ]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Mobile/LeaderBirthdays')
                ->has('birthdays', 1)
                ->where('birthdays.0.name', 'Colega Aniversariante')
                ->where('birthdays.0.canCongratulate', true)
                ->where('birthdays.0.userId', $peerUser->id)
                ->where('birthdays.0.ministryId', $ministry->id)
                ->where('birthdays.0.congratulateUrl', fn ($url) => is_string($url)
                    && str_contains($url, 'nova=1')
                    && str_contains($url, 'ministry='.$ministry->id)
                    && str_contains($url, 'recipient='.$peerUser->id)
                    && str_contains($url, rawurlencode('Feliz aniversário!')))
            );
    }

    public function test_non_area_member_cannot_open_birthdays_page(): void
    {
        $this->seed();

        $church = Church::query()->firstOrFail();
        $member = User::factory()->create([
            'church_id' => $church->id,
            'is_ministry_leader' => false,
            'is_volunteer' => false,
        ]);

        $this->actingAs($member)
            ->withSession(['working_church_id' => $church->id])
            ->get(route('mobile.leader.birthdays'))
            ->assertForbidden();
    }

    public function test_falls_back_to_user_birth_date_when_volunteer_birth_date_missing(): void
    {
        $this->seed();

        $church = Church::query()->firstOrFail();
        $ministry = Ministry::query()->create([
            'church_id' => $church->id,
            'name' => 'Departamento Fallback Aniversário',
        ]);

        $leader = User::factory()->create([
            'church_id' => $church->id,
            'is_ministry_leader' => true,
        ]);
        $leader->forceFill(['is_ministry_leader' => true])->save();
        $leader->ministries()->sync([$ministry->id]);

        $today = now();
        $linkedUser = User::factory()->create([
            'church_id' => $church->id,
            'birth_date' => $today->copy()->subYears(28)->toDateString(),
            'photo_url' => 'https://example.com/foto.jpg',
        ]);
        $linkedUser->ensureVolunteerProfile();
        $volunteer = $linkedUser->volunteerProfile()->firstOrFail();
        $volunteer->forceFill([
            'name' => 'Com Data no Usuário',
            'email' => 'data.usuario@example.com',
            'active' => true,
            'birth_date' => null,
        ])->save();
        $volunteer->ministries()->sync([$ministry->id]);

        $this->actingAs($leader)
            ->withSession(['working_church_id' => $church->id])
            ->get(route('mobile.leader.birthdays', [
                'month' => (int) $today->month,
                'year' => (int) $today->year,
            ]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Mobile/LeaderBirthdays')
                ->has('birthdays', 1)
                ->where('birthdays.0.name', 'Com Data no Usuário')
                ->where('birthdays.0.photoUrl', 'https://example.com/foto.jpg')
                ->where('birthdays.0.isToday', true)
                ->where('birthdays.0.canCongratulate', true)
            );
    }

    public function test_ns_whats_opens_compose_draft_for_birthday_recipient(): void
    {
        $this->seed();

        $church = Church::query()->firstOrFail();
        $ministry = Ministry::query()->create([
            'church_id' => $church->id,
            'name' => 'Louvor Aniversário',
        ]);

        $sender = User::factory()->create([
            'church_id' => $church->id,
            'is_volunteer' => true,
        ]);
        $sender->ensureVolunteerProfile();
        $senderVolunteer = $sender->volunteerProfile()->firstOrFail();
        $senderVolunteer->forceFill([
            'name' => 'Remetente',
            'email' => 'remetente.parabens@example.com',
            'active' => true,
        ])->save();
        $senderVolunteer->ministries()->sync([$ministry->id]);

        $recipient = User::factory()->create([
            'church_id' => $church->id,
            'name' => 'Destinatário Parabéns',
            'is_volunteer' => true,
        ]);
        $recipient->ensureVolunteerProfile();
        $recipientVolunteer = $recipient->volunteerProfile()->firstOrFail();
        $recipientVolunteer->forceFill([
            'name' => 'Destinatário Parabéns',
            'email' => 'destinatario.parabens@example.com',
            'active' => true,
        ])->save();
        $recipientVolunteer->ministries()->sync([$ministry->id]);

        $this->actingAs($sender)
            ->withSession(['working_church_id' => $church->id])
            ->get(route('mobile.ns-whats.index', [
                'nova' => 1,
                'ministry' => $ministry->id,
                'recipient' => $recipient->id,
                'mensagem' => 'Feliz aniversário!',
            ]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Mobile/NsWhats/Index')
                ->where('composing', true)
                ->where('composeDraft.recipientUserId', $recipient->id)
                ->where('composeDraft.ministryId', $ministry->id)
                ->where('composeDraft.title', 'Destinatário Parabéns')
                ->where('composeDraft.prefillMessage', 'Feliz aniversário!')
            );
    }
}
