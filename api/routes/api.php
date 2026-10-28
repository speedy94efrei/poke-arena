<?php

use App\Http\Controllers\AtelierVariantController;
use App\Http\Controllers\Auth\RegisteredPlayerController;
use App\Http\Controllers\Auth\SessionController;
use App\Http\Controllers\CurrentSeasonController;
use App\Http\Controllers\EquippedBannerController;
use App\Http\Controllers\Internal;
use App\Http\Controllers\LadderController;
use App\Http\Controllers\MeController;
use App\Http\Controllers\PlayerController;
use App\Http\Controllers\SeasonDuoController;
use App\Http\Controllers\SeasonPokemonStatController;
use App\Http\Controllers\ShowdownTokenController;
use App\Http\Middleware\EnsureInternalRequest;
use Illuminate\Support\Facades\Route;

Route::middleware('throttle:10,1')->group(function () {
    Route::post('/players', [RegisteredPlayerController::class, 'store'])->name('players.store');
    Route::post('/session', [SessionController::class, 'store'])->name('session.store');
});

Route::get('/seasons/current', [CurrentSeasonController::class, 'show'])->name('seasons.current');
Route::get('/seasons/current/pokemon-stats', [SeasonPokemonStatController::class, 'index'])->name('seasons.current.pokemon-stats');
Route::get('/seasons/current/duos', [SeasonDuoController::class, 'index'])->name('seasons.current.duos');
Route::get('/seasons/current/ladder', [LadderController::class, 'index'])->name('seasons.current.ladder');
Route::get('/players/{user:showdown_id}', [PlayerController::class, 'show'])->name('players.show');

Route::middleware('auth:sanctum')->group(function () {
    Route::delete('/session', [SessionController::class, 'destroy'])->name('session.destroy');
    Route::get('/me', [MeController::class, 'show'])->name('me.show');
    Route::put('/me/banner', [EquippedBannerController::class, 'update'])->name('me.banner.update');
    Route::post('/me/showdown-tokens', [ShowdownTokenController::class, 'store'])->name('me.showdown-tokens.store');
    Route::get('/me/atelier-variants', [AtelierVariantController::class, 'index'])->name('me.atelier-variants.index');
    Route::post('/me/atelier-variants/import', [AtelierVariantController::class, 'import'])->name('me.atelier-variants.import');
    Route::put('/me/atelier-variants/{pokemon}', [AtelierVariantController::class, 'update'])->where('pokemon', '[a-z0-9]{1,40}')->name('me.atelier-variants.update');
});

Route::prefix('internal')->name('internal.')->middleware(EnsureInternalRequest::class)->group(function () {
    Route::post('/showdown-sessions', [Internal\ShowdownSessionController::class, 'store'])->name('showdown-sessions.store');
    Route::get('/players/{user:showdown_id}/queue-status', [Internal\QueueStatusController::class, 'show'])->name('players.queue-status');
    Route::post('/battles', [Internal\BattleController::class, 'store'])->name('battles.store');
    Route::post('/abandons', [Internal\AbandonController::class, 'store'])->name('abandons.store');
});
