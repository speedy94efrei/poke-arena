<?php

namespace App\Http\Controllers\Internal;

use App\Http\Controllers\Controller;
use App\Http\Requests\Internal\StoreBattleRequest;
use App\Models\Battle;
use App\Models\LadderEvent;
use App\Models\Season;
use App\Ranked\Ladder;
use Illuminate\Http\JsonResponse;

class BattleController extends Controller
{
    /**
     * Enregistre un draft classé terminé. Un combat déjà reçu n'est pas compté deux fois.
     */
    public function store(StoreBattleRequest $request, Ladder $ladder): JsonResponse
    {
        $existing = Battle::query()->where('room_id', $request->string('room_id'))->first();
        $battle = $existing ?? $ladder->recordBattle(Season::currentOrFail(), $request->validated());

        $events = LadderEvent::query()->where('battle_id', $battle->id)->with('ladderEntry.user')->get();

        return response()->json([
            'room_id' => $battle->room_id,
            'players' => $events->map(fn (LadderEvent $event): array => [
                'showdown_id' => $event->ladderEntry->user->showdown_id,
                'type' => $event->type,
                'points_delta' => $event->points_delta,
                'points_after' => $event->points_after,
                'note' => $event->note,
            ]),
        ], $existing ? 200 : 201);
    }
}
