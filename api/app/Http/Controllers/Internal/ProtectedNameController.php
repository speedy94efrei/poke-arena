<?php

namespace App\Http\Controllers\Internal;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;

class ProtectedNameController extends Controller
{
    /**
     * Pseudos des comptes Arène : le serveur de combat les réserve à leur propriétaire.
     */
    public function index(): JsonResponse
    {
        return response()->json([
            'showdown_ids' => User::query()->orderBy('showdown_id')->pluck('showdown_id'),
        ]);
    }
}
