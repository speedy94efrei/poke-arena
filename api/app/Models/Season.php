<?php

namespace App\Models;

use Database\Factories\SeasonFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['number', 'name', 'patch', 'starts_at', 'ends_at'])]
class Season extends Model
{
    /** @use HasFactory<SeasonFactory> */
    use HasFactory;

    /**
     * Saison en cours : la dernière commencée.
     */
    public static function current(): ?self
    {
        return static::query()
            ->where('starts_at', '<=', now())
            ->orderByDesc('starts_at')
            ->orderByDesc('id')
            ->first();
    }

    public static function currentOrFail(): self
    {
        return static::current() ?? throw (new ModelNotFoundException)->setModel(self::class);
    }

    public function isOver(): bool
    {
        return $this->ends_at->isPast();
    }

    /**
     * @return HasMany<Battle, $this>
     */
    public function battles(): HasMany
    {
        return $this->hasMany(Battle::class);
    }

    /**
     * @return HasMany<LadderEntry, $this>
     */
    public function ladderEntries(): HasMany
    {
        return $this->hasMany(LadderEntry::class);
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'starts_at' => 'datetime',
            'ends_at' => 'datetime',
        ];
    }
}
