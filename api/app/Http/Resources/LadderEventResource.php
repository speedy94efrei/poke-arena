<?php

namespace App\Http\Resources;

use App\Models\LadderEvent;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin LadderEvent
 */
class LadderEventResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'type' => $this->type,
            'points_delta' => $this->points_delta,
            'points_after' => $this->points_after,
            'opponent' => $this->opponent?->name,
            'note' => $this->note,
            'at' => $this->created_at->toIso8601String(),
        ];
    }
}
