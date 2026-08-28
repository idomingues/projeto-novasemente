<?php

use App\Http\Controllers\AcervoController;
use App\Http\Controllers\AppNotificationController;
use App\Http\Controllers\AppVersionController;
use App\Http\Controllers\CampaignDonationController;
use App\Http\Controllers\CharityCampaignController;
use App\Http\Controllers\CharityCampaignMediaController;
use App\Http\Controllers\CharityCampaignMobileController;
use App\Http\Controllers\CharityDonationController;
use App\Http\Controllers\CharityItemDonationController;
use App\Http\Controllers\CharityTreasurerDashboardController;
use App\Http\Controllers\ChurchController;
use App\Http\Controllers\CommunicationRequestController;
use App\Http\Controllers\CommunityController;
use App\Http\Controllers\CultoController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\DonationCampaignController;
use App\Http\Controllers\DonationCampaignMediaController;
use App\Http\Controllers\DonationCampaignMobileController;
use App\Http\Controllers\DonationItemCampaignController;
use App\Http\Controllers\DonationItemCampaignMobileController;
use App\Http\Controllers\EventController;
use App\Http\Controllers\FaceAiController;
use App\Http\Controllers\FaviconController;
use App\Http\Controllers\HealthController;
use App\Http\Controllers\InventoryController;
use App\Http\Controllers\LibraryBookController;
use App\Http\Controllers\LibraryBookExternalContentController;
use App\Http\Controllers\LibraryConfigExternalContentController;
use App\Http\Controllers\MemberController;
use App\Http\Controllers\MinistryController;
use App\Http\Controllers\MinistryLeadVolunteerController;
use App\Http\Controllers\MissionFormController;
use App\Http\Controllers\MissionTripRegistrationController;
use App\Http\Controllers\MissionVolunteerController;
use App\Http\Controllers\MobileAnoBiblicoController;
use App\Http\Controllers\MobileBibleController;
use App\Http\Controllers\MobileChurchSolicitationController;
use App\Http\Controllers\MobileController;
use App\Http\Controllers\MobilePastoralAppointmentController;
use App\Http\Controllers\MobilePromiseBoxController;
use App\Http\Controllers\MobileSupportController;
use App\Http\Controllers\MusicaController;
use App\Http\Controllers\MyMinistryVolunteersController;
use App\Http\Controllers\NewsController;
use App\Http\Controllers\OfferingLandingController;
use App\Http\Controllers\OperationsDashboardController;
use App\Http\Controllers\PastoralAgendaController;
use App\Http\Controllers\PastorController;
use App\Http\Controllers\PhotoAlbumController;
use App\Http\Controllers\PollController;
use App\Http\Controllers\PollDisplayController;
use App\Http\Controllers\PollMobileController;
use App\Http\Controllers\PollPublicVoteController;
use App\Http\Controllers\PrayerRequestController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\PublicationCommentAdminController;
use App\Http\Controllers\PublicationEngagementController;
use App\Http\Controllers\PublicDiskFileController;
use App\Http\Controllers\PushTokenController;
use App\Http\Controllers\RevistaAdventistaArticleController;
use App\Http\Controllers\RoleController;
use App\Http\Controllers\RoomBookingController;
use App\Http\Controllers\SettingsController;
use App\Http\Controllers\SharedTalentAdminController;
use App\Http\Controllers\SharedTalentController;
use App\Http\Controllers\SolicitationAdminController;
use App\Http\Controllers\SupportAdminController;
use App\Http\Controllers\TalentConnectionAdminController;
use App\Http\Controllers\TalentConnectionController;
use App\Http\Controllers\TreasurerDashboardController;
use App\Http\Controllers\VariosController;
use App\Http\Controllers\VersiculoCaixinhaController;
use App\Http\Controllers\VolunteerController;
use App\Http\Controllers\VolunteerPipelineLeadController;
use App\Http\Controllers\VolunteerPublicSignupController;
use App\Http\Controllers\VolunteerRequestSolicitationController;
use App\Http\Controllers\VolunteerSelfSignupEditController;
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

// Painel público de resultados da enquete (TV / projetor)
Route::get('/enquete/p/{token}', [PollDisplayController::class, 'show'])
    ->where('token', '[A-Za-z0-9]+')
    ->name('polls.display');
Route::get('/enquete/p/{token}/dados', [PollDisplayController::class, 'data'])
    ->where('token', '[A-Za-z0-9]+')
    ->middleware('throttle:60,1')
    ->name('polls.display.data');

// Voto público (sem login) — 1 voto por usuário ou por IP
Route::get('/enquete/v/{token}', [PollPublicVoteController::class, 'show'])
    ->where('token', '[A-Za-z0-9]+')
    ->name('polls.vote');
Route::post('/enquete/v/{token}', [PollPublicVoteController::class, 'store'])
    ->where('token', '[A-Za-z0-9]+')
    ->middleware('throttle:20,1')
    ->name('polls.vote.store');

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

Route::get('/mobile', [MobileController::class, 'home'])->name('mobile.index');
Route::get('/mobile/inicio', [MobileController::class, 'home'])->name('mobile.home');
Route::get('/mobile/meditacao-diaria', [MobileController::class, 'meditacaoDiaria'])
    ->middleware('throttle:40,1')
    ->name('mobile.meditacao-diaria');
Route::get('/mobile/culto', [MobileController::class, 'culto'])->name('mobile.culto');
Route::get('/mobile/culto/{culto}', [MobileController::class, 'cultoShow'])->name('mobile.culto.show');
Route::get('/mobile/news', [MobileController::class, 'news'])->name('mobile.news');
Route::get('/mobile/news/{news:slug}', [MobileController::class, 'newsShow'])->name('mobile.news.show');
Route::get('/mobile/saude', [MobileController::class, 'health'])->name('mobile.health');
Route::get('/mobile/saude/{health:slug}', [MobileController::class, 'healthShow'])->name('mobile.health.show');
Route::get('/mobile/revista-adventista', [MobileController::class, 'revistaAdventista'])->name('mobile.revista-adventista');
Route::get('/mobile/revista-adventista/{revistaAdventistaArticle:slug}', [MobileController::class, 'revistaAdventistaShow'])
    ->name('mobile.revista-adventista.show');
Route::get('/mobile/acervo-revista-adventista', [MobileController::class, 'revistaAdventistaAcervo'])->name('mobile.acervo-revista-adventista');
Route::get('/mobile/acervo-revista-adventista/edicao/{revistaAdventistaEdition}/download', [MobileController::class, 'revistaAdventistaAcervoPdfDownload'])
    ->middleware('throttle:60,1')
    ->name('mobile.acervo-revista-adventista.pdf-download');
Route::get('/mobile/acervo-revista-adventista/edicao/{revistaAdventistaEdition}/pdf', [MobileController::class, 'revistaAdventistaAcervoPdfStream'])
    ->middleware('throttle:60,1')
    ->name('mobile.acervo-revista-adventista.pdf-stream');
Route::get('/mobile/acervo-revista-adventista/edicao/{revistaAdventistaEdition}', [MobileController::class, 'revistaAdventistaAcervoShow'])
    ->name('mobile.acervo-revista-adventista.show');
Route::get('/mobile/events', [MobileController::class, 'events'])->name('mobile.events');
Route::get('/mobile/schedule', [MobileController::class, 'schedule'])->name('mobile.schedule');
Route::get('/mobile/schedule/full', [MobileController::class, 'scheduleFull'])->name('mobile.schedule.full');
Route::get('/mobile/more', [MobileController::class, 'more'])->name('mobile.more');
Route::get('/mobile/publicacoes', [MobileController::class, 'publicationsFeed'])->name('mobile.publications-feed');
Route::get('/mobile/publicacoes/{feedId}/comentarios', [PublicationEngagementController::class, 'comments'])
    ->middleware('throttle:60,1')
    ->where('feedId', '[A-Za-z0-9_-]+')
    ->name('mobile.publications.comments.index');
Route::get('/mobile/comunidade', [CommunityController::class, 'mobile'])->name('mobile.communities');
Route::get('/mobile/missao', [\App\Http\Controllers\MissionHubController::class, 'index'])->name('mobile.mission');
Route::get('/mobile/missao/home', [\App\Http\Controllers\MissionHubController::class, 'home'])->name('mobile.mission.home');
Route::get('/mobile/missao/inscricao', [MissionTripRegistrationController::class, 'create'])
    ->name('mobile.mission.trip-registration.create');
Route::post('/mobile/missao/inscricao', [MissionTripRegistrationController::class, 'store'])
    ->middleware('throttle:20,1')
    ->name('mobile.mission.trip-registration.store');
Route::get('/mobile/missao/eventos', [\App\Http\Controllers\MissionHubController::class, 'events'])->name('mobile.mission.events');
Route::get('/mobile/missao/recados', [\App\Http\Controllers\MissionHubController::class, 'messages'])->name('mobile.mission.messages');
Route::post('/mobile/missao/recados', [\App\Http\Controllers\MissionHubController::class, 'storeMessage'])
    ->middleware(['auth', 'throttle:30,1'])
    ->name('mobile.mission.messages.store');
Route::get('/mobile/missao/quem-somos', [\App\Http\Controllers\MissionHubController::class, 'about'])->name('mobile.mission.about');
Route::get('/mobile/missao/mural', [\App\Http\Controllers\MissionHubController::class, 'wall'])->name('mobile.mission.wall');
Route::get('/mobile/missao/mural/{missionWallItem}', [\App\Http\Controllers\MissionHubController::class, 'wallShow'])->name('mobile.mission.wall.show');
Route::get('/mobile/missao/cadastro', [MissionFormController::class, 'create'])->name('mobile.mission.form');
Route::post('/mobile/missao/cadastro', [MissionFormController::class, 'store'])
    ->middleware('throttle:20,1')
    ->name('mobile.mission.store');
Route::post('/mobile/missao/cadastro/etapa', [MissionFormController::class, 'saveStep'])
    ->middleware(['auth', 'throttle:60,1'])
    ->name('mobile.mission.step');
Route::post('/mobile/missao/cadastro/conta-app', [\App\Http\Controllers\MissionAppAccountController::class, 'store'])
    ->middleware('throttle:10,1')
    ->name('mobile.mission.app-account.store');
Route::get('/oferta', OfferingLandingController::class)->name('oferta');
Route::get('/missao', [MissionFormController::class, 'create'])->name('mission.form');
Route::post('/missao', [MissionFormController::class, 'store'])
    ->middleware('throttle:20,1')
    ->name('mission.store');
Route::post('/missao/etapa', [MissionFormController::class, 'saveStep'])
    ->middleware(['auth', 'throttle:60,1'])
    ->name('mission.step');
Route::post('/missao/conta-app', [\App\Http\Controllers\MissionAppAccountController::class, 'store'])
    ->middleware('throttle:10,1')
    ->name('mission.app-account.store');
Route::get('/mobile/biblia', [MobileBibleController::class, 'index'])->name('mobile.bible');
Route::get('/mobile/biblia/chapter', [MobileBibleController::class, 'chapter'])
    ->middleware('throttle:80,1')
    ->name('mobile.bible.chapter');
Route::get('/mobile/biblia/search', [MobileBibleController::class, 'search'])
    ->middleware('throttle:80,1')
    ->name('mobile.bible.search');
Route::get('/mobile/biblia/referencia', [MobileBibleController::class, 'reference'])
    ->middleware('throttle:80,1')
    ->name('mobile.bible.reference');
Route::get('/mobile/ano-biblico', [MobileAnoBiblicoController::class, 'index'])
    ->name('mobile.ano-biblico');
Route::get('/mobile/ano-biblico/dia/{day}', [MobileAnoBiblicoController::class, 'day'])
    ->middleware('auth')
    ->whereNumber('day')
    ->name('mobile.ano-biblico.day');
Route::post('/mobile/ano-biblico/toggle-capitulo', [MobileAnoBiblicoController::class, 'toggleChapter'])
    ->middleware('auth')
    ->name('mobile.ano-biblico.toggle-chapter');
Route::post('/mobile/ano-biblico/concluir', [MobileAnoBiblicoController::class, 'complete'])
    ->middleware('auth')
    ->name('mobile.ano-biblico.complete');
Route::get('/mobile/ano-biblico/historico', [MobileAnoBiblicoController::class, 'history'])
    ->middleware('auth')
    ->name('mobile.ano-biblico.history');
Route::post('/mobile/ano-biblico/iniciar', [MobileAnoBiblicoController::class, 'start'])
    ->middleware('auth')
    ->name('mobile.ano-biblico.start');
Route::post('/mobile/ano-biblico/reiniciar-hoje', [MobileAnoBiblicoController::class, 'resetToday'])
    ->middleware('auth')
    ->name('mobile.ano-biblico.reset-today');
Route::post('/mobile/ano-biblico/reprogramar', [MobileAnoBiblicoController::class, 'reprogram'])
    ->middleware('auth')
    ->name('mobile.ano-biblico.reprogram');
Route::post('/mobile/ano-biblico/recomecar-zero', [MobileAnoBiblicoController::class, 'restartZero'])
    ->middleware('auth')
    ->name('mobile.ano-biblico.restart-zero');
Route::get('/mobile/ano-biblico/desafios', [MobileAnoBiblicoController::class, 'challenges'])
    ->middleware('auth')
    ->name('mobile.ano-biblico.challenges');
Route::post('/mobile/ano-biblico/desafios/iniciar', [MobileAnoBiblicoController::class, 'startChallenge'])
    ->middleware('auth')
    ->name('mobile.ano-biblico.challenges.start');
Route::post('/mobile/ano-biblico/desafios/recalcular-atual', [MobileAnoBiblicoController::class, 'recalculateActiveChallenge'])
    ->middleware('auth')
    ->name('mobile.ano-biblico.challenges.recalculate');
Route::get('/mobile/sobre-o-app', [MobileController::class, 'sobreOApp'])->name('mobile.sobre-o-app');
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
Route::get('/mobile/biblioteca', [MobileController::class, 'biblioteca'])->name('mobile.biblioteca');
Route::get('/mobile/biblioteca/conteudo-config/{type}', [LibraryConfigExternalContentController::class, 'show'])
    ->middleware('throttle:40,1')
    ->name('mobile.biblioteca.config-external-content');
Route::get('/mobile/biblioteca/{libraryBook}/conteudo-externo', [LibraryBookExternalContentController::class, 'show'])
    ->middleware('throttle:40,1')
    ->name('mobile.biblioteca.external-content');
Route::get('/mobile/biblioteca/{libraryBook}/download', [MobileController::class, 'bibliotecaPdfDownload'])
    ->middleware('throttle:60,1')
    ->name('mobile.biblioteca.pdf-download');
Route::get('/mobile/biblioteca/{libraryBook}/pdf', [MobileController::class, 'bibliotecaPdfStream'])
    ->middleware('throttle:60,1')
    ->name('mobile.biblioteca.pdf-stream');
Route::get('/mobile/biblioteca/{libraryBook}', [MobileController::class, 'bibliotecaShow'])->name('mobile.biblioteca.show');
Route::middleware(['auth', 'throttle:60,1'])->group(function () {
    Route::get('/mobile/biblioteca/licao/anotacoes', [\App\Http\Controllers\LibraryLessonNoteController::class, 'index'])
        ->name('mobile.biblioteca.lesson-notes.index');
    Route::put('/mobile/biblioteca/licao/anotacoes', [\App\Http\Controllers\LibraryLessonNoteController::class, 'upsert'])
        ->name('mobile.biblioteca.lesson-notes.upsert');
});
Route::get('/mobile/localizacao', [MobileController::class, 'location'])->name('mobile.location');
Route::get('/mobile/pastores', [MobileController::class, 'pastors'])->name('mobile.pastors');
Route::get('/mobile/offerings', [MobileController::class, 'offerings'])->name('mobile.offerings');
Route::get('/mobile/doacoes', [CharityCampaignMobileController::class, 'index'])->name('mobile.donations.index');
Route::get('/mobile/doacoes/{charityCampaign}', [CharityCampaignMobileController::class, 'show'])
    ->whereNumber('charityCampaign')
    ->name('mobile.donations.show');
Route::get('/mobile/caixa-promessa/random', [MobilePromiseBoxController::class, 'random'])
    ->middleware('throttle:80,1')
    ->name('mobile.promise-box.random');
Route::get('/mobile/caixa-promessa/daily', [MobilePromiseBoxController::class, 'daily'])
    ->middleware('throttle:80,1')
    ->name('mobile.promise-box.daily');
Route::get('/mobile/campanhas', [DonationCampaignMobileController::class, 'index'])->name('mobile.campaigns.index');
Route::get('/mobile/campanhas/{donationCampaign}', [DonationCampaignMobileController::class, 'show'])->name('mobile.campaigns.show');
Route::get('/mobile/doacoes-itens', [DonationItemCampaignMobileController::class, 'index'])->name('mobile.item-campaigns.index');
Route::get('/mobile/doacoes-itens/{donationItemCampaign}', [DonationItemCampaignMobileController::class, 'show'])->name('mobile.item-campaigns.show');
Route::get('/mobile/notifications', [MobileController::class, 'notifications'])->name('mobile.notifications');
Route::get('/mobile/profile', [MobileController::class, 'profile'])
    ->middleware('auth')
    ->name('mobile.profile');
Route::get('/mobile/perfil/editar', [MobileController::class, 'profileEdit'])
    ->middleware('auth')
    ->name('mobile.profile.edit');
Route::get('/mobile/voluntario/cadastro', [VolunteerSelfSignupEditController::class, 'edit'])
    ->middleware('auth')
    ->name('volunteers.self-signup.edit');
Route::get('/mobile/voluntario/data-nascimento', [VolunteerSelfSignupEditController::class, 'editBirthDate'])
    ->middleware('auth')
    ->name('volunteers.self-signup.birth-date');
Route::match(['put', 'patch'], '/mobile/voluntario/data-nascimento', [VolunteerSelfSignupEditController::class, 'updateBirthDate'])
    ->middleware(['auth', 'throttle:20,1'])
    ->name('volunteers.self-signup.birth-date.update');
Route::match(['put', 'patch'], '/mobile/voluntario/cadastro', [VolunteerSelfSignupEditController::class, 'update'])
    ->middleware(['auth', 'throttle:20,1'])
    ->name('volunteers.self-signup.edit.update');
Route::post('/mobile/voluntario/cadastro/autosave', [VolunteerSelfSignupEditController::class, 'autosave'])
    ->middleware(['auth', 'throttle:40,1'])
    ->name('volunteers.self-signup.autosave');
Route::get('/mobile/escala/checkin', [MobileController::class, 'scheduleCheckin'])
    ->middleware('auth')
    ->name('mobile.schedule.checkin');

// Suporte (app)
Route::get('/mobile/suporte', [MobileSupportController::class, 'index'])->name('mobile.support.index');
Route::post('/mobile/suporte', [MobileSupportController::class, 'store'])
    ->middleware('throttle:10,1')
    ->name('mobile.support.store');
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
Route::post('/voluntario/cadastro/identificar', [VolunteerPublicSignupController::class, 'identify'])
    ->middleware('throttle:30,1')
    ->name('volunteers.self-signup.identify');
Route::get('/voluntario/cadastro/formulario', [VolunteerPublicSignupController::class, 'showForm'])
    ->name('volunteers.self-signup.form');
Route::get('/voluntario/cadastro/ja-cadastrado', [VolunteerPublicSignupController::class, 'existingOptions'])
    ->name('volunteers.self-signup.existing');
Route::get('/voluntario/cadastro/pedir-departamento', [VolunteerPublicSignupController::class, 'requestDepartmentForm'])
    ->middleware('auth')
    ->name('volunteers.self-signup.request-department');
Route::post('/voluntario/cadastro/pedir-departamento', [VolunteerPublicSignupController::class, 'storeRequestDepartment'])
    ->middleware(['auth', 'throttle:10,1'])
    ->name('volunteers.self-signup.request-department.store');
Route::post('/voluntario/cadastro', [VolunteerPublicSignupController::class, 'store'])
    ->middleware('throttle:10,1')
    ->name('volunteers.self-signup.store');
Route::post('/voluntario/cadastro/check-duplicate', [VolunteerPublicSignupController::class, 'checkDuplicate'])
    ->middleware('throttle:30,1')
    ->name('volunteers.self-signup.check-duplicate');
Route::get('/voluntario/cadastro/concluido', [VolunteerPublicSignupController::class, 'welcome'])
    ->name('volunteers.self-signup.welcome');

Route::get('/lider/cadastro', [\App\Http\Controllers\LeaderPublicSignupController::class, 'create'])->name('leaders.self-signup');
Route::post('/lider/cadastro', [\App\Http\Controllers\LeaderPublicSignupController::class, 'store'])
    ->middleware('throttle:10,1')
    ->name('leaders.self-signup.store');
Route::post('/lider/cadastro/check-email', [\App\Http\Controllers\LeaderPublicSignupController::class, 'checkEmail'])
    ->middleware('throttle:30,1')
    ->name('leaders.self-signup.check-email');

// Convite de ministério: link antigo redireciona para cadastro (ou mostra estado final).
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

// NS Conecta: visitantes veem explicação + login; logados usam o módulo.
Route::get('/mobile/ns-whats', [\App\Http\Controllers\MobileNsWhatsController::class, 'index'])->name('mobile.ns-whats.index');
Route::get('/mobile/ns-whats/nova', [\App\Http\Controllers\MobileNsWhatsController::class, 'compose'])->name('mobile.ns-whats.compose');
Route::get('/mobile/contact', fn () => redirect()->route('mobile.ns-whats.index'))->name('mobile.contact');

Route::middleware('auth')->group(function () {
    Route::post('/working-church', [\App\Http\Controllers\SetWorkingChurchController::class, '__invoke'])->name('working-church.store');

    // Tokens para Push Notifications nativas (Capacitor iOS/Android)
    Route::post('/mobile/push-tokens', [PushTokenController::class, 'store'])->name('mobile.push-tokens.store');
    Route::delete('/mobile/push-tokens', [PushTokenController::class, 'destroy'])->name('mobile.push-tokens.destroy');
    Route::post('/mobile/inicio/marcadores', [MobileController::class, 'toggleHomeCardBookmark'])
        ->middleware('throttle:60,1')
        ->name('mobile.home.bookmarks.toggle');
    Route::post('/mobile/biblioteca/marcadores', [MobileController::class, 'toggleLibraryBookBookmark'])
        ->middleware('throttle:60,1')
        ->name('mobile.biblioteca.bookmarks.toggle');

    Route::post('/mobile/publicacoes/{feedId}/like', [PublicationEngagementController::class, 'toggleLike'])
        ->middleware('throttle:60,1')
        ->where('feedId', '[A-Za-z0-9_-]+')
        ->name('mobile.publications.like');
    Route::post('/mobile/publicacoes/{feedId}/comentarios', [PublicationEngagementController::class, 'storeComment'])
        ->middleware('throttle:30,1')
        ->where('feedId', '[A-Za-z0-9_-]+')
        ->name('mobile.publications.comments.store');
    Route::delete('/mobile/publicacoes/comentarios/{comment}', [PublicationEngagementController::class, 'destroyOwnComment'])
        ->middleware('throttle:30,1')
        ->name('mobile.publications.comments.destroy');

    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    // Usuários da igreja (app + equipe); listagem unificada em users.index.
    Route::get('/members', fn (\Illuminate\Http\Request $request) => redirect()->route('users.index', $request->query()))
        ->name('members.index')
        ->middleware('permission:members.view|members.manage|users.view|users.manage');
    Route::resource('members', MemberController::class)
        ->except(['create', 'edit', 'index'])
        ->parameters(['members' => 'user'])
        ->middleware('permission:members.view|members.manage');

    // Escala semanal (qualquer usuário autenticado pode ver; edição validada no controller).
    Route::get('/escalas', [\App\Http\Controllers\ScheduleController::class, 'index'])->name('escalas.index');
    Route::post('/escalas', [\App\Http\Controllers\ScheduleController::class, 'store'])
        ->name('escalas.store');
    Route::patch('/escalas/{assignment}', [\App\Http\Controllers\ScheduleController::class, 'update'])
        ->name('escalas.update');
    Route::post('/escalas/roles', [\App\Http\Controllers\ScheduleController::class, 'storeRole'])
        ->name('escalas.roles.store');
    Route::delete('/escalas/roles/{scheduleRole}', [\App\Http\Controllers\ScheduleController::class, 'destroyRole'])
        ->name('escalas.roles.destroy');
    Route::delete('/escalas/{assignment}', [\App\Http\Controllers\ScheduleController::class, 'destroy'])
        ->name('escalas.destroy');
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
    Route::get('/volunteers/export/encaminhado-missao', [VolunteerController::class, 'exportEncaminhadoMissao'])
        ->name('volunteers.export-encaminhado-missao')
        ->middleware('permission:volunteers.view|volunteers.manage');
    Route::get('/volunteers/{volunteer}', [VolunteerController::class, 'show'])->name('volunteers.show')->middleware('permission:volunteers.view|volunteers.manage');
    Route::get('/volunteers/{volunteer}/detalhe', [VolunteerController::class, 'detail'])->name('volunteers.detail')->middleware('permission:volunteers.view|volunteers.manage');
    Route::post('/volunteers', [VolunteerController::class, 'store'])->name('volunteers.store')->middleware('permission:volunteers.manage');
    Route::post('/volunteers/{volunteer}/invite', [VolunteerController::class, 'invite'])->name('volunteers.invite')->middleware('permission:volunteers.manage');
    Route::post('/volunteers/public-signup-link', [VolunteerPublicSignupController::class, 'rotateToken'])
        ->name('volunteers.self-signup.rotate')
        ->middleware('permission:volunteers.manage');
    Route::put('/volunteers/{volunteer}', [VolunteerController::class, 'update'])->name('volunteers.update')->middleware('permission:volunteers.manage');
    Route::delete('/volunteers/{volunteer}', [VolunteerController::class, 'destroy'])->name('volunteers.destroy')->middleware('permission:volunteers.manage');

    // Voluntários — quadro do líder de voluntariado (fases, ficha, notas)
    Route::get('/lideranca/voluntarios/central', [\App\Http\Controllers\VolunteerManagementCenterController::class, 'index'])
        ->name('ministry-lead.volunteers.central')
        ->middleware('permission:volunteers.view|volunteers.manage|volunteers.ministry_operate');
    Route::get('/lideranca/voluntarios/pedidos', [\App\Http\Controllers\VolunteerManagementCenterController::class, 'pedidos'])
        ->name('ministry-lead.volunteers.pedidos')
        ->middleware('permission:volunteers.view|volunteers.manage|volunteers.ministry_operate');
    Route::get('/lideranca/voluntarios', [VolunteerPipelineLeadController::class, 'index'])
        ->name('ministry-lead.volunteers.index')
        ->middleware('permission:volunteers.view|volunteers.manage|volunteers.ministry_operate');
    // Voluntários — página do líder de ministério (somente voluntários encaminhados aos seus departamentos)
    Route::get('/lideranca/meus-voluntarios', [MyMinistryVolunteersController::class, 'index'])
        ->name('ministry-lead.my-volunteers.index')
        ->middleware('auth');
    Route::delete('/lideranca/meus-voluntarios/voluntarios/{volunteer}/ministerio/{ministry}', [MyMinistryVolunteersController::class, 'removeVolunteerFromMinistry'])
        ->name('ministry-lead.my-volunteers.volunteer.remove-from-ministry')
        ->middleware('auth');
    Route::patch('/lideranca/meus-voluntarios/voluntarios/{volunteer}/ministerio/{ministry}/status', [MyMinistryVolunteersController::class, 'updateVolunteerLeaderStatus'])
        ->name('ministry-lead.my-volunteers.volunteer.leader-status')
        ->middleware('auth');
    Route::patch('/lideranca/meus-voluntarios/{invitation}', [MyMinistryVolunteersController::class, 'update'])
        ->name('ministry-lead.my-volunteers.update')
        ->middleware('auth');
    Route::post('/lideranca/meus-voluntarios/{invitation}/reenviar-convite-email', [MyMinistryVolunteersController::class, 'resendInvitationEmail'])
        ->name('ministry-lead.my-volunteers.invitation.resend-email')
        ->middleware('auth');
    Route::patch('/lideranca/meus-voluntarios/{invitation}/mensagem-convite', [MyMinistryVolunteersController::class, 'updateInvitationIntro'])
        ->name('ministry-lead.my-volunteers.invitation.intro')
        ->middleware('auth');
    Route::get('/lideranca/meus-voluntarios/voluntarios/{volunteer}/ministerio/{ministry}/historico', [MyMinistryVolunteersController::class, 'volunteerMinistryHistory'])
        ->name('ministry-lead.my-volunteers.volunteer.history')
        ->middleware('auth');
    Route::get('/lideranca/meus-voluntarios/{invitation}/historico', [MyMinistryVolunteersController::class, 'history'])
        ->name('ministry-lead.my-volunteers.history')
        ->middleware('auth');
    // Compatibilidade: rota antiga agora aponta para o fluxo unificado em “Meus voluntários”.
    Route::redirect('/lideranca/solicitar-voluntario', '/lideranca/meus-voluntarios')
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
    Route::get('/comunicacao/solicitacoes', [CommunicationRequestController::class, 'index'])
        ->name('communication-requests.index')
        ->middleware('auth');
    Route::post('/comunicacao/solicitacoes', [CommunicationRequestController::class, 'store'])
        ->name('communication-requests.store')
        ->middleware('auth');
    Route::get('/comunicacao/solicitacoes/{solicitation}/painel', [CommunicationRequestController::class, 'panelJson'])
        ->name('communication-requests.panel')
        ->middleware('auth');
    Route::post('/comunicacao/solicitacoes/{solicitation}/mensagens/lider', [CommunicationRequestController::class, 'storeMessageLeader'])
        ->name('communication-requests.messages.store.leader')
        ->middleware('auth');
    Route::patch('/comunicacao/solicitacoes/{solicitation}', [CommunicationRequestController::class, 'update'])
        ->name('communication-requests.update')
        ->middleware('auth');
    Route::post('/comunicacao/solicitacoes/{solicitation}/arquivar', [CommunicationRequestController::class, 'archiveStaff'])
        ->name('communication-requests.archive')
        ->middleware('auth');
    Route::post('/comunicacao/solicitacoes/{solicitation}/desarquivar', [CommunicationRequestController::class, 'unarchiveStaff'])
        ->name('communication-requests.unarchive')
        ->middleware('auth');
    Route::delete('/comunicacao/solicitacoes/{solicitation}', [CommunicationRequestController::class, 'destroy'])
        ->name('communication-requests.destroy')
        ->middleware('auth');
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
    Route::delete('/lideranca/voluntarios/{volunteer}/notas/{note}', [VolunteerPipelineLeadController::class, 'destroyNote'])
        ->name('ministry-lead.volunteers.pipeline.notes.destroy')
        ->middleware('permission:volunteers.ministry_operate|volunteers.manage');
    Route::patch('/lideranca/voluntarios/{volunteer}/fase', [VolunteerPipelineLeadController::class, 'updateStage'])
        ->name('ministry-lead.volunteers.pipeline.stage')
        ->middleware('permission:volunteers.ministry_operate|volunteers.manage');
    Route::patch('/lideranca/voluntarios/{volunteer}/departamentos', [VolunteerPipelineLeadController::class, 'syncMinistries'])
        ->name('ministry-lead.volunteers.pipeline.ministries.sync')
        ->middleware('permission:volunteers.ministry_operate|volunteers.manage');
    Route::patch('/lideranca/voluntarios/{volunteer}/senha', [VolunteerPipelineLeadController::class, 'updatePassword'])
        ->name('ministry-lead.volunteers.pipeline.password')
        ->middleware('permission:volunteers.manage');
    Route::patch('/lideranca/voluntarios/{volunteer}/ministerio/{ministry}/status-lider', [VolunteerPipelineLeadController::class, 'updateMinistryLeaderStatus'])
        ->name('ministry-lead.volunteers.pipeline.ministry-leader-status')
        ->middleware('permission:volunteers.ministry_operate|volunteers.manage');
    Route::delete('/lideranca/voluntarios/{volunteer}', [VolunteerPipelineLeadController::class, 'destroyVolunteer'])
        ->name('ministry-lead.volunteers.pipeline.destroy')
        ->middleware('permission:volunteers.manage');
    Route::post('/lideranca/voluntarios/{volunteer}/arquivar', [VolunteerPipelineLeadController::class, 'archiveVolunteer'])
        ->name('ministry-lead.volunteers.pipeline.archive')
        ->middleware('permission:volunteers.manage');
    Route::post('/lideranca/voluntarios/{volunteer}/desarquivar', [VolunteerPipelineLeadController::class, 'unarchiveVolunteer'])
        ->name('ministry-lead.volunteers.pipeline.unarchive')
        ->middleware('permission:volunteers.manage');

    // Salas (CRUD) — por andar
    Route::get('/rooms', [\App\Http\Controllers\RoomController::class, 'index'])->name('rooms.index')->middleware('permission:rooms.view|rooms.manage');
    Route::post('/rooms', [\App\Http\Controllers\RoomController::class, 'store'])->name('rooms.store')->middleware('permission:rooms.manage');
    Route::put('/rooms/{room}', [\App\Http\Controllers\RoomController::class, 'update'])->name('rooms.update')->middleware('permission:rooms.manage');
    Route::delete('/rooms/{room}', [\App\Http\Controllers\RoomController::class, 'destroy'])->name('rooms.destroy')->middleware('permission:rooms.manage');

    // CONVIVA — turmas (sala + professor) e presenças
    // CONVIVA — cadastro de turmas + presenças (Cadastro)
    Route::get('/conviva', [\App\Http\Controllers\ConvivaClassController::class, 'index'])->name('conviva.index')->middleware('permission:conviva.view|conviva.manage');
    Route::post('/conviva', [\App\Http\Controllers\ConvivaClassController::class, 'store'])->name('conviva.store')->middleware('permission:conviva.manage');
    Route::put('/conviva/{convivaClass}', [\App\Http\Controllers\ConvivaClassController::class, 'update'])->name('conviva.update')->middleware('permission:conviva.manage');
    Route::delete('/conviva/{convivaClass}', [\App\Http\Controllers\ConvivaClassController::class, 'destroy'])->name('conviva.destroy')->middleware('permission:conviva.manage');

    // Enquetes (admin)
    Route::get('/enquetes', [PollController::class, 'index'])->name('polls.index')->middleware('permission:polls.view|polls.manage');
    Route::post('/enquetes', [PollController::class, 'store'])->name('polls.store')->middleware('permission:polls.manage');
    Route::put('/enquetes/{poll}', [PollController::class, 'update'])->name('polls.update')->middleware('permission:polls.manage');
    Route::delete('/enquetes/{poll}', [PollController::class, 'destroy'])->name('polls.destroy')->middleware('permission:polls.manage');

    Route::get('/programacao', [\App\Http\Controllers\WeeklyProgramController::class, 'index'])->name('programacao.index')->middleware('permission:programacao.view|programacao.manage');
    Route::post('/programacao', [\App\Http\Controllers\WeeklyProgramController::class, 'store'])->name('programacao.store')->middleware('permission:programacao.manage');
    Route::put('/programacao/{weeklyProgram}', [\App\Http\Controllers\WeeklyProgramController::class, 'update'])->name('programacao.update')->middleware('permission:programacao.manage');
    Route::delete('/programacao/{weeklyProgram}', [\App\Http\Controllers\WeeklyProgramController::class, 'destroy'])->name('programacao.destroy')->middleware('permission:programacao.manage');
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
    Route::get('/users', [MemberController::class, 'index'])->name('users.index')->middleware('permission:members.view|members.manage|users.view|users.manage');
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
    Route::post('/roles/{role}/users', [RoleController::class, 'attachUser'])->name('roles.users.attach')->middleware('role:super_admin');
    Route::patch('/roles/{role}/users/{user}', [RoleController::class, 'updateUser'])->name('roles.users.update')->middleware('role:super_admin');
    Route::delete('/roles/{role}/users/{user}', [RoleController::class, 'detachUser'])->name('roles.users.detach')->middleware('role:super_admin');

    // Notícias
    Route::get('/news', [NewsController::class, 'index'])->name('news.index');
    Route::post('/news', [NewsController::class, 'store'])->name('news.store')->middleware('permission:news.manage');
    Route::put('/news/{news}', [NewsController::class, 'update'])->name('news.update')->middleware('permission:news.manage');
    Route::patch('/news/{news}/active', [NewsController::class, 'setActive'])->name('news.active')->middleware('permission:news.manage');
    Route::delete('/news/{news}', [NewsController::class, 'destroy'])->name('news.destroy')->middleware('permission:news.manage');
    Route::get('/publicacoes/comentarios', [PublicationCommentAdminController::class, 'index'])
        ->name('publication-comments.index')
        ->middleware('permission:news.manage');
    Route::delete('/publicacoes/comentarios/{publicationComment}', [PublicationCommentAdminController::class, 'destroy'])
        ->name('publication-comments.destroy')
        ->middleware('permission:news.manage');
    Route::get('/saude', [HealthController::class, 'index'])->name('health.index');
    Route::post('/saude', [HealthController::class, 'store'])->name('health.store')->middleware('permission:health.manage');
    Route::put('/saude/{health}', [HealthController::class, 'update'])->name('health.update')->middleware('permission:health.manage');
    Route::patch('/saude/{health}/active', [HealthController::class, 'setActive'])->name('health.active')->middleware('permission:health.manage');
    Route::delete('/saude/{health}', [HealthController::class, 'destroy'])->name('health.destroy')->middleware('permission:health.manage');
    Route::get('/revista-adventista', [RevistaAdventistaArticleController::class, 'index'])->name('revista-adventista.index');
    Route::patch('/revista-adventista/{revistaAdventistaArticle}/active', [RevistaAdventistaArticleController::class, 'setActive'])
        ->name('revista-adventista.active')
        ->middleware('permission:news.manage');
    Route::post('/revista-adventista/sincronizar-artigos', [RevistaAdventistaArticleController::class, 'syncArticles'])
        ->name('revista-adventista.sync-articles')
        ->middleware('permission:news.manage');
    Route::get('/revista-adventista/acervo', [RevistaAdventistaArticleController::class, 'archiveIndex'])->name('revista-adventista-acervo.index');
    Route::patch('/revista-adventista/acervo/edicao/{revistaAdventistaEdition}/active', [RevistaAdventistaArticleController::class, 'setEditionActive'])
        ->name('revista-adventista-acervo.edition.active')
        ->middleware('permission:news.manage');
    Route::delete('/revista-adventista/acervo/edicao/{revistaAdventistaEdition}', [RevistaAdventistaArticleController::class, 'destroyEdition'])
        ->name('revista-adventista-acervo.edition.destroy')
        ->middleware('permission:news.manage');
    Route::post('/revista-adventista/acervo/sincronizar', [RevistaAdventistaArticleController::class, 'syncArchive'])
        ->name('revista-adventista-acervo.sync-archive')
        ->middleware('permission:news.manage');

    // Missão — rotas literais de conteúdo antes do wildcard {missionVolunteer}
    Route::get('/missao/gestao', [MissionVolunteerController::class, 'index'])->name('mission.index')->middleware('permission:mission.view|mission.manage');
    Route::get('/missao/gestao/tailandia-mianmar', [MissionTripRegistrationController::class, 'index'])->name('mission.trip-registrations.index')->middleware('permission:mission.view|mission.manage');
    Route::get('/missao/gestao/tailandia-mianmar/exportar', [MissionTripRegistrationController::class, 'export'])->name('mission.trip-registrations.export')->middleware('permission:mission.view|mission.manage');
    Route::post('/missao/gestao/comunicacao', [MissionVolunteerController::class, 'sendBroadcast'])->name('mission.broadcast.store')->middleware('permission:mission.manage');

    Route::get('/missao/gestao/eventos', [\App\Http\Controllers\MissionContentController::class, 'eventsIndex'])->name('mission.content.events')->middleware('permission:mission.view|mission.manage');
    Route::post('/missao/gestao/eventos', [\App\Http\Controllers\MissionContentController::class, 'storeEvent'])->name('mission.content.events.store')->middleware('permission:mission.manage');
    Route::put('/missao/gestao/eventos/{missionEvent}', [\App\Http\Controllers\MissionContentController::class, 'updateEvent'])->name('mission.content.events.update')->middleware('permission:mission.manage');
    Route::delete('/missao/gestao/eventos/{missionEvent}', [\App\Http\Controllers\MissionContentController::class, 'destroyEvent'])->name('mission.content.events.destroy')->middleware('permission:mission.manage');

    Route::get('/missao/gestao/recados', [\App\Http\Controllers\MissionContentController::class, 'messagesIndex'])->name('mission.content.messages')->middleware('permission:mission.view|mission.manage');
    Route::post('/missao/gestao/recados', [\App\Http\Controllers\MissionContentController::class, 'storeMessage'])->name('mission.content.messages.store')->middleware('permission:mission.manage');
    Route::patch('/missao/gestao/recados/{missionMessage}/visibilidade', [\App\Http\Controllers\MissionContentController::class, 'toggleMessageVisibility'])->name('mission.content.messages.visibility')->middleware('permission:mission.manage');
    Route::patch('/missao/gestao/recados/{missionMessage}/aprovar', [\App\Http\Controllers\MissionContentController::class, 'approveMessage'])->name('mission.content.messages.approve')->middleware('permission:mission.manage');
    Route::patch('/missao/gestao/recados/{missionMessage}/rejeitar', [\App\Http\Controllers\MissionContentController::class, 'rejectMessage'])->name('mission.content.messages.reject')->middleware('permission:mission.manage');
    Route::delete('/missao/gestao/recados/{missionMessage}', [\App\Http\Controllers\MissionContentController::class, 'destroyMessage'])->name('mission.content.messages.destroy')->middleware('permission:mission.manage');

    Route::get('/missao/gestao/quem-somos', [\App\Http\Controllers\MissionContentController::class, 'aboutIndex'])->name('mission.content.about')->middleware('permission:mission.view|mission.manage');
    Route::put('/missao/gestao/quem-somos', [\App\Http\Controllers\MissionContentController::class, 'updateAbout'])->name('mission.content.about.update')->middleware('permission:mission.manage');

    Route::get('/missao/gestao/configuracao', [\App\Http\Controllers\MissionContentController::class, 'settingsIndex'])->name('mission.content.settings')->middleware('permission:mission.view|mission.manage');
    Route::put('/missao/gestao/configuracao', [\App\Http\Controllers\MissionContentController::class, 'updateSettings'])->name('mission.content.settings.update')->middleware('permission:mission.manage');

    Route::get('/missao/gestao/usuarios', [MissionVolunteerController::class, 'usersIndex'])->name('mission.users.index')->middleware('permission:mission.view|mission.manage');
    Route::patch('/missao/gestao/usuarios/{user}', [MissionVolunteerController::class, 'updatePhaseLeader'])->name('mission.users.update')->middleware('permission:mission.manage');

    Route::get('/missao/gestao/mural', [\App\Http\Controllers\MissionContentController::class, 'wallIndex'])->name('mission.content.wall')->middleware('permission:mission.view|mission.manage');
    Route::post('/missao/gestao/mural', [\App\Http\Controllers\MissionContentController::class, 'storeWallItem'])->name('mission.content.wall.store')->middleware('permission:mission.manage');
    Route::put('/missao/gestao/mural/{missionWallItem}', [\App\Http\Controllers\MissionContentController::class, 'updateWallItem'])->name('mission.content.wall.update')->middleware('permission:mission.manage');
    Route::delete('/missao/gestao/mural/{missionWallItem}', [\App\Http\Controllers\MissionContentController::class, 'destroyWallItem'])->name('mission.content.wall.destroy')->middleware('permission:mission.manage');

    Route::get('/missao/gestao/{missionVolunteer}', [MissionVolunteerController::class, 'show'])->name('mission.show')->middleware('permission:mission.view|mission.manage');
    Route::get('/missao/gestao/{missionVolunteer}/detalhe', [MissionVolunteerController::class, 'detail'])->name('mission.volunteers.detail')->middleware('permission:mission.view|mission.manage');
    Route::patch('/missao/gestao/{missionVolunteer}/fase', [MissionVolunteerController::class, 'updatePhase'])->name('mission.volunteers.phase')->middleware('permission:mission.view|mission.manage');
    Route::patch('/missao/gestao/{missionVolunteer}', [MissionVolunteerController::class, 'update'])->name('mission.volunteers.update')->middleware('permission:mission.view|mission.manage');
    Route::post('/missao/gestao/{missionVolunteer}/notas', [MissionVolunteerController::class, 'storeNote'])->name('mission.volunteers.notes.store')->middleware('permission:mission.view|mission.manage');
    Route::delete('/missao/gestao/{missionVolunteer}', [MissionVolunteerController::class, 'destroy'])->name('mission.volunteers.destroy')->middleware('permission:mission.manage');
    Route::post('/missao/fases', [MissionVolunteerController::class, 'storeStage'])->name('mission.phases.store')->middleware('permission:mission.manage');
    Route::put('/missao/fases/{phase}', [MissionVolunteerController::class, 'updateStageMeta'])->name('mission.phases.update')->middleware('permission:mission.manage');
    Route::delete('/missao/fases/{phase}', [MissionVolunteerController::class, 'destroyStage'])->name('mission.phases.destroy')->middleware('permission:mission.manage');

    // Eventos — ver exige events.view|events.manage; criar/editar/excluir exige events.manage
    Route::get('/events', [EventController::class, 'index'])->name('events.index')->middleware('permission:events.view|events.manage');
    Route::post('/events', [EventController::class, 'store'])->name('events.store')->middleware('permission:events.manage');
    Route::put('/events/{event}', [EventController::class, 'update'])->name('events.update')->middleware('permission:events.manage');
    Route::patch('/events/{event}/active', [EventController::class, 'setActive'])->name('events.active')->middleware('permission:events.manage');
    Route::delete('/events/{event}', [EventController::class, 'destroy'])->name('events.destroy')->middleware('permission:events.manage');
    /** admin|super_admin: hasAnyRole; resto: permissão culto.manage (evita 403 quando Gate/BD ficam desalinhados). */
    Route::post('/mobile/campanhas/{donationCampaign}/receipt', [DonationCampaignMobileController::class, 'uploadReceipt'])
        ->name('mobile.campaigns.receipt');
    Route::post('/mobile/campanhas/{donationCampaign}/donate', [DonationCampaignMobileController::class, 'confirmDonation'])
        ->name('mobile.campaigns.donate');
    Route::get('/mobile/minhas-doacoes', [DonationCampaignMobileController::class, 'myDonations'])
        ->name('mobile.campaigns.my-donations');
    Route::post('/mobile/minhas-doacoes/{campaignDonation}/reclamacao', [DonationCampaignMobileController::class, 'submitDispute'])
        ->name('mobile.campaigns.dispute');
    Route::post('/mobile/doacoes/{charityCampaign}/receipt', [CharityCampaignMobileController::class, 'uploadReceipt'])
        ->name('mobile.donations.receipt');
    Route::post('/mobile/doacoes/{charityCampaign}/donate', [CharityCampaignMobileController::class, 'confirmDonation'])
        ->name('mobile.donations.donate');
    Route::post('/mobile/doacoes/{charityCampaign}/itens/promessa', [CharityCampaignMobileController::class, 'pledgeItemDonation'])
        ->name('mobile.donations.items.pledge');
    Route::get('/mobile/doacoes/minhas', [CharityCampaignMobileController::class, 'myDonations'])
        ->name('mobile.donations.my-donations');
    Route::post('/mobile/doacoes/minhas/{charityDonation}/reclamacao', [CharityCampaignMobileController::class, 'submitDispute'])
        ->name('mobile.donations.dispute');

    Route::get('/campanhas', [DonationCampaignController::class, 'index'])
        ->name('donation-campaigns.index')
        ->middleware('permission:campaigns.view|campaigns.manage|finance.view');
    Route::post('/campanhas', [DonationCampaignController::class, 'store'])
        ->name('donation-campaigns.store')
        ->middleware('permission:campaigns.manage');
    Route::put('/campanhas/{donationCampaign}', [DonationCampaignController::class, 'update'])
        ->name('donation-campaigns.update')
        ->middleware('permission:campaigns.manage');
    Route::delete('/campanhas/{donationCampaign}', [DonationCampaignController::class, 'destroy'])
        ->name('donation-campaigns.destroy')
        ->middleware('permission:campaigns.manage');
    Route::get('/campanhas/{donationCampaign}/doacoes', [DonationCampaignController::class, 'donationsJson'])
        ->name('donation-campaigns.donations')
        ->middleware('permission:campaigns.view|campaigns.manage|finance.view');
    Route::post('/campanhas/{donationCampaign}/doacoes/manual', [CampaignDonationController::class, 'storeManual'])
        ->name('donation-campaigns.donations.manual')
        ->middleware('permission:campaigns.manage|finance.view');

    Route::patch('/campanhas/{donationCampaign}/historia', [DonationCampaignMediaController::class, 'updateStory'])
        ->name('donation-campaigns.story.update')
        ->middleware('permission:campaigns.manage|finance.view');
    Route::patch('/campanhas/{donationCampaign}/caixa-fixo', [DonationCampaignMediaController::class, 'updateCaixaFixoStory'])
        ->name('donation-campaigns.caixa-fixo.update')
        ->middleware('permission:campaigns.manage|finance.view');
    Route::patch('/campanhas/{donationCampaign}/construcao', [DonationCampaignMediaController::class, 'updateConstrucaoStory'])
        ->name('donation-campaigns.construcao.update')
        ->middleware('permission:campaigns.manage|finance.view');
    Route::post('/campanhas/{donationCampaign}/fotos', [DonationCampaignMediaController::class, 'storePhoto'])
        ->name('donation-campaigns.photos.store')
        ->middleware('permission:campaigns.manage|finance.view');
    Route::delete('/campanhas/{donationCampaign}/fotos/{photo}', [DonationCampaignMediaController::class, 'destroyPhoto'])
        ->name('donation-campaigns.photos.destroy')
        ->middleware('permission:campaigns.manage|finance.view');
    Route::post('/campanhas/{donationCampaign}/agradecimento/publicar', [DonationCampaignMediaController::class, 'publishThanks'])
        ->name('donation-campaigns.thanks.publish')
        ->middleware('permission:campaigns.manage|finance.view');
    Route::post('/campanhas/{donationCampaign}/agradecimento/ocultar', [DonationCampaignMediaController::class, 'unpublishThanks'])
        ->name('donation-campaigns.thanks.unpublish')
        ->middleware('permission:campaigns.manage|finance.view');

    Route::get('/doacoes', [CharityCampaignController::class, 'index'])
        ->name('charity-campaigns.index')
        ->middleware('permission:donations.view|donations.manage|finance.view');
    Route::post('/doacoes', [CharityCampaignController::class, 'store'])
        ->name('charity-campaigns.store')
        ->middleware('permission:donations.manage');
    Route::put('/doacoes/{charityCampaign}', [CharityCampaignController::class, 'update'])
        ->name('charity-campaigns.update')
        ->middleware('permission:donations.manage');
    Route::delete('/doacoes/{charityCampaign}', [CharityCampaignController::class, 'destroy'])
        ->name('charity-campaigns.destroy')
        ->middleware('permission:donations.manage');
    Route::get('/doacoes/{charityCampaign}/registros', [CharityCampaignController::class, 'donationsJson'])
        ->name('charity-campaigns.donations')
        ->middleware('permission:donations.view|donations.manage|finance.view');
    Route::post('/doacoes/{charityCampaign}/registros/manual', [CharityDonationController::class, 'storeManual'])
        ->name('charity-campaigns.donations.manual')
        ->middleware('permission:donations.manage|finance.view');
    Route::patch('/doacoes/itens/{charityItemDonation}', [CharityItemDonationController::class, 'update'])
        ->name('charity-campaigns.items.update')
        ->middleware('permission:donations.manage|finance.view');
    Route::post('/doacoes/itens/{charityItemDonation}/receber', [CharityItemDonationController::class, 'receive'])
        ->name('charity-campaigns.items.receive')
        ->middleware('permission:donations.manage|finance.view');
    Route::post('/doacoes/itens/{charityItemDonation}/cancelar', [CharityItemDonationController::class, 'cancel'])
        ->name('charity-campaigns.items.cancel')
        ->middleware('permission:donations.manage|finance.view');
    Route::patch('/doacoes/{charityCampaign}/historia', [CharityCampaignMediaController::class, 'updateStory'])
        ->name('charity-campaigns.story.update')
        ->middleware('permission:donations.manage|finance.view');
    Route::post('/doacoes/{charityCampaign}/fotos', [CharityCampaignMediaController::class, 'storePhoto'])
        ->name('charity-campaigns.photos.store')
        ->middleware('permission:donations.manage|finance.view');
    Route::delete('/doacoes/{charityCampaign}/fotos/{photo}', [CharityCampaignMediaController::class, 'destroyPhoto'])
        ->name('charity-campaigns.photos.destroy')
        ->middleware('permission:donations.manage|finance.view');
    Route::post('/doacoes/{charityCampaign}/agradecimento/publicar', [CharityCampaignMediaController::class, 'publishThanks'])
        ->name('charity-campaigns.thanks.publish')
        ->middleware('permission:donations.manage|finance.view');
    Route::post('/doacoes/{charityCampaign}/agradecimento/ocultar', [CharityCampaignMediaController::class, 'unpublishThanks'])
        ->name('charity-campaigns.thanks.unpublish')
        ->middleware('permission:donations.manage|finance.view');

    Route::get('/campanhas-itens', [DonationItemCampaignController::class, 'index'])
        ->name('donation-item-campaigns.index')
        ->middleware('permission:campaigns.view|campaigns.manage');
    Route::post('/campanhas-itens', [DonationItemCampaignController::class, 'store'])
        ->name('donation-item-campaigns.store')
        ->middleware('permission:campaigns.manage');
    Route::put('/campanhas-itens/{donationItemCampaign}', [DonationItemCampaignController::class, 'update'])
        ->name('donation-item-campaigns.update')
        ->middleware('permission:campaigns.manage');
    Route::delete('/campanhas-itens/{donationItemCampaign}', [DonationItemCampaignController::class, 'destroy'])
        ->name('donation-item-campaigns.destroy')
        ->middleware('permission:campaigns.manage');

    Route::get('/financeiro', [TreasurerDashboardController::class, 'index'])
        ->name('finance.treasurer')
        ->middleware('permission:finance.view');
    Route::get('/financeiro/doacao', [CharityTreasurerDashboardController::class, 'index'])
        ->name('finance.charity-donations.index')
        ->middleware('permission:finance.view');
    Route::patch('/financeiro/doacao/{charityDonation}', [CharityDonationController::class, 'updateAmount'])
        ->name('finance.charity-donations.update')
        ->middleware('permission:finance.view|donations.manage');
    Route::post('/financeiro/doacao/{charityDonation}/resolver-reclamacao', [CharityDonationController::class, 'resolveDispute'])
        ->name('finance.charity-donations.resolve-dispute')
        ->middleware('permission:finance.view|donations.manage');

    Route::get('/conexao-talentos', [TalentConnectionAdminController::class, 'dashboard'])
        ->name('talents.admin.dashboard')
        ->middleware('permission:talents.treasurer|talents.moderate|finance.view');
    Route::get('/conexao-talentos/publicacoes', [TalentConnectionAdminController::class, 'listings'])
        ->name('talents.admin.listings')
        ->middleware('permission:talents.moderate');
    Route::post('/conexao-talentos/publicacoes', [TalentConnectionAdminController::class, 'storeListing'])
        ->name('talents.admin.listings.store')
        ->middleware('permission:talents.moderate');
    Route::put('/conexao-talentos/publicacoes/{talentListing}', [TalentConnectionAdminController::class, 'updateListing'])
        ->name('talents.admin.listings.update')
        ->middleware('permission:talents.moderate');
    Route::post('/conexao-talentos/publicacoes/{talentListing}/moderar', [TalentConnectionAdminController::class, 'moderateListing'])
        ->name('talents.admin.listings.moderate')
        ->middleware('permission:talents.moderate');
    Route::get('/conexao-talentos/denuncias', [TalentConnectionAdminController::class, 'reports'])
        ->name('talents.admin.reports')
        ->middleware('permission:talents.moderate|talents.treasurer|finance.view');
    Route::patch('/conexao-talentos/denuncias/{talentReport}', [TalentConnectionAdminController::class, 'resolveReport'])
        ->name('talents.admin.reports.resolve')
        ->middleware('permission:talents.moderate');
    Route::get('/conexao-talentos/categorias', [TalentConnectionAdminController::class, 'categories'])
        ->name('talents.admin.categories')
        ->middleware('permission:talents.moderate');
    Route::post('/conexao-talentos/categorias', [TalentConnectionAdminController::class, 'storeCategory'])
        ->name('talents.admin.categories.store')
        ->middleware('permission:talents.moderate');
    Route::put('/conexao-talentos/categorias/{talentCategory}', [TalentConnectionAdminController::class, 'updateCategory'])
        ->name('talents.admin.categories.update')
        ->middleware('permission:talents.moderate');
    Route::get('/conexao-talentos/logs', [TalentConnectionAdminController::class, 'logs'])
        ->name('talents.admin.logs')
        ->middleware('permission:talents.moderate');

    Route::get('/doar-talentos', [SharedTalentAdminController::class, 'dashboard'])
        ->name('shared-talents.admin.dashboard')
        ->middleware('permission:shared_talents.moderate|shared_talents.manage');
    Route::get('/doar-talentos/publicacoes', [SharedTalentAdminController::class, 'listings'])
        ->name('shared-talents.admin.listings')
        ->middleware('permission:shared_talents.moderate|shared_talents.manage');
    Route::post('/doar-talentos/publicacoes', [SharedTalentAdminController::class, 'storeListing'])
        ->name('shared-talents.admin.listings.store')
        ->middleware('permission:shared_talents.moderate|shared_talents.manage');
    Route::put('/doar-talentos/publicacoes/{sharedTalentListing}', [SharedTalentAdminController::class, 'updateListing'])
        ->name('shared-talents.admin.listings.update')
        ->middleware('permission:shared_talents.moderate|shared_talents.manage');
    Route::post('/doar-talentos/publicacoes/{sharedTalentListing}/moderar', [SharedTalentAdminController::class, 'moderateListing'])
        ->name('shared-talents.admin.listings.moderate')
        ->middleware('permission:shared_talents.moderate|shared_talents.manage');
    Route::get('/doar-talentos/inscricoes', [SharedTalentAdminController::class, 'enrollments'])
        ->name('shared-talents.admin.enrollments')
        ->middleware('permission:shared_talents.moderate|shared_talents.manage');
    Route::get('/doar-talentos/denuncias', [SharedTalentAdminController::class, 'reports'])
        ->name('shared-talents.admin.reports')
        ->middleware('permission:shared_talents.moderate|shared_talents.manage');
    Route::patch('/doar-talentos/denuncias/{sharedTalentReport}', [SharedTalentAdminController::class, 'resolveReport'])
        ->name('shared-talents.admin.reports.resolve')
        ->middleware('permission:shared_talents.moderate|shared_talents.manage');
    Route::get('/doar-talentos/categorias', [SharedTalentAdminController::class, 'categories'])
        ->name('shared-talents.admin.categories')
        ->middleware('permission:shared_talents.moderate|shared_talents.manage');
    Route::post('/doar-talentos/categorias', [SharedTalentAdminController::class, 'storeCategory'])
        ->name('shared-talents.admin.categories.store')
        ->middleware('permission:shared_talents.moderate|shared_talents.manage');
    Route::put('/doar-talentos/categorias/{sharedTalentCategory}', [SharedTalentAdminController::class, 'updateCategory'])
        ->name('shared-talents.admin.categories.update')
        ->middleware('permission:shared_talents.moderate|shared_talents.manage');
    Route::get('/doar-talentos/avaliacoes', [SharedTalentAdminController::class, 'reviews'])
        ->name('shared-talents.admin.reviews')
        ->middleware('permission:shared_talents.moderate|shared_talents.manage');
    Route::post('/doar-talentos/avaliacoes/{sharedTalentReview}/ocultar', [SharedTalentAdminController::class, 'hideReview'])
        ->name('shared-talents.admin.reviews.hide')
        ->middleware('permission:shared_talents.moderate|shared_talents.manage');
    Route::get('/doar-talentos/logs', [SharedTalentAdminController::class, 'logs'])
        ->name('shared-talents.admin.logs')
        ->middleware('permission:shared_talents.manage');

    Route::patch('/financeiro/doacoes/{campaignDonation}', [CampaignDonationController::class, 'updateAmount'])
        ->name('finance.donations.update')
        ->middleware('permission:finance.view|campaigns.manage');
    Route::post('/financeiro/doacoes/{campaignDonation}/resolver-reclamacao', [CampaignDonationController::class, 'resolveDispute'])
        ->name('finance.donations.resolve-dispute')
        ->middleware('permission:finance.view|campaigns.manage');

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

    Route::get('/ia-foto', [FaceAiController::class, 'index'])->name('face-ai.index')->middleware('permission:photos.manage');
    Route::post('/ia-foto', [FaceAiController::class, 'store'])->name('face-ai.store')->middleware('permission:photos.manage');
    Route::delete('/ia-foto', [FaceAiController::class, 'destroy'])->name('face-ai.destroy')->middleware('permission:photos.manage');
    Route::post('/ia-foto/drive', [FaceAiController::class, 'listDriveImages'])->name('face-ai.drive-list')->middleware('permission:photos.manage');
    Route::get('/ia-foto/drive/{fileId}', [FaceAiController::class, 'proxyDriveImage'])->name('face-ai.drive-proxy')->middleware('permission:photos.manage');
    Route::get('/comunidades', [CommunityController::class, 'index'])->name('communities.index')
        ->middleware('permission:communities.view|communities.manage');
    Route::post('/comunidades', [CommunityController::class, 'store'])->name('communities.store')
        ->middleware('permission:communities.manage');
    Route::put('/comunidades/{churchCommunity}', [CommunityController::class, 'update'])->name('communities.update')
        ->middleware('permission:communities.manage');
    Route::delete('/comunidades/{churchCommunity}', [CommunityController::class, 'destroy'])->name('communities.destroy')
        ->middleware('permission:communities.manage');

    Route::get('/biblioteca', [LibraryBookController::class, 'index'])->name('library-books.index')->middleware('permission:library.manage');
    Route::post('/biblioteca', [LibraryBookController::class, 'store'])->name('library-books.store')->middleware('permission:library.manage');
    Route::put('/biblioteca/{libraryBook}', [LibraryBookController::class, 'update'])->name('library-books.update')->middleware('permission:library.manage');
    Route::delete('/biblioteca/{libraryBook}', [LibraryBookController::class, 'destroy'])->name('library-books.destroy')->middleware('permission:library.manage');
    Route::post('/biblioteca/egw/sincronizar', [LibraryBookController::class, 'syncEgw'])->name('library-books.egw.sync')->middleware('permission:library.manage');
    Route::get('/caixa-promessa/versiculos', [VersiculoCaixinhaController::class, 'index'])->name('promise-box-verses.index')->middleware('permission:library.manage');
    Route::post('/caixa-promessa/versiculos', [VersiculoCaixinhaController::class, 'store'])->name('promise-box-verses.store')->middleware('permission:library.manage');
    Route::put('/caixa-promessa/versiculos/{versiculoCaixinha}', [VersiculoCaixinhaController::class, 'update'])->name('promise-box-verses.update')->middleware('permission:library.manage');
    Route::delete('/caixa-promessa/versiculos/{versiculoCaixinha}', [VersiculoCaixinhaController::class, 'destroy'])->name('promise-box-verses.destroy')->middleware('permission:library.manage');
    Route::post('/caixa-promessa/versiculos/importar-populares', [VersiculoCaixinhaController::class, 'importPopular'])->name('promise-box-verses.preview-popular')->middleware('permission:library.manage');
    Route::post('/caixa-promessa/versiculos/varrer-biblia', [VersiculoCaixinhaController::class, 'scanBible'])->name('promise-box-verses.preview-scan')->middleware('permission:library.manage');
    Route::post('/caixa-promessa/versiculos/ia/preview', [VersiculoCaixinhaController::class, 'aiPreview'])->name('promise-box-verses.ai-preview')->middleware('permission:library.manage');
    Route::post('/caixa-promessa/versiculos/importar-selecionados', [VersiculoCaixinhaController::class, 'importSelected'])->name('promise-box-verses.import-selected')->middleware('permission:library.manage');
    Route::get('/services', function () {
        return Inertia::render('Dashboard');
    })->name('services.index');
    Route::get('/acervo', [AcervoController::class, 'index'])->name('acervo.index')->middleware('permission:series.manage');
    Route::get('/settings', [SettingsController::class, 'index'])->name('settings.index')->middleware('role_or_permission:super_admin|library.manage|campaigns.manage|finance.view');
    Route::get('/settings/funcionalidades', [SettingsController::class, 'appFeatures'])
        ->name('settings.app-features.index')
        ->middleware('role:super_admin|admin');
    Route::put('/settings/funcionalidades', [SettingsController::class, 'updateAppFeatures'])
        ->name('settings.app-features.update')
        ->middleware('role:super_admin|admin');
    Route::put('/settings/solicitations-handler', [SettingsController::class, 'updateSolicitationsHandler'])
        ->name('settings.solicitations-handler.update')
        ->middleware('role:super_admin');
    Route::put('/settings/youtube-live', [SettingsController::class, 'updateYoutubeLive'])
        ->name('settings.youtube-live.update')
        ->middleware('role:super_admin');
    Route::put('/settings/library/meditation', [SettingsController::class, 'updateLibraryMeditationUrl'])
        ->name('settings.library-meditation.update')
        ->middleware('role_or_permission:super_admin|library.manage');
    Route::post('/settings/library/sunset-meditation', [SettingsController::class, 'updateLibrarySunsetMeditationPdf'])
        ->name('settings.library-sunset-meditation.update')
        ->middleware('role_or_permission:super_admin|library.manage');
    Route::put('/settings/library/lesson', [SettingsController::class, 'updateLibraryLessonUrl'])
        ->name('settings.library-lesson.update')
        ->middleware('role_or_permission:super_admin|library.manage');
    Route::put('/settings/treasurer-email', [SettingsController::class, 'updateTreasurerEmail'])
        ->name('settings.treasurer-email.update')
        ->middleware('role_or_permission:super_admin|admin|campaigns.manage|finance.view');
    Route::put('/settings/talents-moderator-email', [SettingsController::class, 'updateTalentsModeratorEmail'])
        ->name('settings.talents-moderator-email.update')
        ->middleware('role_or_permission:super_admin|admin|talents.moderate');
    Route::post('/acervo', [AcervoController::class, 'store'])->name('acervo.store')->middleware('permission:series.manage');
    Route::put('/acervo/{acervo}', [AcervoController::class, 'update'])->name('acervo.update')->middleware('permission:series.manage');
    Route::delete('/acervo/{acervo}', [AcervoController::class, 'destroy'])->name('acervo.destroy')->middleware('permission:series.manage');
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
    /** Feed leve para o poller do sino (JSON) — evita visitas Inertia que podem “resetar” modais. */
    Route::get('/notifications/feed', \App\Http\Controllers\NotificationFeedController::class)
        ->name('notifications.feed');
    Route::get('/mobile/settings', [MobileController::class, 'settings'])->name('mobile.settings');
    Route::post('/notifications/inbox/read', [MobileController::class, 'markInboxNotificationRead'])
        ->name('notifications.inbox.read');
    Route::post('/notifications/inbox/read-all', [MobileController::class, 'markAllInboxNotificationsRead'])
        ->name('notifications.inbox.read-all');
    Route::post('/notifications/remove', [MobileController::class, 'removeNotification'])
        ->name('notifications.remove');

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

    // Enquetes (membro — login obrigatório)
    Route::get('/mobile/enquetes', [PollMobileController::class, 'index'])->name('mobile.polls.index');
    Route::get('/mobile/enquetes/{poll}', [PollMobileController::class, 'show'])->name('mobile.polls.show');
    Route::post('/mobile/enquetes/{poll}/votar', [PollMobileController::class, 'vote'])
        ->middleware('throttle:30,1')
        ->name('mobile.polls.vote');

    // CONVIVA — check-in do aluno (sábado)
    Route::get('/mobile/conviva', [\App\Http\Controllers\ConvivaCheckinController::class, 'show'])
        ->name('mobile.conviva.checkin');
    Route::post('/mobile/conviva/checkin', [\App\Http\Controllers\ConvivaCheckinController::class, 'store'])
        ->middleware('throttle:30,1')
        ->name('mobile.conviva.checkin.store');

    // Solicitações (membro — requer login para enviar/acompanhar)
    Route::get('/mobile/talentos', [TalentConnectionController::class, 'index'])->name('mobile.talents.index');
    Route::get('/mobile/talentos/minhas-publicacoes', [TalentConnectionController::class, 'myListings'])->name('mobile.talents.my-listings');
    Route::get('/mobile/talentos/meus-interesses', [TalentConnectionController::class, 'myInterests'])->name('mobile.talents.my-interests');
    Route::post('/mobile/talentos', [TalentConnectionController::class, 'store'])->name('mobile.talents.store');
    Route::put('/mobile/talentos/{talentListing}', [TalentConnectionController::class, 'update'])->name('mobile.talents.update');
    Route::patch('/mobile/talentos/{talentListing}/status', [TalentConnectionController::class, 'updateStatus'])->name('mobile.talents.status');
    Route::delete('/mobile/talentos/{talentListing}', [TalentConnectionController::class, 'destroy'])->name('mobile.talents.destroy');
    Route::get('/mobile/talentos/{talentListing}', [TalentConnectionController::class, 'show'])->name('mobile.talents.show');
    Route::post('/mobile/talentos/{talentListing}/interesse', [TalentConnectionController::class, 'expressInterest'])->name('mobile.talents.interest');
    Route::post('/mobile/talentos/{talentListing}/denuncia', [TalentConnectionController::class, 'storeReport'])->name('mobile.talents.report');
    Route::patch('/mobile/talentos/interesses/{talentInterest}/status', [TalentConnectionController::class, 'updateInterestStatus'])->name('mobile.talents.interest.status');
    Route::post('/mobile/talentos/interesses/{talentInterest}/mensagens', [TalentConnectionController::class, 'storeMessage'])->name('mobile.talents.interest.messages');
    Route::post('/mobile/talentos/interesses/{talentInterest}/avaliacao', [TalentConnectionController::class, 'storeReview'])->name('mobile.talents.interest.review');

    Route::get('/mobile/doar-talentos', [SharedTalentController::class, 'index'])->name('mobile.shared-talents.index');
    Route::get('/mobile/doar-talentos/minhas-publicacoes', [SharedTalentController::class, 'myListings'])->name('mobile.shared-talents.my-listings');
    Route::get('/mobile/doar-talentos/minhas-inscricoes', [SharedTalentController::class, 'myEnrollments'])->name('mobile.shared-talents.my-enrollments');
    Route::get('/mobile/doar-talentos/participantes', [SharedTalentController::class, 'enrollments'])->name('mobile.shared-talents.enrollments');
    Route::post('/mobile/doar-talentos', [SharedTalentController::class, 'store'])->name('mobile.shared-talents.store');
    Route::put('/mobile/doar-talentos/{sharedTalentListing}', [SharedTalentController::class, 'update'])->name('mobile.shared-talents.update');
    Route::patch('/mobile/doar-talentos/{sharedTalentListing}/status', [SharedTalentController::class, 'updateStatus'])->name('mobile.shared-talents.status');
    Route::get('/mobile/doar-talentos/{sharedTalentListing}', [SharedTalentController::class, 'show'])->name('mobile.shared-talents.show');
    Route::post('/mobile/doar-talentos/{sharedTalentListing}/inscricao', [SharedTalentController::class, 'enroll'])->name('mobile.shared-talents.enroll');
    Route::post('/mobile/doar-talentos/{sharedTalentListing}/denuncia', [SharedTalentController::class, 'storeReport'])->name('mobile.shared-talents.report');
    Route::post('/mobile/doar-talentos/{sharedTalentListing}/comunicados', [SharedTalentController::class, 'storeAnnouncement'])->name('mobile.shared-talents.announcements');
    Route::patch('/mobile/doar-talentos/inscricoes/{sharedTalentEnrollment}/status', [SharedTalentController::class, 'updateEnrollmentStatus'])->name('mobile.shared-talents.enrollment.status');
    Route::post('/mobile/doar-talentos/inscricoes/{sharedTalentEnrollment}/mensagens', [SharedTalentController::class, 'storeMessage'])->name('mobile.shared-talents.enrollment.messages');
    Route::post('/mobile/doar-talentos/inscricoes/{sharedTalentEnrollment}/avaliacao', [SharedTalentController::class, 'storeReview'])->name('mobile.shared-talents.enrollment.review');

    Route::get('/mobile/solicitacoes/meus-pedidos', [MobileChurchSolicitationController::class, 'mine'])->name('mobile.solicitations.mine');
    Route::get('/mobile/solicitacoes/novo/{type}', [MobileChurchSolicitationController::class, 'create'])->name('mobile.solicitations.create');
    Route::post('/mobile/solicitacoes', [MobileChurchSolicitationController::class, 'store'])->name('mobile.solicitations.store');
    Route::get('/mobile/solicitacoes/{solicitation}', [MobileChurchSolicitationController::class, 'show'])->name('mobile.solicitations.show');
    Route::patch('/mobile/solicitacoes/{solicitation}', [MobileChurchSolicitationController::class, 'updateAsMember'])->name('mobile.solicitations.update');
    Route::post('/mobile/solicitacoes/{solicitation}/messages', [MobileChurchSolicitationController::class, 'sendMessage'])->name('mobile.solicitations.messages.store');
    Route::post('/mobile/solicitacoes/{solicitation}/finalizar-conversa-lider', [MobileChurchSolicitationController::class, 'finalizeLeaderChat'])->name('mobile.solicitations.leader-chat.finalize');
    Route::post('/mobile/solicitacoes/{solicitation}/ocultar-para-mim', [MobileChurchSolicitationController::class, 'hideFromMemberApp'])->name('mobile.solicitations.hide-from-member');

    // NS Conecta (domínio church_conversations) — ações autenticadas
    Route::post('/mobile/ns-whats', [\App\Http\Controllers\MobileNsWhatsController::class, 'store'])->name('mobile.ns-whats.store');
    Route::get('/mobile/ns-whats/{conversation}', [\App\Http\Controllers\MobileNsWhatsController::class, 'show'])->name('mobile.ns-whats.show');
    Route::post('/mobile/ns-whats/{conversation}/messages', [\App\Http\Controllers\MobileNsWhatsController::class, 'sendMessage'])->name('mobile.ns-whats.messages.store');
    Route::patch('/mobile/ns-whats/mensagens/{message}', [\App\Http\Controllers\MobileNsWhatsController::class, 'editMessage'])->name('mobile.ns-whats.messages.edit');
    Route::post('/mobile/ns-whats/mensagens/{message}/ocultar', [\App\Http\Controllers\MobileNsWhatsController::class, 'hideMessage'])->name('mobile.ns-whats.messages.hide');
    Route::post('/mobile/ns-whats/{conversation}/arquivar', [\App\Http\Controllers\MobileNsWhatsController::class, 'archive'])->name('mobile.ns-whats.archive');
    Route::post('/mobile/ns-whats/{conversation}/desarquivar', [\App\Http\Controllers\MobileNsWhatsController::class, 'unarchive'])->name('mobile.ns-whats.unarchive');
    Route::post('/mobile/ns-whats/{conversation}/ler', [\App\Http\Controllers\MobileNsWhatsController::class, 'markRead'])->name('mobile.ns-whats.read');

    Route::get('/mobile/aniversariantes', [\App\Http\Controllers\MobileLeaderBirthdaysController::class, 'index'])
        ->name('mobile.leader.birthdays');

    Route::get('/mobile/ns-whats-lider', [\App\Http\Controllers\MobileNsWhatsLeaderController::class, 'index'])->name('mobile.ns-whats.leader.index');
    Route::get('/mobile/ns-whats-lider/{conversation}', [\App\Http\Controllers\MobileNsWhatsLeaderController::class, 'show'])->name('mobile.ns-whats.leader.show');
    Route::post('/mobile/ns-whats-lider/{conversation}/messages', [\App\Http\Controllers\MobileNsWhatsLeaderController::class, 'sendMessage'])->name('mobile.ns-whats.leader.messages.store');
    Route::post('/mobile/ns-whats-lider/{conversation}/assumir', [\App\Http\Controllers\MobileNsWhatsLeaderController::class, 'claim'])->name('mobile.ns-whats.leader.claim');
    Route::post('/mobile/ns-whats-lider/{conversation}/transferir', [\App\Http\Controllers\MobileNsWhatsLeaderController::class, 'transfer'])->name('mobile.ns-whats.leader.transfer');
    Route::post('/mobile/ns-whats-lider/{conversation}/encaminhar', [\App\Http\Controllers\MobileNsWhatsLeaderController::class, 'forward'])->name('mobile.ns-whats.leader.forward');
    Route::post('/mobile/ns-whats-lider/{conversation}/observacao', [\App\Http\Controllers\MobileNsWhatsLeaderController::class, 'internalNote'])->name('mobile.ns-whats.leader.internal');

    // Legado «Falar com líder» → NS Conecta
    Route::post('/mobile/contact', fn () => redirect()->route('mobile.ns-whats.index'))->name('mobile.contact.store');
    Route::get('/mobile/lider/conversas', fn () => redirect()->route('mobile.ns-whats.leader.index'))->name('mobile.leader-solicitations.index');
    Route::get('/mobile/lider/conversas/{solicitation}', fn () => redirect()->route('mobile.ns-whats.leader.index'))->name('mobile.leader-solicitations.show');
    Route::post('/mobile/lider/conversas/{solicitation}/messages', fn () => redirect()->route('mobile.ns-whats.leader.index'))->name('mobile.leader-solicitations.messages.store');
    Route::post('/mobile/lider/conversas/{solicitation}/finalizar', fn () => redirect()->route('mobile.ns-whats.leader.index'))->name('mobile.leader-solicitations.finalize');
    Route::post('/mobile/lider/conversas/{solicitation}/ocultar-para-mim', fn () => redirect()->route('mobile.ns-whats.leader.index'))->name('mobile.leader-solicitations.hide-from-leader');

    Route::get('/ns-whats', [\App\Http\Controllers\ConversationAdminController::class, 'index'])
        ->name('conversations.index')
        ->middleware('permission:conversations.view|conversations.manage|conversations.admin');
    Route::patch('/ns-whats/configuracoes', [\App\Http\Controllers\ConversationAdminController::class, 'updateSettings'])
        ->name('conversations.settings')
        ->middleware('permission:conversations.admin');
    Route::post('/ns-whats/{conversation}/messages', [\App\Http\Controllers\ConversationAdminController::class, 'sendMessage'])
        ->name('conversations.messages.store')
        ->middleware('permission:conversations.manage|conversations.admin');
    Route::post('/ns-whats/{conversation}/assumir', [\App\Http\Controllers\ConversationAdminController::class, 'claim'])
        ->name('conversations.claim')
        ->middleware('permission:conversations.manage|conversations.admin');
    Route::post('/ns-whats/{conversation}/transferir', [\App\Http\Controllers\ConversationAdminController::class, 'transfer'])
        ->name('conversations.transfer')
        ->middleware('permission:conversations.manage|conversations.admin');
    Route::post('/ns-whats/{conversation}/encaminhar', [\App\Http\Controllers\ConversationAdminController::class, 'forward'])
        ->name('conversations.forward')
        ->middleware('permission:conversations.manage|conversations.admin');

    // Solicitações — inbox (equipe). Admin/super_admin explícitos (evita 403 como em /culto)
    Route::get('/solicitacoes', [SolicitationAdminController::class, 'index'])
        ->name('solicitations.index')
        ->middleware('role_or_permission:super_admin|admin|solicitations.view|solicitations.manage');
    Route::get('/pedidos-batismo', [SolicitationAdminController::class, 'baptismIndex'])
        ->name('baptism-requests.index')
        ->middleware('role_or_permission:super_admin|admin|solicitations.view|solicitations.manage');
    Route::post('/pedidos-batismo/{solicitation}/arquivar', [SolicitationAdminController::class, 'archiveBaptism'])
        ->name('baptism-requests.archive')
        ->middleware('role_or_permission:super_admin|admin|solicitations.manage');
    Route::post('/pedidos-batismo/{solicitation}/desarquivar', [SolicitationAdminController::class, 'unarchiveBaptism'])
        ->name('baptism-requests.unarchive')
        ->middleware('role_or_permission:super_admin|admin|solicitations.manage');
    Route::post('/solicitacoes/atendimento-informal', [SolicitationAdminController::class, 'storeInformalPastoral'])
        ->name('solicitations.informal-pastoral.store')
        ->middleware('role_or_permission:super_admin|admin|solicitations.manage');
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
    Route::get('/solicitar-voluntario/{solicitation}/sugerir-voluntarios', [VolunteerRequestSolicitationController::class, 'suggestVolunteersStaff'])
        ->name('volunteer-requests.staff.suggest-volunteers')
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
    Route::post('/solicitar-voluntario/{solicitation}/desanexar-voluntario', [VolunteerRequestSolicitationController::class, 'detachVolunteerStaff'])
        ->name('volunteer-requests.staff.detach-volunteer')
        ->middleware('role_or_permission:super_admin|admin|solicitations.manage');
    Route::post('/solicitar-voluntario/{solicitation}/arquivar', [VolunteerRequestSolicitationController::class, 'archiveStaff'])
        ->name('volunteer-requests.staff.archive')
        ->middleware('role_or_permission:super_admin|admin|solicitations.manage');
    Route::post('/solicitar-voluntario/{solicitation}/desarquivar', [VolunteerRequestSolicitationController::class, 'unarchiveStaff'])
        ->name('volunteer-requests.staff.unarchive')
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
