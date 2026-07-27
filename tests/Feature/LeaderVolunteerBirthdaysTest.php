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
                ->has('birthdays', 2)
                ->where('birthdays', function ($birthdays) use ($peerUser, $viewerUser, $ministry) {
                    $rows = collect($birthdays);
                    $peer = $rows->firstWhere('userId', $peerUser->id);
                    $self = $rows->firstWhere('userId', $viewerUser->id);

                    return is_array($peer)
                        && $peer['name'] === 'Colega Aniversariante'
                        && $peer['canCongratulate'] === true
                        && $peer['isSelf'] === false
                        && $peer['ministryId'] === $ministry->id
                        && is_string($peer['congratulateUrl'] ?? null)
                        && str_contains($peer['congratulateUrl'], 'nova=1')
                        && str_contains($peer['congratulateUrl'], 'ministry='.$ministry->id)
                        && str_contains($peer['congratulateUrl'], 'recipient='.$peerUser->id)
                        && str_contains($peer['congratulateUrl'], rawurlencode('Feliz aniversário!'))
                        && is_array($self)
                        && $self['name'] === 'Voluntário Viewer'
                        && $self['isSelf'] === true
                        && $self['canCongratulate'] === false
                        && $self['congratulateUrl'] === null;
                })
            );
    }

    public function test_viewer_appears_in_own_birthday_month_without_congratulate(): void
    {
        $this->seed();

        $church = Church::query()->firstOrFail();
        $ministry = Ministry::query()->create([
            'church_id' => $church->id,
            'name' => 'Departamento Eu Também',
        ]);

        $today = now();
        $viewer = User::factory()->create([
            'church_id' => $church->id,
            'is_volunteer' => true,
            'name' => 'Eu Aniversariante',
        ]);
        $viewer->ensureVolunteerProfile();
        $volunteer = $viewer->volunteerProfile()->firstOrFail();
        $volunteer->forceFill([
            'name' => 'Eu Aniversariante',
            'email' => 'eu.aniversario@example.com',
            'active' => true,
            'birth_date' => $today->copy()->subYears(33)->toDateString(),
        ])->save();
        $volunteer->ministries()->sync([$ministry->id]);

        $this->actingAs($viewer)
            ->withSession(['working_church_id' => $church->id])
            ->get(route('mobile.leader.birthdays', [
                'month' => (int) $today->month,
                'year' => (int) $today->year,
            ]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Mobile/LeaderBirthdays')
                ->has('birthdays', 1)
                ->where('birthdays.0.name', 'Eu Aniversariante')
                ->where('birthdays.0.isSelf', true)
                ->where('birthdays.0.isToday', true)
                ->where('birthdays.0.canCongratulate', false)
                ->where('birthdays.0.day', (int) $today->day)
                ->where('birthdays.0.birthDate', $today->copy()->subYears(33)->toDateString())
            );
    }

    public function test_birthdays_are_sorted_today_first_then_by_day(): void
    {
        $this->seed();

        \Illuminate\Support\Carbon::setTestNow(\Illuminate\Support\Carbon::parse('2026-07-15 12:00:00', 'America/Sao_Paulo'));

        $church = Church::query()->firstOrFail();
        $ministry = Ministry::query()->create([
            'church_id' => $church->id,
            'name' => 'Departamento Ordenação',
        ]);

        $leader = User::factory()->create([
            'church_id' => $church->id,
            'is_ministry_leader' => true,
        ]);
        $leader->forceFill(['is_ministry_leader' => true])->save();
        $leader->ministries()->sync([$ministry->id]);

        foreach ([
            ['name' => 'Dia Vinte e Oito', 'date' => '1990-07-28'],
            ['name' => 'Aniversário Hoje', 'date' => '1991-07-15'],
            ['name' => 'Dia Três', 'date' => '1992-07-03'],
        ] as $row) {
            $volunteer = Volunteer::query()->create([
                'user_id' => null,
                'name' => $row['name'],
                'email' => strtolower(str_replace(' ', '.', $row['name'])).'@example.com',
                'active' => true,
                'birth_date' => $row['date'],
            ]);
            $volunteer->ministries()->attach($ministry->id);
        }

        $this->actingAs($leader)
            ->withSession(['working_church_id' => $church->id])
            ->get(route('mobile.leader.birthdays', [
                'month' => 7,
                'year' => 2026,
            ]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Mobile/LeaderBirthdays')
                ->has('birthdays', 3)
                ->where('birthdays.0.name', 'Aniversário Hoje')
                ->where('birthdays.0.isToday', true)
                ->where('birthdays.0.day', 15)
                ->where('birthdays.1.name', 'Dia Três')
                ->where('birthdays.1.day', 3)
                ->where('birthdays.2.name', 'Dia Vinte e Oito')
                ->where('birthdays.2.day', 28)
            );

        \Illuminate\Support\Carbon::setTestNow();
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
