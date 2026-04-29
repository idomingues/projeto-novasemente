<?php

use App\Http\Controllers\AcervoController;
use App\Http\Controllers\AppNotificationController;
use App\Http\Controllers\AppVersionController;
use App\Http\Controllers\ChurchController;
use App\Http\Controllers\CultoController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\EventController;
use App\Http\Controllers\FaviconController;
use App\Http\Controllers\InventoryController;
use App\Http\Controllers\MemberController;
use App\Http\Controllers\MinistryController;
use App\Http\Controllers\MinistryLeadVolunteerController;
use App\Http\Controllers\MobileChurchSolicitationController;
use App\Http\Controllers\MobileController;
use App\Http\Controllers\MobileLeaderSolicitationController;
use App\Http\Controllers\MobilePastoralAppointmentController;
use App\Http\Controllers\MobileSupportController;
use App\Http\Controllers\MusicaController;
use App\Http\Controllers\MyMinistryVolunteersController;
use App\Http\Controllers\NewsController;
use App\Http\Controllers\OperationsDashboardController;
use App\Http\Controllers\PastoralAgendaController;
use App\Http\Controllers\PastorController;
use App\Http\Controllers\PhotoAlbumController;
use App\Http\Controllers\PrayerRequestController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\PublicDiskFileController;
use App\Http\Controllers\PushTokenController;
use App\Http\Controllers\RoleController;
use App\Http\Controllers\RoomBookingController;
use App\Http\Controllers\SettingsController;
use App\Http\Controllers\SolicitationAdminController;
use App\Http\Controllers\SupportAdminController;
use App\Http\Controllers\VariosController;
use App\Http\Controllers\VolunteerController;
use App\Http\Controllers\VolunteerPipelineLeadController;
use App\Http\Controllers\VolunteerPublicSignupController;
use App\Http\Controllers\VolunteerRequestSolicitationController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/favicon.svg', FaviconController::class)->name('favicon');

/** Ficheiros em storage/app/public sem depender do symlink public/storage (evita 403 em XAMPP/Apache). */
Route::get('/media/{path}', PublicDiskFileController::class)
    ->where('path', '.+')
    ->name('media.public');

Route::get('/', function () {
    return redirect()->route('mobile.index');
});

Route::get('/dashboard', DashboardController::class)->middleware(['auth', 'verified', 'can_access_admin_menu'])->name('dashboard');

// Rotas públicas (guests e autenticados): app com menu mobile/PC e Login no lugar da engrenagem
Route::view('/politica-de-privacidade', 'privacy-policy')->name('privacy-policy');
Route::view('/privacy-policy', 'privacy-policy')->name('privacy-policy.en');
Route::view('/exclusao-de-conta', 'account-deletion')->name('account-deletion');
Route::view('/account-deletion', 'account-deletion')->name('account-deletion.en');
Route::get('/mais', [\App\Http\Controllers\MoreController::class, 'index'])->name('more.index');
Route::get('/varios/escala', [VariosController::class, 'schedule'])->name('varios.schedule');
Route::get('/varios/servicos', [VariosController::class, 'services'])->name('varios.services');
Route::get('/varios/classe-comecos', [VariosController::class, 'classeComecos'])->name('varios.classe-comecos');
Route::get('/varios/acervo', fn () => redirect()->route('mobile.acervo'))->name('varios.acervo');
Route::get('/varios/contato', [VariosController::class, 'contact'])->name('varios.contact');
Route::get('/varios/notificacoes', [VariosController::class, 'notifications'])->name('varios.notifications');
Route::get('/notificacoes', [VariosController::class, 'manageNotifications'])
    ->middleware(['auth', 'permission:notifications.manage'])
    ->name('notifications.manage');
Route::get('/pedidos-oracao', [PrayerRequestController::class, 'index'])->name('prayer.index');
Route::post('/pedidos-oracao', [PrayerRequestController::class, 'store'])->name('prayer.store');
Route::put('/pedidos-oracao/{prayer}', [PrayerRequestController::class, 'update'])
    ->middleware(['auth', 'permission:prayer.manage'])
    ->name('prayer.update');
Route::patch('/pedidos-oracao/{prayer}/active', [PrayerRequestController::class, 'setActive'])
    ->middleware(['auth', 'permission:prayer.manage'])
    ->name('prayer.set-active');
Route::delete('/pedidos-oracao/{prayer}', [PrayerRequestController::class, 'destroy'])
    ->middleware(['auth', 'permission:prayer.manage'])
    ->name('prayer.destroy');
Route::post('/pedidos-oracao/{prayer}/orou', [PrayerRequestController::class, 'amen'])
    ->middleware('throttle:60,1')
    ->name('prayer.amen');
Route::get('/mobile/oracao', [PrayerRequestController::class, 'mobile'])->name('mobile.prayer');

// Splash (vídeo) ao abrir a app (desativado: a app abre direto no /mobile/inicio)
Route::get('/media/ns.mp4', function () {
    $path = base_path('assets/NS.MP4');
    if (! file_exists($path)) {
        // fallback: alguns deploys só enviam ficheiros em /public
        $path = public_path('ns.mp4');
    }
    abort_unless(file_exists($path), 404);

    return response()
        ->file($path, [
            'Content-Type' => 'video/mp4',
            'Cache-Control' => 'public, max-age=86400',
            'Accept-Ranges' => 'bytes',
        ]);
})->name('media.ns-splash');

Route::get('/mobile', [MobileController::class, 'home'])->name('mobile.index');
Route::get('/mobile/inicio', [MobileController::class, 'home'])->name('mobile.home');
Route::get('/mobile/culto', [MobileController::class, 'culto'])->name('mobile.culto');
Route::get('/mobile/culto/{culto}', [MobileController::class, 'cultoShow'])->name('mobile.culto.show');
Route::get('/mobile/news', [MobileController::class, 'news'])->name('mobile.news');
Route::get('/mobile/news/{news:slug}', [MobileController::class, 'newsShow'])->name('mobile.news.show');
Route::get('/mobile/events', [MobileController::class, 'events'])->name('mobile.events');
Route::get('/mobile/schedule', [MobileController::class, 'schedule'])->name('mobile.schedule');
Route::get('/mobile/schedule/full', [MobileController::class, 'scheduleFull'])->name('mobile.schedule.full');
Route::get('/mobile/more', [MobileController::class, 'more'])->name('mobile.more');
Route::get('/mobile/crencas', [MobileController::class, 'beliefs'])->name('mobile.beliefs');
Route::get('/mobile/quem-somos', [MobileController::class, 'quemSomos'])->name('mobile.quem-somos');
Route::get('/mobile/classe-comecos', [MobileController::class, 'classeComecos'])->name('mobile.classe-comecos');
Route::get('/mobile/acervo', [MobileController::class, 'acervo'])->name('mobile.acervo');
Route::get('/mobile/acervo/{acervoItem}', [MobileController::class, 'acervoShow'])->name('mobile.acervo.show');
Route::get('/mobile/musica', [MobileController::class, 'musica'])->name('mobile.musica');
Route::get('/mobile/musica/{musica}', [MobileController::class, 'musicaShow'])->name('mobile.musica.show');
Route::get('/mobile/services', [MobileController::class, 'services'])->name('mobile.services');
Route::get('/mobile/fotos', [MobileController::class, 'fotos'])->name('mobile.fotos');
Route::get('/mobile/fotos/{album}', [MobileController::class, 'fotosShow'])->name('mobile.fotos.show');
Route::get('/mobile/localizacao', [MobileController::class, 'location'])->name('mobile.location');
Route::get('/mobile/pastores', [MobileController::class, 'pastors'])->name('mobile.pastors');
Route::get('/mobile/offerings', [MobileController::class, 'offerings'])->name('mobile.offerings');
Route::get('/mobile/notifications', [MobileController::class, 'notifications'])->name('mobile.notifications');
Route::get('/mobile/profile', [MobileController::class, 'profile'])
    ->middleware('auth')
    ->name('mobile.profile');
Route::get('/mobile/perfil/editar', [MobileController::class, 'profileEdit'])
    ->middleware('auth')
    ->name('mobile.profile.edit');
Route::get('/mobile/escala/checkin', [MobileController::class, 'scheduleCheckin'])
    ->middleware('auth')
    ->name('mobile.schedule.checkin');

// Suporte (app)
Route::get('/mobile/suporte', [MobileSupportController::class, 'index'])->name('mobile.support.index');
Route::post('/mobile/suporte', [MobileSupportController::class, 'store'])->name('mobile.support.store');
Route::get('/mobile/suporte/ticket/{token}/mensagens', [MobileSupportController::class, 'ticketMessages'])
    ->middleware('auth')
    ->name('mobile.support.ticket.messages');
Route::get('/mobile/suporte/ticket/{token}', [MobileSupportController::class, 'ticket'])
    ->name('mobile.support.ticket');
Route::post('/mobile/suporte/ticket/{token}/messages', [MobileSupportController::class, 'sendMessage'])
    ->middleware('auth')
    ->name('mobile.support.messages.store');
Route::patch('/mobile/suporte/ticket/{token}/close', [MobileSupportController::class, 'closeTicket'])
    ->middleware('auth')
    ->name('mobile.support.close');
Route::post('/mobile/suporte/ticket/{token}/ocultar', [MobileSupportController::class, 'hideFromUser'])
    ->middleware('auth')
    ->name('mobile.support.ticket.hide');

Route::get('/mobile/agendamento-pastoral', [MobilePastoralAppointmentController::class, 'hub'])
    ->middleware('auth')
    ->name('mobile.pastoral-appointments.request');
Route::post('/mobile/agendamento-pastoral', [MobilePastoralAppointmentController::class, 'store'])
    ->middleware('auth')
    ->name('mobile.pastoral-appointments.store');
Route::patch('/mobile/agendamento-pastoral/{appointment}', [MobilePastoralAppointmentController::class, 'update'])
    ->middleware('auth')
    ->name('mobile.pastoral-appointments.update');
Route::get('/mobile/minha-disponibilidade-pastoral', [MobileController::class, 'pastorMyAvailability'])
    ->middleware('auth')
    ->name('mobile.pastor-availability');

Route::get('/musica', [MusicaController::class, 'index'])->name('musica.index');

Route::get('/cadastro-voluntario', [VolunteerPublicSignupController::class, 'createPublicPage'])->name('volunteers.public-signup.page');
Route::get('/voluntario/cadastro', [VolunteerPublicSignupController::class, 'create'])->name('volunteers.self-signup');
Route::post('/voluntario/cadastro', [VolunteerPublicSignupController::class, 'store'])
    ->middleware('throttle:10,1')
    ->name('volunteers.self-signup.store');
Route::post('/voluntario/cadastro/check-duplicate', [VolunteerPublicSignupController::class, 'checkDuplicate'])
    ->middleware('throttle:30,1')
    ->name('volunteers.self-signup.check-duplicate');

Route::get('/lider/cadastro', [\App\Http\Controllers\LeaderPublicSignupController::class, 'create'])->name('leaders.self-signup');
Route::post('/lider/cadastro', [\App\Http\Controllers\LeaderPublicSignupController::class, 'store'])
    ->middleware('throttle:10,1')
    ->name('leaders.self-signup.store');
Route::post('/lider/cadastro/check-email', [\App\Http\Controllers\LeaderPublicSignupController::class, 'checkEmail'])
    ->middleware('throttle:30,1')
    ->name('leaders.self-signup.check-email');

// Convite para voluntário aceitar/recusar novo departamento (link público).
Route::get('/voluntario/convite/{token}', [\App\Http\Controllers\VolunteerMinistryInvitationPublicController::class, 'show'])
    ->name('volunteers.ministry-invite.show');
Route::post('/voluntario/convite/{token}/aceitar', [\App\Http\Controllers\VolunteerMinistryInvitationPublicController::class, 'accept'])
    ->middleware('throttle:20,1')
    ->name('volunteers.ministry-invite.accept');
Route::post('/voluntario/convite/{token}/recusar', [\App\Http\Controllers\VolunteerMinistryInvitationPublicController::class, 'decline'])
    ->middleware('throttle:20,1')
    ->name('volunteers.ministry-invite.decline');

// Batismo: visitantes veem tela de explicação + atalhos; logados seguem para o hub.
Route::get('/mobile/batismo', [MobileChurchSolicitationController::class, 'baptismHub'])->name('mobile.baptism');

// Solicitações: visitantes veem tela de explicação + atalhos; logados seguem para o hub.
Route::get('/mobile/solicitacoes', [MobileChurchSolicitationController::class, 'hub'])->name('mobile.solicitations.hub');

Route::middleware('auth')->group(function () {
    Route::post('/working-church', [\App\Http\Controllers\SetWorkingChurchController::class, '__invoke'])->name('working-church.store');

    // Tokens para Push Notifications nativas (Capacitor iOS/Android)
    Route::post('/mobile/push-tokens', [PushTokenController::class, 'store'])->name('mobile.push-tokens.store');
    Route::delete('/mobile/push-tokens', [PushTokenController::class, 'destroy'])->name('mobile.push-tokens.destroy');

    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    // Members Resource Routes (restricted to users with appropriate permission)
    Route::resource('members', MemberController::class)
        ->except(['create', 'edit'])
        ->parameters(['members' => 'user'])
        ->middleware('permission:members.view|members.manage');

    // Escala semanal (qualquer usuário autenticado pode ver; edição exige escalas.manage no controller)
    Route::get('/escalas', [\App\Http\Controllers\ScheduleController::class, 'index'])->name('escalas.index');
    Route::post('/escalas', [\App\Http\Controllers\ScheduleController::class, 'store'])
        ->name('escalas.store')
        ->middleware('permission:escalas.manage');
    Route::patch('/escalas/{assignment}', [\App\Http\Controllers\ScheduleController::class, 'update'])
        ->name('escalas.update')
        ->middleware('permission:escalas.manage');
    Route::post('/escalas/roles', [\App\Http\Controllers\ScheduleController::class, 'storeRole'])
        ->name('escalas.roles.store')
        ->middleware('permission:escalas.manage');
    Route::delete('/escalas/roles/{scheduleRole}', [\App\Http\Controllers\ScheduleController::class, 'destroyRole'])
        ->name('escalas.roles.destroy')
        ->middleware('permission:escalas.manage');
    Route::delete('/escalas/{assignment}', [\App\Http\Controllers\ScheduleController::class, 'destroy'])
        ->name('escalas.destroy')
        ->middleware('permission:escalas.manage');
    Route::post('/escalas/checkin-toggle', [\App\Http\Controllers\ScheduleController::class, 'checkinToggle'])
        ->name('escalas.checkin-toggle')
        ->middleware('permission:escalas.manage');
    Route::post('/escalas/checkin', [\App\Http\Controllers\ScheduleController::class, 'checkin'])
        ->name('escalas.checkin');

    // Departamentos (CRUD) — listagem em caixas
    Route::get('/departments', [MinistryController::class, 'index'])->name('departments.index')->middleware('permission:departments.view|departments.manage');
    Route::post('/departments', [MinistryController::class, 'store'])->name('departments.store')->middleware('permission:departments.manage');
    Route::put('/departments/{ministry}', [MinistryController::class, 'update'])->name('departments.update')->middleware('permission:departments.manage');
    Route::delete('/departments/{ministry}', [MinistryController::class, 'destroy'])->name('departments.destroy')->middleware('permission:departments.manage');

    // Voluntários (CRUD) — departamento no cadastro
    Route::get('/volunteers', [VolunteerController::class, 'index'])->name('volunteers.index')->middleware('permission:volunteers.view|volunteers.manage');
    Route::get('/volunteers/{volunteer}', [VolunteerController::class, 'show'])->name('volunteers.show')->middleware('permission:volunteers.view|volunteers.manage');
    Route::post('/volunteers', [VolunteerController::class, 'store'])->name('volunteers.store')->middleware('permission:volunteers.manage');
    Route::post('/volunteers/{volunteer}/invite', [VolunteerController::class, 'invite'])->name('volunteers.invite')->middleware('permission:volunteers.manage');
    Route::post('/volunteers/public-signup-link', [VolunteerPublicSignupController::class, 'rotateToken'])
        ->name('volunteers.self-signup.rotate')
        ->middleware('permission:volunteers.manage');
    Route::put('/volunteers/{volunteer}', [VolunteerController::class, 'update'])->name('volunteers.update')->middleware('permission:volunteers.manage');
    Route::delete('/volunteers/{volunteer}', [VolunteerController::class, 'destroy'])->name('volunteers.destroy')->middleware('permission:volunteers.manage');

    // Voluntários — quadro do líder de voluntariado (fases, ficha, notas)
    Route::get('/lideranca/voluntarios', [VolunteerPipelineLeadController::class, 'index'])
        ->name('ministry-lead.volunteers.index')
        ->middleware('permission:volunteers.view|volunteers.manage|volunteers.ministry_operate');
    // Voluntários — página do líder de ministério (somente voluntários encaminhados aos seus departamentos)
    Route::get('/lideranca/meus-voluntarios', [MyMinistryVolunteersController::class, 'index'])
        ->name('ministry-lead.my-volunteers.index')
        ->middleware('auth');
    Route::patch('/lideranca/meus-voluntarios/{invitation}', [MyMinistryVolunteersController::class, 'update'])
        ->name('ministry-lead.my-volunteers.update')
        ->middleware('auth');
    Route::get('/lideranca/meus-voluntarios/{invitation}/historico', [MyMinistryVolunteersController::class, 'history'])
        ->name('ministry-lead.my-volunteers.history')
        ->middleware('auth');
    Route::get('/lideranca/solicitar-voluntario', [VolunteerRequestSolicitationController::class, 'indexLeader'])
        ->name('ministry-lead.volunteer-requests.index');
    Route::post('/lideranca/solicitar-voluntario', [VolunteerRequestSolicitationController::class, 'storeLeader'])
        ->name('ministry-lead.volunteer-requests.store');
    Route::patch('/lideranca/solicitar-voluntario/{solicitation}', [VolunteerRequestSolicitationController::class, 'updateLeader'])
        ->name('ministry-lead.volunteer-requests.update');
    Route::delete('/lideranca/solicitar-voluntario/{solicitation}', [VolunteerRequestSolicitationController::class, 'destroyLeader'])
        ->name('ministry-lead.volunteer-requests.destroy');
    Route::get('/lideranca/solicitar-voluntario/{solicitation}/painel', [VolunteerRequestSolicitationController::class, 'solicitationPanelJson'])
        ->name('ministry-lead.volunteer-requests.panel');
    Route::post('/lideranca/solicitar-voluntario/{solicitation}/mensagens', [VolunteerRequestSolicitationController::class, 'storeChatMessageLeader'])
        ->name('ministry-lead.volunteer-requests.messages.store');
    Route::post('/lideranca/voluntarios/fases', [VolunteerPipelineLeadController::class, 'storeStage'])
        ->name('ministry-lead.volunteers.pipeline.stages.store')
        ->middleware('permission:volunteers.ministry_operate|volunteers.manage');
    Route::put('/lideranca/voluntarios/fases/{stage}', [VolunteerPipelineLeadController::class, 'updateStageMeta'])
        ->name('ministry-lead.volunteers.pipeline.stages.update')
        ->middleware('permission:volunteers.ministry_operate|volunteers.manage');
    Route::delete('/lideranca/voluntarios/fases/{stage}', [VolunteerPipelineLeadController::class, 'destroyStage'])
        ->name('ministry-lead.volunteers.pipeline.stages.destroy')
        ->middleware('permission:volunteers.ministry_operate|volunteers.manage');
    Route::post('/lideranca/voluntarios/{volunteer}/encaminhar', [\App\Http\Controllers\VolunteerMinistryInvitationController::class, 'store'])
        ->name('ministry-lead.volunteers.ministry-invite.store')
        ->middleware('permission:volunteers.ministry_operate|volunteers.manage');
    // Rotas com «ministerio/» primeiro — senão «ministerio» capturava-se como {volunteer}.
    Route::get('/lideranca/voluntarios/ministerio/{ministry}/procurar', [MinistryLeadVolunteerController::class, 'lookup'])
        ->name('ministry-lead.volunteers.lookup')
        ->middleware('permission:volunteers.ministry_operate|volunteers.manage');
    Route::get('/lideranca/voluntarios/ministerio/{ministry}', [MinistryLeadVolunteerController::class, 'board'])
        ->name('ministry-lead.volunteers.board')
        ->middleware('permission:volunteers.ministry_operate|volunteers.manage');
    Route::post('/lideranca/voluntarios/ministerio/{ministry}/assistente', [MinistryLeadVolunteerController::class, 'assistant'])
        ->name('ministry-lead.volunteers.assistant')
        ->middleware('permission:volunteers.ministry_operate|volunteers.manage');
    Route::post('/lideranca/voluntarios/ministerio/{ministry}/criterios', [MinistryLeadVolunteerController::class, 'storeCriterion'])
        ->name('ministry-lead.volunteers.criteria.store')
        ->middleware('permission:volunteers.ministry_operate|volunteers.manage');
    Route::delete('/lideranca/voluntarios/ministerio/{ministry}/criterios/{criterion}', [MinistryLeadVolunteerController::class, 'destroyCriterion'])
        ->name('ministry-lead.volunteers.criteria.destroy')
        ->middleware('permission:volunteers.ministry_operate|volunteers.manage');
    Route::post('/lideranca/voluntarios/ministerio/{ministry}/associar', [MinistryLeadVolunteerController::class, 'attach'])
        ->name('ministry-lead.volunteers.attach')
        ->middleware('permission:volunteers.ministry_operate|volunteers.manage');
    Route::get('/lideranca/voluntarios/ministerio/{ministry}/voluntario/{volunteer}', [MinistryLeadVolunteerController::class, 'show'])
        ->name('ministry-lead.volunteers.show')
        ->middleware('permission:volunteers.ministry_operate|volunteers.manage');
    Route::post('/lideranca/voluntarios/ministerio/{ministry}/voluntario/{volunteer}/criterios/{criterion}/toggle', [MinistryLeadVolunteerController::class, 'toggleCheck'])
        ->name('ministry-lead.volunteers.checks.toggle')
        ->middleware('permission:volunteers.ministry_operate|volunteers.manage');
    Route::patch('/lideranca/voluntarios/ministerio/{ministry}/voluntario/{volunteer}/clearance', [MinistryLeadVolunteerController::class, 'updateClearance'])
        ->name('ministry-lead.volunteers.clearance')
        ->middleware('permission:volunteers.ministry_operate|volunteers.manage');
    Route::get('/lideranca/voluntarios/{volunteer}/ficha', [VolunteerPipelineLeadController::class, 'detail'])
        ->name('ministry-lead.volunteers.pipeline.detail')
        ->middleware('permission:volunteers.view|volunteers.manage|volunteers.ministry_operate');
    Route::post('/lideranca/voluntarios/{volunteer}/notas', [VolunteerPipelineLeadController::class, 'storeNote'])
        ->name('ministry-lead.volunteers.pipeline.notes.store')
        ->middleware('permission:volunteers.ministry_operate|volunteers.manage');
    Route::patch('/lideranca/voluntarios/{volunteer}/fase', [VolunteerPipelineLeadController::class, 'updateStage'])
        ->name('ministry-lead.volunteers.pipeline.stage')
        ->middleware('permission:volunteers.ministry_operate|volunteers.manage');

    // Salas (CRUD) — por andar
    Route::get('/rooms', [\App\Http\Controllers\RoomController::class, 'index'])->name('rooms.index')->middleware('permission:rooms.view|rooms.manage');
    Route::post('/rooms', [\App\Http\Controllers\RoomController::class, 'store'])->name('rooms.store')->middleware('permission:rooms.manage');
    Route::put('/rooms/{room}', [\App\Http\Controllers\RoomController::class, 'update'])->name('rooms.update')->middleware('permission:rooms.manage');
    Route::delete('/rooms/{room}', [\App\Http\Controllers\RoomController::class, 'destroy'])->name('rooms.destroy')->middleware('permission:rooms.manage');
    // Agendamento de salas (calendário + reservas)
    Route::get('/salas/agenda', [RoomBookingController::class, 'index'])->name('room-bookings.index')->middleware('permission:rooms.view|rooms.manage|rooms.schedule');
    Route::post('/salas/agenda', [RoomBookingController::class, 'store'])->name('room-bookings.store')->middleware('permission:rooms.schedule');
    Route::put('/salas/agenda/{roomBooking}', [RoomBookingController::class, 'update'])->name('room-bookings.update')->middleware('permission:rooms.schedule|rooms.manage');
    Route::delete('/salas/agenda/{roomBooking}', [RoomBookingController::class, 'destroy'])->name('room-bookings.destroy')->middleware('permission:rooms.schedule|rooms.manage');
    // Inventário — itens com código de barras, busca e histórico
    Route::get('/inventory', [InventoryController::class, 'index'])->name('inventory.index')->middleware('permission:inventory.view|inventory.manage');
    Route::get('/inventory/lookup', [InventoryController::class, 'lookup'])->name('inventory.lookup')->middleware('permission:inventory.view|inventory.manage');
    Route::get('/inventory/{item}/history', [InventoryController::class, 'history'])->name('inventory.history')->middleware('permission:inventory.view|inventory.manage');
    Route::post('/inventory', [InventoryController::class, 'store'])->name('inventory.store')->middleware('permission:inventory.manage');
    Route::put('/inventory/{item}', [InventoryController::class, 'update'])->name('inventory.update')->middleware('permission:inventory.manage');
    Route::delete('/inventory/{item}', [InventoryController::class, 'destroy'])->name('inventory.destroy')->middleware('permission:inventory.manage');
    Route::get('/mobile/inventario', [InventoryController::class, 'mobile'])->name('mobile.inventory')->middleware('permission:inventory.view|inventory.manage');
    // Usuários e convites
    Route::get('/users', [\App\Http\Controllers\UserController::class, 'index'])->name('users.index')->middleware('permission:users.view|users.manage');
    Route::post('/users/leader-signup-link/rotate', [\App\Http\Controllers\LeaderPublicSignupController::class, 'rotateToken'])
        ->name('leaders.self-signup.rotate')
        ->middleware('permission:members.manage|users.manage');
    Route::post('/users', [\App\Http\Controllers\UserController::class, 'store'])->name('users.store')->middleware('permission:users.manage');
    Route::post('/users/{user}/invite', [\App\Http\Controllers\UserController::class, 'invite'])->name('users.invite')->middleware('permission:users.manage');
    Route::put('/users/{user}', [\App\Http\Controllers\UserController::class, 'update'])->name('users.update')->middleware('permission:users.manage');
    Route::delete('/users/{user}', [\App\Http\Controllers\UserController::class, 'destroy'])->name('users.destroy')->middleware('permission:users.manage');
    Route::post('/invitations', [\App\Http\Controllers\InvitationController::class, 'store'])->name('invitations.store')->middleware('permission:users.manage');
    Route::delete('/invitations/{invitation}', [\App\Http\Controllers\InvitationController::class, 'destroy'])->name('invitations.destroy')->middleware('permission:users.manage');

    // Perfis (papéis) e permissões
    Route::get('/roles', [RoleController::class, 'index'])->name('roles.index')->middleware('role:super_admin');
    Route::post('/roles/novo', [RoleController::class, 'store'])->name('roles.store')->middleware('role:super_admin');
    Route::delete('/roles/{role}', [RoleController::class, 'destroy'])->name('roles.destroy')->middleware('role:super_admin');
    Route::post('/roles', [RoleController::class, 'update'])->name('roles.update')->middleware('role:super_admin');

    // Notícias
    Route::get('/news', [NewsController::class, 'index'])->name('news.index');
    Route::post('/news', [NewsController::class, 'store'])->name('news.store')->middleware('permission:news.manage');
    Route::put('/news/{news}', [NewsController::class, 'update'])->name('news.update')->middleware('permission:news.manage');
    Route::delete('/news/{news}', [NewsController::class, 'destroy'])->name('news.destroy')->middleware('permission:news.manage');
    // Eventos — ver exige events.view|events.manage; criar/editar/excluir exige events.manage
    Route::get('/events', [EventController::class, 'index'])->name('events.index')->middleware('permission:events.view|events.manage');
    Route::post('/events', [EventController::class, 'store'])->name('events.store')->middleware('permission:events.manage');
    Route::put('/events/{event}', [EventController::class, 'update'])->name('events.update')->middleware('permission:events.manage');
    Route::delete('/events/{event}', [EventController::class, 'destroy'])->name('events.destroy')->middleware('permission:events.manage');
    /** admin|super_admin: hasAnyRole; resto: permissão culto.manage (evita 403 quando Gate/BD ficam desalinhados). */
    Route::get('/culto', [CultoController::class, 'index'])->name('culto.index')->middleware('role_or_permission:super_admin|admin|culto.manage');
    Route::post('/culto', [CultoController::class, 'store'])->name('culto.store')->middleware('role_or_permission:super_admin|admin|culto.manage');
    Route::put('/culto/{culto}', [CultoController::class, 'update'])->name('culto.update')->middleware('role_or_permission:super_admin|admin|culto.manage');
    Route::delete('/culto/{culto}', [CultoController::class, 'destroy'])->name('culto.destroy')->middleware('role_or_permission:super_admin|admin|culto.manage');
    Route::post('/musica', [MusicaController::class, 'store'])->name('musica.store')->middleware('permission:music.manage');
    Route::post('/musica/import-playlist', [MusicaController::class, 'importPlaylist'])->name('musica.import-playlist')->middleware('permission:music.manage');
    Route::put('/musica/{musica}', [MusicaController::class, 'update'])->name('musica.update')->middleware('permission:music.manage');
    Route::delete('/musica/{musica}', [MusicaController::class, 'destroy'])->name('musica.destroy')->middleware('permission:music.manage');
    Route::get('/fotos', [PhotoAlbumController::class, 'index'])->name('photo-albums.index')->middleware('permission:photos.manage');
    Route::post('/fotos', [PhotoAlbumController::class, 'store'])->name('photo-albums.store')->middleware('permission:photos.manage');
    Route::put('/fotos/{album}', [PhotoAlbumController::class, 'update'])->name('photo-albums.update')->middleware('permission:photos.manage');
    Route::delete('/fotos/{album}', [PhotoAlbumController::class, 'destroy'])->name('photo-albums.destroy')->middleware('permission:photos.manage');
    Route::get('/services', function () {
        return Inertia::render('Dashboard');
    })->name('services.index');
    Route::get('/acervo', [AcervoController::class, 'index'])->name('acervo.index')->middleware('permission:music.manage');
    Route::get('/settings', [SettingsController::class, 'index'])->name('settings.index')->middleware('role:super_admin');
    Route::put('/settings/solicitations-handler', [SettingsController::class, 'updateSolicitationsHandler'])
        ->name('settings.solicitations-handler.update')
        ->middleware('role:super_admin');
    Route::put('/settings/youtube-live', [SettingsController::class, 'updateYoutubeLive'])
        ->name('settings.youtube-live.update')
        ->middleware('role:super_admin');
    Route::post('/acervo', [AcervoController::class, 'store'])->name('acervo.store')->middleware('permission:music.manage');
    Route::put('/acervo/{acervo}', [AcervoController::class, 'update'])->name('acervo.update')->middleware('permission:music.manage');
    Route::delete('/acervo/{acervo}', [AcervoController::class, 'destroy'])->name('acervo.destroy')->middleware('permission:music.manage');
    // Pastores (gestão por igreja)
    Route::get('/pastores', [PastorController::class, 'index'])->name('pastors.index')->middleware('role_or_permission:super_admin|admin|pastors.view|pastors.manage');
    Route::post('/pastores', [PastorController::class, 'store'])->name('pastors.store')->middleware('role_or_permission:super_admin|admin|pastors.manage');
    Route::put('/pastores/{pastor}', [PastorController::class, 'update'])->name('pastors.update')->middleware('role_or_permission:super_admin|admin|pastors.manage');
    Route::delete('/pastores/{pastor}', [PastorController::class, 'destroy'])->name('pastors.destroy')->middleware('role_or_permission:super_admin|admin|pastors.manage');
    Route::put('/pastores/{pastor}/disponibilidade-semanal', [PastorController::class, 'updateWeeklySchedule'])
        ->name('pastors.weekly-schedule.update');

    Route::get('/agenda-pastoral', [PastoralAgendaController::class, 'index'])->name('pastoral-agenda.index');
    Route::post('/pastores/{pastor}/disponibilidades', [\App\Http\Controllers\PastoralAvailabilityController::class, 'store'])
        ->name('pastors.pastoral-availabilities.store');
    Route::put('/pastores/{pastor}/disponibilidades/{availability}', [\App\Http\Controllers\PastoralAvailabilityController::class, 'update'])
        ->name('pastors.pastoral-availabilities.update');
    Route::delete('/pastores/{pastor}/disponibilidades/{availability}', [\App\Http\Controllers\PastoralAvailabilityController::class, 'destroy'])
        ->name('pastors.pastoral-availabilities.destroy');

    /** Agendamentos pastor: gestão em Atendimento Pastoral; mantém URL antiga. */
    Route::get('/pastoral-appointments', function (\Illuminate\Http\Request $request) {
        abort_unless($request->user()?->can('pastoral_appointments.manage'), 403);

        return redirect()->route('solicitations.index', ['kind' => 'pastoral']);
    })->name('pastoral-appointments.index')->middleware('permission:pastoral_appointments.manage');

    Route::post('/notifications', [AppNotificationController::class, 'store'])->name('notifications.store')->middleware('permission:notifications.manage');
    Route::delete('/notifications/{notification}', [AppNotificationController::class, 'destroy'])
        ->name('notifications.destroy')
        ->middleware('permission:notifications.manage');
    Route::get('/mobile/settings', [MobileController::class, 'settings'])->name('mobile.settings');
    Route::post('/notifications/inbox/read', [MobileController::class, 'markInboxNotificationRead'])
        ->name('notifications.inbox.read');

    // Suporte (Admin) — permissões dedicadas; item «A desenvolver» só admin/super_admin
    Route::get('/suporte', [SupportAdminController::class, 'index'])
        ->name('support.index')
        ->middleware('role:super_admin');
    Route::post('/suporte', [SupportAdminController::class, 'store'])
        ->name('support.store')
        ->middleware('role:super_admin');
    Route::patch('/suporte/{token}', [SupportAdminController::class, 'update'])
        ->name('support.update')
        ->middleware('role:super_admin');
    Route::delete('/suporte/{token}', [SupportAdminController::class, 'destroy'])
        ->name('support.destroy')
        ->middleware('role:super_admin');
    Route::get('/suporte/{token}', [SupportAdminController::class, 'show'])
        ->name('support.show')
        ->middleware('role:super_admin');
    Route::post('/suporte/{token}/messages', [SupportAdminController::class, 'sendMessage'])
        ->name('support.messages.store')
        ->middleware('role:super_admin');
    Route::patch('/suporte/{token}/close', [SupportAdminController::class, 'closeTicket'])
        ->name('support.close')
        ->middleware('role:super_admin');

    // Solicitações (membro — requer login para enviar/acompanhar)
    Route::get('/mobile/solicitacoes/meus-pedidos', [MobileChurchSolicitationController::class, 'mine'])->name('mobile.solicitations.mine');
    Route::get('/mobile/solicitacoes/novo/{type}', [MobileChurchSolicitationController::class, 'create'])->name('mobile.solicitations.create');
    Route::post('/mobile/solicitacoes', [MobileChurchSolicitationController::class, 'store'])->name('mobile.solicitations.store');
    Route::get('/mobile/solicitacoes/{solicitation}', [MobileChurchSolicitationController::class, 'show'])->name('mobile.solicitations.show');
    Route::patch('/mobile/solicitacoes/{solicitation}', [MobileChurchSolicitationController::class, 'updateAsMember'])->name('mobile.solicitations.update');
    Route::post('/mobile/solicitacoes/{solicitation}/messages', [MobileChurchSolicitationController::class, 'sendMessage'])->name('mobile.solicitations.messages.store');
    Route::post('/mobile/solicitacoes/{solicitation}/finalizar-conversa-lider', [MobileChurchSolicitationController::class, 'finalizeLeaderChat'])->name('mobile.solicitations.leader-chat.finalize');
    Route::post('/mobile/solicitacoes/{solicitation}/ocultar-para-mim', [MobileChurchSolicitationController::class, 'hideFromMemberApp'])->name('mobile.solicitations.hide-from-member');

    Route::get('/mobile/contact', [MobileController::class, 'leaderContact'])->name('mobile.contact');
    Route::post('/mobile/contact', [MobileController::class, 'leaderContactStore'])->name('mobile.contact.store');
    Route::get('/mobile/lider/conversas', [MobileLeaderSolicitationController::class, 'index'])->name('mobile.leader-solicitations.index');
    Route::get('/mobile/lider/conversas/{solicitation}', [MobileLeaderSolicitationController::class, 'show'])->name('mobile.leader-solicitations.show');
    Route::post('/mobile/lider/conversas/{solicitation}/messages', [MobileLeaderSolicitationController::class, 'sendMessage'])->name('mobile.leader-solicitations.messages.store');
    Route::post('/mobile/lider/conversas/{solicitation}/finalizar', [MobileLeaderSolicitationController::class, 'finalizeLeaderChat'])->name('mobile.leader-solicitations.finalize');
    Route::post('/mobile/lider/conversas/{solicitation}/ocultar-para-mim', [MobileLeaderSolicitationController::class, 'hideFromLeaderApp'])->name('mobile.leader-solicitations.hide-from-leader');

    // Solicitações — inbox (equipe). Admin/super_admin explícitos (evita 403 como em /culto)
    Route::get('/solicitacoes', [SolicitationAdminController::class, 'index'])
        ->name('solicitations.index')
        ->middleware('role_or_permission:super_admin|admin|solicitations.view|solicitations.manage');
    Route::get('/pedidos-batismo', [SolicitationAdminController::class, 'baptismIndex'])
        ->name('baptism-requests.index')
        ->middleware('role_or_permission:super_admin|admin|solicitations.view|solicitations.manage');
    Route::patch('/solicitacoes/{solicitation}', [SolicitationAdminController::class, 'update'])
        ->name('solicitations.update')
        ->middleware('role_or_permission:super_admin|admin|solicitations.manage');
    Route::post('/solicitacoes/{solicitation}/messages', [SolicitationAdminController::class, 'sendMessage'])
        ->name('solicitations.messages.store')
        ->middleware('role_or_permission:super_admin|admin|solicitations.view|solicitations.manage');
    Route::get('/solicitar-voluntario', [VolunteerRequestSolicitationController::class, 'indexStaff'])
        ->name('volunteer-requests.staff.index')
        ->middleware('role_or_permission:super_admin|admin|solicitations.manage');
    Route::get('/solicitar-voluntario/picker-voluntarios', [VolunteerRequestSolicitationController::class, 'attachVolunteerPicker'])
        ->name('volunteer-requests.staff.attach-picker-volunteers')
        ->middleware('role_or_permission:super_admin|admin|solicitations.manage');
    Route::get('/solicitar-voluntario/{solicitation}/painel', [VolunteerRequestSolicitationController::class, 'solicitationPanelJson'])
        ->name('volunteer-requests.staff.panel')
        ->middleware('role_or_permission:super_admin|admin|solicitations.manage');
    Route::post('/solicitar-voluntario/{solicitation}/mensagens', [VolunteerRequestSolicitationController::class, 'storeChatMessageStaff'])
        ->name('volunteer-requests.staff.messages.store')
        ->middleware('role_or_permission:super_admin|admin|solicitations.manage');
    Route::post('/solicitar-voluntario', [VolunteerRequestSolicitationController::class, 'storeStaff'])
        ->name('volunteer-requests.staff.store')
        ->middleware('role_or_permission:super_admin|admin|solicitations.manage');
    Route::patch('/solicitar-voluntario/{solicitation}', [VolunteerRequestSolicitationController::class, 'updateStaff'])
        ->name('volunteer-requests.staff.update')
        ->middleware('role_or_permission:super_admin|admin|solicitations.manage');
    Route::delete('/solicitar-voluntario/{solicitation}', [VolunteerRequestSolicitationController::class, 'destroyStaff'])
        ->name('volunteer-requests.staff.destroy')
        ->middleware('role_or_permission:super_admin|admin|solicitations.manage');
    Route::post('/solicitar-voluntario/{solicitation}/anexar-voluntario', [VolunteerRequestSolicitationController::class, 'attachVolunteerStaff'])
        ->name('volunteer-requests.staff.attach-volunteer')
        ->middleware('role_or_permission:super_admin|admin|solicitations.manage');

    // Versões do App (Admin) — admin/super_admin (admin pode complementar notas pós-deploy)
    Route::get('/app-versions', [AppVersionController::class, 'index'])->name('app-versions.index')->middleware('role:admin|super_admin');
    Route::post('/app-versions', [AppVersionController::class, 'store'])->name('app-versions.store')->middleware('role:admin|super_admin');
    Route::put('/app-versions/{appVersion}', [AppVersionController::class, 'update'])->name('app-versions.update')->middleware('role:admin|super_admin');
    Route::delete('/app-versions/{appVersion}', [AppVersionController::class, 'destroy'])->name('app-versions.destroy')->middleware('role:admin|super_admin');

    // Operações / métricas / auditoria de login — apenas super admin
    Route::get('/operacoes', [OperationsDashboardController::class, 'index'])
        ->name('operations.index')
        ->middleware('role:super_admin');

    // Igrejas — apenas super admin
    Route::get('/churches', [ChurchController::class, 'index'])->name('churches.index')->middleware('role:super_admin');
    Route::post('/churches', [ChurchController::class, 'store'])->name('churches.store')->middleware('role:super_admin');
    Route::put('/churches/{church}', [ChurchController::class, 'update'])->name('churches.update')->middleware('role:super_admin');
    Route::delete('/churches/{church}', [ChurchController::class, 'destroy'])->name('churches.destroy')->middleware('role:super_admin');
    Route::get('/churches/{church}/services', [\App\Http\Controllers\ChurchServiceController::class, 'index'])->name('churches.services.index')->middleware('role:super_admin');
    Route::post('/churches/{church}/services', [\App\Http\Controllers\ChurchServiceController::class, 'store'])->name('churches.services.store')->middleware('role:super_admin');
    Route::put('/churches/{church}/services/{service}', [\App\Http\Controllers\ChurchServiceController::class, 'update'])->name('churches.services.update')->middleware('role:super_admin');
    Route::delete('/churches/{church}/services/{service}', [\App\Http\Controllers\ChurchServiceController::class, 'destroy'])->name('churches.services.destroy')->middleware('role:super_admin');
});

require __DIR__.'/auth.php';
