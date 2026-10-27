<?php

namespace App\Http\Controllers;

use App\Http\Resources\PlayerResource;
use App\Models\Season;
use App\Models\User;
use App\Ranked\Profiles;

class PlayerController extends Controller
{
    public function show(User $user, Profiles $profiles): PlayerResource
    {
        return PlayerResource::make($profiles->profile($user, Season::currentOrFail()));
    }
}
