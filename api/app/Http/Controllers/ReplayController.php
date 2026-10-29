<?php

namespace App\Http\Controllers;

use App\Http\Resources\ReplayResource;
use App\Models\Replay;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ReplayController extends Controller
{
    /**
     * Derniers replays, sans leur journal : ceux d'un joueur avec ?player=<pseudo>, ceux d'une famille de formats
     * avec ?format=<début de l'identifiant> (gen9pokedraft garde aussi les formats roguelike).
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $player = User::showdownIdFor($request->string('player')->toString());
        $format = User::showdownIdFor($request->string('format')->toString());

        $replays = Replay::query()
            ->select(['id', 'slug', 'format', 'format_name', 'winner', 'turns', 'rated', 'ended_at'])
            ->when($player !== '', fn ($query) => $query->whereHas('players', fn ($players) => $players->where('showdown_id', $player)))
            ->when($format !== '', fn ($query) => $query->where('format', 'like', $format.'%'))
            ->with('players')
            ->latest('ended_at')
            ->latest('id')
            ->paginate(20);

        return ReplayResource::collection($replays);
    }

    public function show(Replay $replay): ReplayResource
    {
        return ReplayResource::make($replay->load('players'));
    }
}
