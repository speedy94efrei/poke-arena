<?php

namespace App\Http\Controllers;

use App\Http\Requests\UpdateBannerRequest;
use Illuminate\Http\JsonResponse;

class EquippedBannerController extends Controller
{
    public function update(UpdateBannerRequest $request): JsonResponse
    {
        $request->user()->update(['banner' => $request->string('banner')->toString()]);

        return response()->json(['banner' => $request->user()->banner]);
    }
}
