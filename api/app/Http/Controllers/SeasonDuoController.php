<?php

namespace App\Http\Controllers;

use App\Models\Season;
use App\Ranked\SeasonStats;
use Illuminate\Http\JsonResponse;

class SeasonDuoController extends Controller
{
    public function index(SeasonStats $stats): JsonResponse
    {
        return response()->json(['data' => $stats->duos(Season::currentOrFail())]);
    }
}
