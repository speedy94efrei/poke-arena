<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\RegisterPlayerRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;

class RegisteredPlayerController extends Controller
{
    public function store(RegisterPlayerRequest $request): JsonResponse
    {
        $user = User::query()->create([
            'name' => $request->string('name')->trim()->toString(),
            'showdown_id' => User::showdownIdFor($request->string('name')),
            'password' => $request->string('password')->toString(),
        ]);

        return response()->json([
            'token' => $user->createToken('site')->plainTextToken,
            'name' => $user->name,
        ], 201);
    }
}
