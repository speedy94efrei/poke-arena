<?php

namespace App\Http\Controllers;

use App\Models\Season;
use App\Ranked\SeasonStats;
use Illuminate\Http\JsonResponse;

class SeasonPokemonStatController extends Controller
{
    public function index(SeasonStats $stats): JsonResponse
    {
        $season = Season::currentOrFail();

        return response()->json(['data' => $stats->pokemon($season), 'drafts' => $stats->summary($season)['drafts']]);
    }
}
