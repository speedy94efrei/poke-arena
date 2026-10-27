<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['ladder_entry_id', 'type', 'points_delta', 'points_after', 'opponent_id', 'battle_id', 'note'])]
class LadderEvent extends Model
{
    public const VICTORY = 'victoire';

    public const DEFEAT = 'defaite';

    public const TIE = 'egalite';

    public const ABANDON = 'abandon';

    public const DECAY = 'inactivite';

    /**
     * @return BelongsTo<LadderEntry, $this>
     */
    public function ladderEntry(): BelongsTo
    {
        return $this->belongsTo(LadderEntry::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function opponent(): BelongsTo
    {
        return $this->belongsTo(User::class, 'opponent_id');
    }

    /**
     * @return BelongsTo<Battle, $this>
     */
    public function battle(): BelongsTo
    {
        return $this->belongsTo(Battle::class);
    }
}
