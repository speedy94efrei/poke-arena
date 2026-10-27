<?php

namespace App\Http\Controllers\Internal;

use App\Http\Controllers\Controller;
use App\Http\Requests\Internal\StoreAbandonRequest;
use App\Models\Season;
use App\Models\User;
use App\Ranked\Ladder;
use Illuminate\Http\JsonResponse;

class AbandonController extends Controller
{
    public function store(StoreAbandonRequest $request, Ladder $ladder): JsonResponse
    {
        $user = User::query()->where('showdown_id', $request->string('showdown_id'))->firstOrFail();
        $opponent = $request->filled('opponent_showdown_id')
            ? User::query()->where('showdown_id', $request->string('opponent_showdown_id'))->first()
            : null;
        $event = $ladder->recordAbandon(Season::currentOrFail(), $user, $opponent);

        return response()->json(['points_delta' => $event->points_delta, 'points_after' => $event->points_after], 201);
    }
}
