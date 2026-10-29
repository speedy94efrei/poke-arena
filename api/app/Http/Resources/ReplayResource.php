<?php

namespace App\Http\Resources;

use App\Models\Replay;
use App\Models\ReplayPlayer;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Replay
 */
class ReplayResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->slug,
            'format' => $this->format,
            'format_name' => $this->format_name,
            'winner' => $this->winner,
            'turns' => $this->turns,
            'rated' => $this->rated,
            'players' => $this->players->map(fn (ReplayPlayer $player): array => [
                'slot' => $player->slot,
                'name' => $player->name,
                'showdown_id' => $player->showdown_id,
            ]),
            'ended_at' => $this->ended_at->toIso8601String(),
            'log' => $this->whenHas('log'),
        ];
    }
}
