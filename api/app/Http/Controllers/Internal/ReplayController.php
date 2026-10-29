<?php

namespace App\Http\Controllers\Internal;

use App\Http\Controllers\Controller;
use App\Http\Requests\Internal\StoreReplayRequest;
use App\Models\Replay;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class ReplayController extends Controller
{
    /**
     * Garde le journal d'un combat terminé. Un combat déjà reçu n'est pas enregistré deux fois.
     */
    public function store(StoreReplayRequest $request): JsonResponse
    {
        $data = $request->validated();
        $existing = Replay::query()->where('slug', $data['id'])->first();
        if ($existing) {
            return response()->json(['id' => $existing->slug]);
        }

        $replay = DB::transaction(function () use ($data): Replay {
            $replay = Replay::query()->create([
                'slug' => $data['id'],
                'format' => $data['format'],
                'format_name' => $data['format_name'],
                'winner' => $data['winner'],
                'turns' => $data['turns'] ?? 0,
                'rated' => $data['rated'] ?? false,
                'log' => $data['log'],
                'ended_at' => now(),
            ]);
            $replay->players()->createMany($data['players']);

            return $replay;
        });

        return response()->json(['id' => $replay->slug], 201);
    }
}
