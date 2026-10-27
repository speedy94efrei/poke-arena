<?php

namespace App\Http\Controllers;

use App\Models\LadderEntry;
use App\Models\Season;
use App\Ranked\Ladder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LadderController extends Controller
{
    public function index(Request $request, Ladder $ladder): JsonResponse
    {
        $season = Season::currentOrFail();
        $limit = min(100, max(1, $request->integer('limit', 50)));
        $entries = $ladder->standings($season)->with(['user', 'season'])->limit($limit)->get();

        return response()->json([
            'data' => $entries->values()->map(fn (LadderEntry $entry, int $index): array => [
                'position' => $index + 1,
                'name' => $entry->user->name,
                'showdown_id' => $entry->user->showdown_id,
                'banner' => $entry->user->banner,
                'rank' => $ladder->rankFor($entry)->toArray(),
                'wins' => $entry->wins,
                'losses' => $entry->losses,
            ]),
            'players' => $ladder->standings($season)->count(),
            'distribution' => $ladder->distribution($season),
        ]);
    }
}
