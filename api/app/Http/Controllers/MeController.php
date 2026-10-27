<?php

namespace App\Http\Controllers;

use App\Http\Resources\PlayerResource;
use App\Models\Season;
use App\Ranked\Profiles;
use Illuminate\Http\Request;

class MeController extends Controller
{
    public function show(Request $request, Profiles $profiles): PlayerResource
    {
        return PlayerResource::make($profiles->profile($request->user(), Season::currentOrFail()));
    }
}
