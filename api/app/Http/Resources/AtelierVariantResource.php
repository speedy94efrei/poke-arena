<?php

namespace App\Http\Resources;

use App\Models\AtelierVariant;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin AtelierVariant
 */
class AtelierVariantResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'name' => $this->name,
            'item' => $this->item ?? '',
            'nature' => $this->nature,
            'moves' => $this->moves,
            'evs' => $this->evs,
            'ivs' => $this->ivs,
            'favorite' => $this->favorite,
            'preset' => $this->preset,
        ];
    }
}
