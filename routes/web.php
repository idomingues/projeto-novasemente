<?php

use App\Http\Controllers\ProfileController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

use App\Http\Controllers\MemberController;

Route::get('/', function () {
    return Inertia::render('Welcome', [
        'canLogin' => Route::has('login'),
        'canRegister' => Route::has('register'),
        'laravelVersion' => Application::VERSION,
        'phpVersion' => PHP_VERSION,
    ]);
});

Route::get('/dashboard', function () {
    return Inertia::render('Dashboard');
})->middleware(['auth', 'verified'])->name('dashboard');

Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    // Members Resource Routes (restricted to users with appropriate permission)
    Route::resource('members', MemberController::class)
        ->except(['create', 'edit'])
        ->middleware('permission:members.view|members.manage');

    // Placeholders for other routes
    Route::get('/volunteers', function () { return Inertia::render('Dashboard'); })->name('volunteers.index');
    Route::get('/rooms', function () { return Inertia::render('Dashboard'); })->name('rooms.index');
    Route::get('/inventory', function () { return Inertia::render('Dashboard'); })->name('inventory.index');
    Route::get('/news', function () { return Inertia::render('Dashboard'); })->name('news.index');
    Route::get('/services', function () { return Inertia::render('Dashboard'); })->name('services.index');
    Route::get('/settings', function () { return Inertia::render('Dashboard'); })->name('settings.index');
});

require __DIR__.'/auth.php';
