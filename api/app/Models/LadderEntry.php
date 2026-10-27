<?php

namespace App\Models;

use Database\Factories\LadderEntryFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'user_id', 'season_id', 'points', 'peak_points', 'wins', 'losses', 'ties',
    'placement_games', 'shield_games', 'streak', 'last_played_at', 'decayed_at',
])]
class LadderEntry extends Model
{
    /** @use HasFactory<LadderEntryFactory> */
    use HasFactory;

    protected $attributes = [
        'points' => 0,
        'peak_points' => 0,
        'wins' => 0,
        'losses' => 0,
        'ties' => 0,
        'placement_games' => 0,
        'shield_games' => 0,
        'streak' => 0,
    ];

    public function isPlaced(): bool
    {
        return $this->placement_games >= config('ranked.placement_games');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * @return BelongsTo<Season, $this>
     */
    public function season(): BelongsTo
    {
        return $this->belongsTo(Season::class);
    }

    /**
     * @return HasMany<LadderEvent, $this>
     */
    public function events(): HasMany
    {
        return $this->hasMany(LadderEvent::class);
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'last_played_at' => 'datetime',
            'decayed_at' => 'datetime',
        ];
    }
}
