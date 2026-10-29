<?php

namespace App\Models;

use Database\Factories\ReplayFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Journal public d'un combat terminé, envoyé par le serveur de combat : le site le rejoue tour par tour.
 */
#[Fillable(['slug', 'format', 'format_name', 'winner', 'turns', 'rated', 'log', 'ended_at'])]
class Replay extends Model
{
    /** @use HasFactory<ReplayFactory> */
    use HasFactory;

    public function getRouteKeyName(): string
    {
        return 'slug';
    }

    /**
     * @return HasMany<ReplayPlayer, $this>
     */
    public function players(): HasMany
    {
        return $this->hasMany(ReplayPlayer::class)->orderBy('slot');
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'rated' => 'boolean',
            'ended_at' => 'datetime',
        ];
    }
}
