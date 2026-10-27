<?php

namespace App\Http\Controllers\Internal;

use App\Http\Controllers\Controller;
use App\Http\Requests\Internal\StoreShowdownSessionRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;
use Illuminate\Validation\ValidationException;

class ShowdownSessionController extends Controller
{
    /**
     * Échange un jeton du site contre le compte qu'il prouve. Le jeton ne sert qu'une fois.
     */
    public function store(StoreShowdownSessionRequest $request): JsonResponse
    {
        $userId = Cache::pull('showdown-token:'.hash('sha256', $request->string('token')));
        $user = $userId ? User::query()->find($userId) : null;

        if (! $user) {
            throw ValidationException::withMessages(['token' => 'Jeton inconnu ou expiré.']);
        }
        if ($user->showdown_id !== $request->string('showdown_id')->toString()) {
            throw ValidationException::withMessages(['showdown_id' => "Connecte-toi au serveur de combat sous le pseudo {$user->name}."]);
        }

        return response()->json(['name' => $user->name, 'showdown_id' => $user->showdown_id]);
    }
}
