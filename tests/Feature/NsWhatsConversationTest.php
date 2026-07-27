<?php

namespace Tests\Feature;

use App\Models\Church;
use App\Models\ChurchConversation;
use App\Models\ChurchConversationMessage;
use App\Models\Ministry;
use App\Models\User;
use Database\Seeders\ChurchSeeder;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class NsWhatsConversationTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_sees_login_gate_for_ns_whats(): void
    {
        $this->seed(RolePermissionSeeder::class);
        $this->seed(ChurchSeeder::class);

        $this->get(route('mobile.ns-whats.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('Mobile/NsWhats/GuestGate'));
    }

    public function test_any_logged_member_can_open_ns_whats_index(): void
    {
        [$churchId, $member] = $this->seedNsWhats();

        $this->actingAs($member)
            ->get(route('mobile.ns-whats.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('Mobile/NsWhats/Index'));
    }

    public function test_assignee_sees_directed_conversation_in_meus_ns_whats_and_can_reply(): void
    {
        [$churchId, $member, $ministry, $leader] = $this->seedNsWhats();

        $this->actingAs($member)->post(route('mobile.ns-whats.store'), [
            'ministry_id' => $ministry->id,
            'recipient_user_id' => $leader->id,
            'message' => 'Mensagem direta para o líder.',
        ])->assertRedirect();

        $conversation = ChurchConversation::query()->firstOrFail();

        $this->actingAs($leader)
            ->get(route('mobile.ns-whats.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Mobile/NsWhats/Index')
                ->has('conversations', 1)
                ->where('conversations.0.viewerRole', 'staff')
                ->where('conversations.0.id', $conversation->id));

        $this->actingAs($leader)
            ->post(route('mobile.ns-whats.messages.store', $conversation), [
                'content' => 'Resposta do responsável.',
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('church_conversation_messages', [
            'conversation_id' => $conversation->id,
            'author_user_id' => $leader->id,
            'body' => 'Resposta do responsável.',
        ]);
    }

    public function test_leader_can_reply_to_department_queue_without_specific_leader(): void
    {
        [$churchId, $member, $ministry, $leader] = $this->seedNsWhats();

        $this->actingAs($member)->post(route('mobile.ns-whats.store'), [
            'ministry_id' => $ministry->id,
            'message' => 'Fila geral do departamento por favor.',
        ])->assertRedirect();

        $conversation = ChurchConversation::query()->firstOrFail();
        $this->assertNull($conversation->assignee_user_id);

        $this->actingAs($leader)
            ->post(route('mobile.ns-whats.leader.messages.store', $conversation), [
                'content' => 'Olá, eu assumo e respondo pela fila.',
            ])
            ->assertRedirect();

        $conversation->refresh();
        $this->assertSame((int) $leader->id, (int) $conversation->assignee_user_id);
        $this->assertDatabaseHas('church_conversation_messages', [
            'conversation_id' => $conversation->id,
            'author_user_id' => $leader->id,
            'body' => 'Olá, eu assumo e respondo pela fila.',
        ]);
    }

    public function test_messages_notify_both_sides_via_app_inbox(): void
    {
        [$churchId, $member, $ministry, $leader] = $this->seedNsWhats();

        $this->actingAs($member)->post(route('mobile.ns-whats.store'), [
            'ministry_id' => $ministry->id,
            'recipient_user_id' => $leader->id,
            'message' => 'Olá, preciso de ajuda com o ensaio.',
        ])->assertRedirect();

        $conversation = ChurchConversation::query()->firstOrFail();

        $this->assertDatabaseHas('user_inbox_notifications', [
            'user_id' => $leader->id,
            'title' => 'Nova conversa no NS Conecta',
        ]);

        $this->actingAs($leader)->post(route('mobile.ns-whats.leader.messages.store', $conversation), [
            'content' => 'Claro, em que posso ajudar?',
        ])->assertRedirect();

        $this->assertDatabaseHas('user_inbox_notifications', [
            'user_id' => $member->id,
            'title' => 'NS Conecta',
            'body' => $leader->name.' começou a falar com você.',
        ]);

        $leaderAlertsBefore = \App\Models\UserInboxNotification::query()
            ->where('user_id', $leader->id)
            ->count();

        // Segunda mensagem do membro no mesmo turno (sem resposta nova) não gera alerta.
        $this->actingAs($member)->post(route('mobile.ns-whats.messages.store', $conversation), [
            'content' => 'Sobre o horário do sábado.',
        ])->assertRedirect();

        $this->actingAs($member)->post(route('mobile.ns-whats.messages.store', $conversation), [
            'content' => 'E também sobre o ensaio.',
        ])->assertRedirect();

        $this->assertSame(
            $leaderAlertsBefore + 1,
            \App\Models\UserInboxNotification::query()->where('user_id', $leader->id)->count()
        );
        $this->assertDatabaseHas('user_inbox_notifications', [
            'user_id' => $leader->id,
            'title' => 'NS Conecta',
            'body' => $member->name.' começou a falar com você.',
        ]);
    }

    public function test_admin_without_leader_flag_does_not_receive_ns_conecta_inbox(): void
    {
        [$churchId, $member, $ministry, $leader] = $this->seedNsWhats();

        $adminOnly = User::factory()->create([
            'church_id' => $churchId,
            'name' => 'Admin Sem Líder',
            'is_ministry_leader' => false,
        ]);
        $adminOnly->assignRole('admin');
        $adminOnly->forceFill(['is_ministry_leader' => false])->save();

        $this->actingAs($member)->post(route('mobile.ns-whats.store'), [
            'ministry_id' => $ministry->id,
            'message' => 'Fila do departamento.',
        ])->assertRedirect();

        $conversation = ChurchConversation::query()->firstOrFail();

        // Simula admin assumindo a conversa (módulo admin) sem ser líder.
        $conversation->forceFill([
            'assignee_user_id' => $adminOnly->id,
            'preferred_leader_user_id' => $adminOnly->id,
            'staff_alerted_at' => null,
        ])->save();

        $this->actingAs($member)->post(route('mobile.ns-whats.messages.store', $conversation), [
            'content' => 'Nova mensagem para o responsável.',
        ])->assertRedirect();

        $this->assertDatabaseMissing('user_inbox_notifications', [
            'user_id' => $adminOnly->id,
            'title' => 'NS Conecta',
        ]);

        // Líder real do departamento continua elegível na fila (primeira notificação da criação).
        $this->assertDatabaseHas('user_inbox_notifications', [
            'user_id' => $leader->id,
            'title' => 'Nova conversa no NS Conecta',
        ]);
    }

    public function test_admin_who_is_also_leader_receives_ns_conecta_inbox(): void
    {
        [$churchId, $member, $ministry] = $this->seedNsWhats();

        $adminLeader = User::factory()->create([
            'church_id' => $churchId,
            'name' => 'Admin Líder',
            'is_ministry_leader' => true,
        ]);
        $adminLeader->assignRole('admin');
        $adminLeader->forceFill(['is_ministry_leader' => true])->save();
        $adminLeader->ministries()->sync([$ministry->id]);

        $this->actingAs($member)->post(route('mobile.ns-whats.store'), [
            'ministry_id' => $ministry->id,
            'recipient_user_id' => $adminLeader->id,
            'message' => 'Falar com admin que também é líder.',
        ])->assertRedirect();

        $this->assertDatabaseHas('user_inbox_notifications', [
            'user_id' => $adminLeader->id,
            'title' => 'Nova conversa no NS Conecta',
        ]);
    }

    public function test_message_alert_repeats_after_one_hour_without_reply(): void
    {
        [$churchId, $member, $ministry, $leader] = $this->seedNsWhats();

        $this->actingAs($member)->post(route('mobile.ns-whats.store'), [
            'ministry_id' => $ministry->id,
            'recipient_user_id' => $leader->id,
            'message' => 'Primeira mensagem.',
        ])->assertRedirect();

        $conversation = ChurchConversation::query()->firstOrFail();
        $before = \App\Models\UserInboxNotification::query()->where('user_id', $leader->id)->count();

        $this->actingAs($member)->post(route('mobile.ns-whats.messages.store', $conversation), [
            'content' => 'Ainda sem resposta.',
        ])->assertRedirect();

        $this->assertSame(
            $before,
            \App\Models\UserInboxNotification::query()->where('user_id', $leader->id)->count()
        );

        $this->travel(61)->minutes();

        $this->actingAs($member)->post(route('mobile.ns-whats.messages.store', $conversation), [
            'content' => 'Nova tentativa depois de 1 hora.',
        ])->assertRedirect();

        $this->assertDatabaseHas('user_inbox_notifications', [
            'user_id' => $leader->id,
            'title' => 'NS Conecta',
            'body' => $member->name.': Nova tentativa depois de 1 hora.',
        ]);
    }

    public function test_member_can_create_department_queue_conversation(): void
    {
        [$churchId, $member, $ministry, $leader] = $this->seedNsWhats();

        $response = $this->actingAs($member)->post(route('mobile.ns-whats.store'), [
            'ministry_id' => $ministry->id,
            'message' => 'Preciso de orientação sobre o horário.',
        ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('church_conversations', [
            'member_user_id' => $member->id,
            'current_ministry_id' => $ministry->id,
            'assignee_user_id' => null,
            'status' => ChurchConversation::STATUS_NEW,
        ]);
        $this->assertDatabaseHas('church_conversation_messages', [
            'author_user_id' => $member->id,
            'kind' => 'public',
        ]);
    }

    public function test_leader_can_claim_and_second_claim_fails(): void
    {
        [$churchId, $member, $ministry, $leader] = $this->seedNsWhats();
        $leader2 = $this->makeLeader($churchId, 'Segundo Líder', [$ministry->id]);

        $this->actingAs($member)->post(route('mobile.ns-whats.store'), [
            'ministry_id' => $ministry->id,
            'message' => 'Fila do departamento por favor.',
        ]);

        $conversation = ChurchConversation::query()->firstOrFail();

        $this->actingAs($leader)->post(route('mobile.ns-whats.leader.claim', $conversation))
            ->assertRedirect();

        $conversation->refresh();
        $this->assertSame((int) $leader->id, (int) $conversation->assignee_user_id);

        $this->actingAs($leader2)->post(route('mobile.ns-whats.leader.claim', $conversation))
            ->assertForbidden();
    }

    public function test_internal_note_not_visible_to_member_payload(): void
    {
        [$churchId, $member, $ministry, $leader] = $this->seedNsWhats();

        $this->actingAs($member)->post(route('mobile.ns-whats.store'), [
            'ministry_id' => $ministry->id,
            'leader_user_id' => $leader->id,
            'message' => 'Mensagem pública inicial.',
        ]);

        $conversation = ChurchConversation::query()->firstOrFail();

        $this->actingAs($leader)->post(route('mobile.ns-whats.leader.internal', $conversation), [
            'content' => 'Nota só para a equipe.',
        ])->assertRedirect();

        $response = $this->actingAs($member)->get(route('mobile.ns-whats.index', ['conversa' => $conversation->id]));
        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Mobile/NsWhats/Index')
            ->where('selected.messages', fn ($messages) => collect($messages)->every(
                fn ($m) => ($m['kind'] ?? '') !== 'internal'
            )));
    }

    public function test_legacy_contact_redirects_to_ns_whats(): void
    {
        [$churchId, $member] = array_slice($this->seedNsWhats(), 0, 2);

        $this->actingAs($member)->get(route('mobile.contact'))
            ->assertRedirect(route('mobile.ns-whats.index'));
    }

    public function test_volunteer_ministries_marked_i_serve_and_sorted_first_on_compose(): void
    {
        [$churchId, $member, $ministry] = $this->seedNsWhats();

        $other = Ministry::query()->create([
            'church_id' => $churchId,
            'name' => 'Ação Social',
        ]);
        $this->makeLeader($churchId, 'Líder Ação Social', [$other->id]);

        $member->ensureVolunteerProfile();
        $volunteer = $member->volunteerProfile()->firstOrFail();
        $volunteer->forceFill(['active' => true])->save();
        $volunteer->ministries()->syncWithoutDetaching([$ministry->id]);

        $this->actingAs($member)
            ->get(route('mobile.ns-whats.index', ['nova' => 1]))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Mobile/NsWhats/Index')
                ->where('composing', true)
                ->where('ministries.0.id', $ministry->id)
                ->where('ministries.0.i_serve', true)
                ->where('ministries.0.name', 'Louvor')
                ->where('ministries.1.id', $other->id)
                ->where('ministries.1.i_serve', false));
    }

    public function test_volunteer_sees_department_leader_thread_before_speaking(): void
    {
        [$churchId, $member, $ministry, $leader] = $this->seedNsWhats();

        $member->ensureVolunteerProfile();
        $volunteer = $member->volunteerProfile()->firstOrFail();
        $volunteer->forceFill(['active' => true])->save();
        $volunteer->ministries()->syncWithoutDetaching([$ministry->id]);

        $admin = User::factory()->create(['church_id' => $churchId, 'name' => 'Admin Voluntário']);
        $admin->assignRole('admin');
        $admin->ensureVolunteerProfile();
        $adminVolunteer = $admin->volunteerProfile()->firstOrFail();
        $adminVolunteer->forceFill(['active' => true])->save();
        $adminVolunteer->ministries()->syncWithoutDetaching([$ministry->id]);

        $this->actingAs($admin)
            ->get(route('mobile.ns-whats.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Mobile/NsWhats/Index')
                ->has('conversations', 1)
                ->where('conversations.0.viewerRole', 'member')
                ->where('conversations.0.assigneeName', $leader->name)
                ->where('conversations.0.lastPreview', 'Toque para conversar'));

        $this->assertDatabaseHas('church_conversations', [
            'member_user_id' => $admin->id,
            'assignee_user_id' => $leader->id,
            'preferred_leader_user_id' => $leader->id,
            'current_ministry_id' => $ministry->id,
            'status' => ChurchConversation::STATUS_IN_SERVICE,
        ]);

        // Idempotente: não duplica ao reabrir.
        $this->actingAs($admin)
            ->get(route('mobile.ns-whats.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->has('conversations', 1));

        $this->assertSame(1, ChurchConversation::query()->where('member_user_id', $admin->id)->count());
    }

    public function test_member_can_direct_conversation_to_department_member(): void
    {
        [$churchId, $member, $ministry, $leader] = $this->seedNsWhats();

        $deptMemberUser = User::factory()->create([
            'church_id' => $churchId,
            'name' => 'Voluntário do Louvor',
        ]);
        $deptMemberUser->assignRole('membro');
        $deptMemberUser->ensureVolunteerProfile();
        $volunteer = $deptMemberUser->volunteerProfile()->firstOrFail();
        $volunteer->ministries()->attach($ministry->id);

        $response = $this->actingAs($member)->post(route('mobile.ns-whats.store'), [
            'ministry_id' => $ministry->id,
            'recipient_user_id' => $deptMemberUser->id,
            'message' => 'Olá, posso falar com você sobre o ensaio?',
        ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('church_conversations', [
            'member_user_id' => $member->id,
            'current_ministry_id' => $ministry->id,
            'preferred_leader_user_id' => $deptMemberUser->id,
            'assignee_user_id' => $deptMemberUser->id,
            'status' => ChurchConversation::STATUS_AWAITING_DEPARTMENT,
        ]);

        $conversation = ChurchConversation::query()->firstOrFail();

        $this->actingAs($deptMemberUser)
            ->get(route('mobile.ns-whats.leader.show', $conversation))
            ->assertOk();

        $this->actingAs($deptMemberUser)->post(route('mobile.ns-whats.leader.messages.store', $conversation), [
            'content' => 'Claro, me conta o que precisa.',
        ])->assertRedirect();
    }

    public function test_compose_search_finds_leaders_and_volunteers(): void
    {
        [$churchId, $member, $ministry, $leader] = $this->seedNsWhats();

        $deptMemberUser = User::factory()->create([
            'church_id' => $churchId,
            'name' => 'Voluntário Busca',
        ]);
        $deptMemberUser->assignRole('membro');
        $deptMemberUser->ensureVolunteerProfile();
        $volunteer = $deptMemberUser->volunteerProfile()->firstOrFail();
        $volunteer->ministries()->attach($ministry->id);

        $this->actingAs($member)
            ->get(route('mobile.ns-whats.index', ['nova' => 1, 'pessoa' => 'Líder']))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Mobile/NsWhats/Index')
                ->where('composing', true)
                ->has('peopleMatches', 1)
                ->where('peopleMatches.0.id', $leader->id)
                ->where('peopleMatches.0.role', 'leader')
                ->where('peopleMatches.0.ministry_id', $ministry->id));

        $this->actingAs($member)
            ->get(route('mobile.ns-whats.index', ['nova' => 1, 'pessoa' => 'Voluntário']))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Mobile/NsWhats/Index')
                ->has('peopleMatches', 1)
                ->where('peopleMatches.0.id', $deptMemberUser->id)
                ->where('peopleMatches.0.role', 'member')
                ->where('peopleMatches.0.ministry_name', 'Louvor'));
    }

    public function test_compose_search_dedupes_person_across_ministries(): void
    {
        [$churchId, $member] = array_slice($this->seedNsWhats(), 0, 2);

        $cozinha = Ministry::query()->create(['church_id' => $churchId, 'name' => 'Cozinha']);
        $diaconisas = Ministry::query()->create(['church_id' => $churchId, 'name' => 'Diaconisas']);
        $this->makeLeader($churchId, 'Líder Cozinha', [$cozinha->id]);
        $this->makeLeader($churchId, 'Líder Diaconisas', [$diaconisas->id]);

        $maria = User::factory()->create([
            'church_id' => $churchId,
            'name' => 'Maria Alice Teste',
        ]);
        $maria->assignRole('membro');
        $maria->ensureVolunteerProfile();
        $volunteer = $maria->volunteerProfile()->firstOrFail();
        $volunteer->forceFill(['active' => true])->save();
        $volunteer->ministries()->sync([$cozinha->id, $diaconisas->id]);

        $this->actingAs($member)
            ->get(route('mobile.ns-whats.index', ['nova' => 1, 'pessoa' => 'Maria Alice']))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Mobile/NsWhats/Index')
                ->has('peopleMatches', 1)
                ->where('peopleMatches.0.id', $maria->id)
                ->where('peopleMatches.0.role', 'member')
                ->where('peopleMatches.0.ministry_name', 'Cozinha, Diaconisas'));
    }

    public function test_compose_lists_department_members(): void
    {
        [$churchId, $member, $ministry] = array_slice($this->seedNsWhats(), 0, 3);

        $deptMemberUser = User::factory()->create([
            'church_id' => $churchId,
            'name' => 'Membro Ativo',
        ]);
        $deptMemberUser->assignRole('membro');
        $deptMemberUser->ensureVolunteerProfile();
        $volunteer = $deptMemberUser->volunteerProfile()->firstOrFail();
        $volunteer->ministries()->attach($ministry->id);

        $this->actingAs($member)
            ->get(route('mobile.ns-whats.compose', ['ministry' => $ministry->id]))
            ->assertRedirect(route('mobile.ns-whats.index', ['nova' => 1, 'ministry' => $ministry->id]));

        $this->actingAs($member)
            ->get(route('mobile.ns-whats.index', ['nova' => 1, 'ministry' => $ministry->id]))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Mobile/NsWhats/Index')
                ->where('composing', true)
                ->has('members', 1)
                ->where('members.0.id', $deptMemberUser->id)
                ->where('members.0.name', 'Membro Ativo'));
    }

    public function test_member_can_load_conversation_as_json(): void
    {
        [$churchId, $member, $ministry] = array_slice($this->seedNsWhats(), 0, 3);

        $this->actingAs($member)->post(route('mobile.ns-whats.store'), [
            'ministry_id' => $ministry->id,
            'message' => 'Mensagem para abrir em JSON.',
        ])->assertRedirect();

        $conversation = ChurchConversation::query()->firstOrFail();

        $this->actingAs($member)
            ->getJson(route('mobile.ns-whats.show', $conversation))
            ->assertOk()
            ->assertJsonPath('conversation.id', $conversation->id)
            ->assertJsonPath('conversation.messages.0.body', 'Mensagem para abrir em JSON.');
    }

    public function test_leader_of_other_ministry_is_not_pinned_as_leader_of_served_ministry(): void
    {
        [$churchId, $member] = array_slice($this->seedNsWhats(), 0, 2);
        $diaconos = Ministry::query()->create(['church_id' => $churchId, 'name' => 'Diáconos']);
        $missao = Ministry::query()->create(['church_id' => $churchId, 'name' => 'Missão']);

        // Wesley: voluntário em Diáconos, líder só em Missão.
        $wesley = $this->makeLeader($churchId, 'Wesley Moura', [$missao->id]);
        $wesley->ensureVolunteerProfile();
        $wesley->volunteerProfile()->firstOrFail()->ministries()->syncWithoutDetaching([$diaconos->id, $missao->id]);

        $member->ensureVolunteerProfile();
        $member->volunteerProfile()->firstOrFail()->ministries()->sync([$diaconos->id]);

        // Conversa no depto Diáconos com Wesley (não é líder dali).
        ChurchConversation::query()->create([
            'church_id' => $churchId,
            'member_user_id' => $member->id,
            'subject' => $wesley->name,
            'initial_ministry_id' => $diaconos->id,
            'current_ministry_id' => $diaconos->id,
            'preferred_leader_user_id' => $wesley->id,
            'assignee_user_id' => $wesley->id,
            'status' => ChurchConversation::STATUS_IN_SERVICE,
            'last_activity_at' => now(),
        ]);

        $this->actingAs($member)
            ->get(route('mobile.ns-whats.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Mobile/NsWhats/Index')
                ->where('conversations', function ($conversations) {
                    $wesley = collect($conversations)->firstWhere('headerTitle', 'Wesley Moura');

                    return $wesley !== null
                        && $wesley['pinnedLeader'] === false
                        && $wesley['ministryName'] === 'Diáconos';
                }));
    }

    public function test_duplicate_seeded_leader_threads_are_merged_on_index(): void
    {
        [$churchId, $member, $ministry, $leader] = $this->seedNsWhats();

        $member->ensureVolunteerProfile();
        $member->volunteerProfile()->firstOrFail()->ministries()->attach($ministry->id);

        ChurchConversation::query()->create([
            'church_id' => $churchId,
            'member_user_id' => $member->id,
            'subject' => $leader->name,
            'initial_ministry_id' => $ministry->id,
            'current_ministry_id' => $ministry->id,
            'preferred_leader_user_id' => $leader->id,
            'assignee_user_id' => $leader->id,
            'status' => ChurchConversation::STATUS_IN_SERVICE,
            'last_activity_at' => now()->subMinute(),
        ]);
        ChurchConversation::query()->create([
            'church_id' => $churchId,
            'member_user_id' => $member->id,
            'subject' => $leader->name,
            'initial_ministry_id' => $ministry->id,
            'current_ministry_id' => $ministry->id,
            'preferred_leader_user_id' => $leader->id,
            'assignee_user_id' => $leader->id,
            'status' => ChurchConversation::STATUS_IN_SERVICE,
            'last_activity_at' => now(),
        ]);

        $this->assertSame(2, ChurchConversation::query()
            ->where('member_user_id', $member->id)
            ->where('assignee_user_id', $leader->id)
            ->count());

        $this->actingAs($member)
            ->get(route('mobile.ns-whats.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('conversations', function ($conversations) use ($leader) {
                    $matches = collect($conversations)->where('headerTitle', $leader->name);

                    return $matches->count() === 1 && $matches->first()['pinnedLeader'] === true;
                }));

        $this->assertSame(1, ChurchConversation::query()
            ->where('member_user_id', $member->id)
            ->where('assignee_user_id', $leader->id)
            ->count());
    }

    public function test_member_can_archive_and_unarchive_conversation_like_whatsapp(): void
    {
        [$churchId, $member, $ministry, $leader] = $this->seedNsWhats();

        $this->actingAs($member)->post(route('mobile.ns-whats.store'), [
            'ministry_id' => $ministry->id,
            'recipient_user_id' => $leader->id,
            'message' => 'Oi, preciso arquivar depois.',
        ])->assertRedirect();

        $conversation = ChurchConversation::query()->firstOrFail();

        $this->actingAs($member)
            ->postJson(route('mobile.ns-whats.archive', $conversation))
            ->assertOk()
            ->assertJsonPath('conversation.archived', true);

        $this->actingAs($member)
            ->get(route('mobile.ns-whats.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('viewingArchived', false)
                ->where('archivedCount', 1)
                ->where('conversations', fn ($rows) => collect($rows)->isEmpty()));

        $this->actingAs($member)
            ->get(route('mobile.ns-whats.index', ['arquivadas' => 1]))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('viewingArchived', true)
                ->where('conversations.0.id', $conversation->id));

        // Mensagem do líder desarquiva para o membro.
        $this->actingAs($leader)->post(route('mobile.ns-whats.leader.messages.store', $conversation), [
            'content' => 'Olá, estou respondendo.',
        ])->assertRedirect();

        $this->assertDatabaseMissing('church_conversation_archives', [
            'conversation_id' => $conversation->id,
            'user_id' => $member->id,
        ]);

        $this->actingAs($member)
            ->get(route('mobile.ns-whats.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('archivedCount', 0)
                ->where('conversations.0.id', $conversation->id));
    }

    /**
     * @return array{0: int, 1: User, 2: Ministry, 3: User}
     */
    private function seedNsWhats(): array
    {
        $this->seed([RolePermissionSeeder::class, ChurchSeeder::class]);
        Role::firstOrCreate(['name' => 'membro', 'guard_name' => 'web']);

        $churchId = (int) Church::query()->orderBy('id')->value('id');
        $ministry = Ministry::query()->create(['church_id' => $churchId, 'name' => 'Louvor']);
        $member = User::factory()->create(['church_id' => $churchId]);
        $member->assignRole('membro');
        $leader = $this->makeLeader($churchId, 'Líder Louvor', [$ministry->id]);

        return [$churchId, $member, $ministry, $leader];
    }

    /**
     * @param  list<int>  $ministryIds
     */
    private function makeLeader(int $churchId, string $name, array $ministryIds): User
    {
        $user = User::factory()->create([
            'church_id' => $churchId,
            'name' => $name,
            'is_ministry_leader' => true,
        ]);
        $user->forceFill(['is_ministry_leader' => true])->save();
        $user->ministries()->sync($ministryIds);
        $user->ensureVolunteerProfile();

        return $user;
    }
}
