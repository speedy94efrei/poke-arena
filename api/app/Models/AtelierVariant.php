<?php

namespace App\Models;

use Database\Factories\AtelierVariantFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Réglage d'un Pokémon du roster préparé dans l'Atelier : objet, nature, attaques, EV et IV.
 */
#[Fillable(['user_id', 'pokemon', 'position', 'name', 'item', 'nature', 'moves', 'evs', 'ivs', 'favorite', 'preset'])]
class AtelierVariant extends Model
{
    /** @use HasFactory<AtelierVariantFactory> */
    use HasFactory;

    public const MAX_PER_POKEMON = 3;

    public const MOVE_SLOTS = 4;

    public const STATS = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'];

    public const PRESETS = ['phy', 'spe', 'tphy', 'tspe', 'tr'];

    public const MAX_EV = 252;

    public const MAX_EV_TOTAL = 510;

    public const MAX_IV = 31;

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'moves' => 'array',
            'evs' => 'array',
            'ivs' => 'array',
            'favorite' => 'boolean',
        ];
    }
}
