<?php

namespace App\Http\Controllers\Internal;

use App\Http\Controllers\Controller;
use App\Models\Season;
use App\Models\User;
use App\Ranked\Ladder;
use Illuminate\Http\JsonResponse;

class QueueStatusController extends Controller
{
    public function show(User $user, Ladder $ladder): JsonResponse
    {
        return response()->json($ladder->abandonStatus(Season::currentOrFail(), $user));
    }
}
