<?php

use App\Http\Controllers\AcervoController;
use App\Http\Controllers\AppNotificationController;
use App\Http\Controllers\ChurchController;
use App\Http\Controllers\CultoController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\EventController;
use App\Http\Controllers\FaviconController;
use App\Http\Controllers\InventoryController;
use App\Http\Controllers\MemberController;
use App\Http\Controllers\MinistryController;
use App\Http\Controllers\MobileController;
use App\Http\Controllers\MusicaController;
use App\Http\Controllers\NewsController;
use App\Http\Controllers\PrayerRequestController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\RoleController;
use App\Http\Controllers\VariosController;
use App\Http\Controllers\VolunteerController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/favicon.svg', FaviconController::class)->name('favicon');

Route::get('/', function (\Illuminate\Http\Request $request) {
    if ($request->user()) {
        return redirect()->route('dashboard');
    }

    $isMobile = (bool) preg_match(
        '/Mobile|Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i',
        $request->userAgent() ?? ''
    );

    return $isMobile ? redirect()->route('mobile.culto') : redirect()->route('more.index');
});

Route::get('/dashboard', DashboardController::class)->middleware(['auth', 'verified'])->name('dashboard');

// Rotas públicas (guests e autenticados): app com menu mobile/PC e Login no lugar da engrenagem
Route::get('/mais', [\App\Http\Controllers\MoreController::class, 'index'])->name('more.index');
Route::get('/varios/escala', [VariosController::class, 'schedule'])->name('varios.schedule');
Route::get('/varios/servicos', [VariosController::class, 'services'])->name('varios.services');
Route::get('/varios/classe-comecos', [VariosController::class, 'classeComecos'])->name('varios.classe-comecos');
Route::get('/varios/acervo', fn () => redirect()->route('acervo.index'))->name('varios.acervo');
Route::get('/acervo', [AcervoController::class, 'index'])->name('acervo.index');
Route::get('/varios/contato', [VariosController::class, 'contact'])->name('varios.contact');
Route::get('/varios/notificacoes', [VariosController::class, 'notifications'])->name('varios.notifications');
Route::get('/pedidos-oracao', [PrayerRequestController::class, 'index'])->name('prayer.index');
Route::post('/pedidos-oracao', [PrayerRequestController::class, 'store'])->name('prayer.store');
Route::post('/pedidos-oracao/{prayer}/orou', [PrayerRequestController::class, 'amen'])
    ->middleware('throttle:60,1')
    ->name('prayer.amen');
Route::get('/mobile/oracao', [PrayerRequestController::class, 'mobile'])->name('mobile.prayer');
Route::redirect('/mobile', '/mobile/culto')->name('mobile.index');
Route::get('/mobile/culto', [MobileController::class, 'culto'])->name('mobile.culto');
Route::get('/mobile/news', [MobileController::class, 'news'])->name('mobile.news');
Route::get('/mobile/events', [MobileController::class, 'events'])->name('mobile.events');
Route::get('/mobile/schedule', [MobileController::class, 'schedule'])->name('mobile.schedule');
Route::get('/mobile/more', [MobileController::class, 'more'])->name('mobile.more');
Route::get('/mobile/crencas', [MobileController::class, 'beliefs'])->name('mobile.beliefs');
Route::get('/mobile/quem-somos', [MobileController::class, 'quemSomos'])->name('mobile.quem-somos');
Route::get('/mobile/classe-comecos', [MobileController::class, 'classeComecos'])->name('mobile.classe-comecos');
Route::get('/mobile/acervo', [MobileController::class, 'acervo'])->name('mobile.acervo');
Route::get('/mobile/musica', [MobileController::class, 'musica'])->name('mobile.musica');
Route::get('/mobile/services', [MobileController::class, 'services'])->name('mobile.services');
Route::get('/mobile/contact', [MobileController::class, 'contact'])->name('mobile.contact');
Route::get('/mobile/fotos', [MobileController::class, 'fotosComingSoon'])->name('mobile.fotos');
Route::get('/mobile/localizacao', [MobileController::class, 'location'])->name('mobile.location');
Route::get('/mobile/offerings', [MobileController::class, 'offerings'])->name('mobile.offerings');
Route::get('/mobile/notifications', [MobileController::class, 'notifications'])->name('mobile.notifications');
Route::get('/musica', [MusicaController::class, 'index'])->name('musica.index');

Route::middleware('auth')->group(function () {
    Route::post('/working-church', [\App\Http\Controllers\SetWorkingChurchController::class, '__invoke'])->name('working-church.store');

    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    // Members Resource Routes (restricted to users with appropriate permission)
    Route::resource('members', MemberController::class)
        ->except(['create', 'edit'])
        ->middleware('permission:members.view|members.manage');

    // Escala semanal (qualquer usuário autenticado pode ver; edição exige escalas.manage no controller)
    Route::get('/escalas', [\App\Http\Controllers\ScheduleController::class, 'index'])->name('escalas.index');
    Route::post('/escalas', [\App\Http\Controllers\ScheduleController::class, 'store'])
        ->name('escalas.store')
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
    Route::post('/volunteers', [VolunteerController::class, 'store'])->name('volunteers.store')->middleware('permission:volunteers.manage');
    Route::put('/volunteers/{volunteer}', [VolunteerController::class, 'update'])->name('volunteers.update')->middleware('permission:volunteers.manage');
    Route::delete('/volunteers/{volunteer}', [VolunteerController::class, 'destroy'])->name('volunteers.destroy')->middleware('permission:volunteers.manage');

    // Salas (CRUD) — por andar
    Route::get('/rooms', [\App\Http\Controllers\RoomController::class, 'index'])->name('rooms.index')->middleware('permission:rooms.view|rooms.manage');
    Route::post('/rooms', [\App\Http\Controllers\RoomController::class, 'store'])->name('rooms.store')->middleware('permission:rooms.manage');
    Route::put('/rooms/{room}', [\App\Http\Controllers\RoomController::class, 'update'])->name('rooms.update')->middleware('permission:rooms.manage');
    Route::delete('/rooms/{room}', [\App\Http\Controllers\RoomController::class, 'destroy'])->name('rooms.destroy')->middleware('permission:rooms.manage');
    // Inventário — itens com código de barras, busca e histórico
    Route::get('/inventory', [InventoryController::class, 'index'])->name('inventory.index')->middleware('permission:inventory.view|inventory.manage');
    Route::get('/inventory/{item}/history', [InventoryController::class, 'history'])->name('inventory.history')->middleware('permission:inventory.view|inventory.manage');
    Route::post('/inventory', [InventoryController::class, 'store'])->name('inventory.store')->middleware('permission:inventory.manage');
    Route::put('/inventory/{item}', [InventoryController::class, 'update'])->name('inventory.update')->middleware('permission:inventory.manage');
    Route::delete('/inventory/{item}', [InventoryController::class, 'destroy'])->name('inventory.destroy')->middleware('permission:inventory.manage');
    // Usuários e convites
    Route::get('/users', [\App\Http\Controllers\UserController::class, 'index'])->name('users.index')->middleware('permission:users.view|users.manage');
    Route::post('/users', [\App\Http\Controllers\UserController::class, 'store'])->name('users.store')->middleware('permission:users.manage');
    Route::post('/users/{user}/invite', [\App\Http\Controllers\UserController::class, 'invite'])->name('users.invite')->middleware('permission:users.manage');
    Route::put('/users/{user}', [\App\Http\Controllers\UserController::class, 'update'])->name('users.update')->middleware('permission:users.manage');
    Route::delete('/users/{user}', [\App\Http\Controllers\UserController::class, 'destroy'])->name('users.destroy')->middleware('permission:users.manage');
    Route::post('/invitations', [\App\Http\Controllers\InvitationController::class, 'store'])->name('invitations.store')->middleware('permission:users.manage');
    Route::delete('/invitations/{invitation}', [\App\Http\Controllers\InvitationController::class, 'destroy'])->name('invitations.destroy')->middleware('permission:users.manage');

    // Perfis (papéis) e permissões
    Route::get('/roles', [RoleController::class, 'index'])->name('roles.index')->middleware('permission:roles.manage');
    Route::post('/roles', [RoleController::class, 'update'])->name('roles.update')->middleware('permission:roles.manage');

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
    Route::get('/culto', [CultoController::class, 'index'])->name('culto.index')->middleware('permission:culto.manage');
    Route::post('/culto', [CultoController::class, 'store'])->name('culto.store')->middleware('permission:culto.manage');
    Route::put('/culto/{culto}', [CultoController::class, 'update'])->name('culto.update')->middleware('permission:culto.manage');
    Route::delete('/culto/{culto}', [CultoController::class, 'destroy'])->name('culto.destroy')->middleware('permission:culto.manage');
    Route::post('/musica', [MusicaController::class, 'store'])->name('musica.store')->middleware('permission:music.manage');
    Route::put('/musica/{musica}', [MusicaController::class, 'update'])->name('musica.update')->middleware('permission:music.manage');
    Route::delete('/musica/{musica}', [MusicaController::class, 'destroy'])->name('musica.destroy')->middleware('permission:music.manage');
    Route::get('/services', function () {
        return Inertia::render('Dashboard');
    })->name('services.index');
    Route::get('/settings', function () {
        return Inertia::render('Settings/Index');
    })->name('settings.index');
    Route::post('/acervo', [AcervoController::class, 'store'])->name('acervo.store')->middleware('permission:music.manage');
    Route::put('/acervo/{acervo}', [AcervoController::class, 'update'])->name('acervo.update')->middleware('permission:music.manage');
    Route::delete('/acervo/{acervo}', [AcervoController::class, 'destroy'])->name('acervo.destroy')->middleware('permission:music.manage');
    Route::post('/notifications', [AppNotificationController::class, 'store'])->name('notifications.store')->middleware('permission:notifications.manage');
    Route::get('/mobile/settings', [MobileController::class, 'settings'])->name('mobile.settings');

    // Igrejas — apenas super admin (via permission churches.manage)
    Route::get('/churches', [ChurchController::class, 'index'])->name('churches.index')->middleware('permission:churches.manage');
    Route::post('/churches', [ChurchController::class, 'store'])->name('churches.store')->middleware('permission:churches.manage');
    Route::put('/churches/{church}', [ChurchController::class, 'update'])->name('churches.update')->middleware('permission:churches.manage');
    Route::delete('/churches/{church}', [ChurchController::class, 'destroy'])->name('churches.destroy')->middleware('permission:churches.manage');
    Route::get('/churches/{church}/services', [\App\Http\Controllers\ChurchServiceController::class, 'index'])->name('churches.services.index')->middleware('permission:churches.manage');
    Route::post('/churches/{church}/services', [\App\Http\Controllers\ChurchServiceController::class, 'store'])->name('churches.services.store')->middleware('permission:churches.manage');
    Route::put('/churches/{church}/services/{service}', [\App\Http\Controllers\ChurchServiceController::class, 'update'])->name('churches.services.update')->middleware('permission:churches.manage');
    Route::delete('/churches/{church}/services/{service}', [\App\Http\Controllers\ChurchServiceController::class, 'destroy'])->name('churches.services.destroy')->middleware('permission:churches.manage');
});

require __DIR__.'/auth.php';
