<?php

namespace App\Http\Controllers;

use App\Http\Resources\SeasonResource;
use App\Models\Season;
use App\Ranked\SeasonStats;

class CurrentSeasonController extends Controller
{
    public function show(SeasonStats $stats): SeasonResource
    {
        $season = Season::currentOrFail();

        return SeasonResource::make($season)->additional(['stats' => $stats->summary($season)]);
    }
}
