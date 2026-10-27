<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

class ShowdownTokenController extends Controller
{
    /**
     * Jeton à usage unique que le site présente au serveur de combat pour prouver son compte.
     */
    public function store(Request $request): JsonResponse
    {
        $token = Str::random(48);
        $minutes = config('ranked.showdown_token_minutes');
        Cache::put('showdown-token:'.hash('sha256', $token), $request->user()->id, now()->addMinutes($minutes));

        return response()->json(['token' => $token, 'expires_in' => $minutes * 60], 201);
    }
}
