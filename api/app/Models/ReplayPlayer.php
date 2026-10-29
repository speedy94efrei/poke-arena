<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Un joueur d'un replay, par son pseudo au moment du combat : il n'a pas forcément de compte.
 */
#[Fillable(['slot', 'name', 'showdown_id'])]
class ReplayPlayer extends Model
{
    public $timestamps = false;

    /**
     * @return BelongsTo<Replay, $this>
     */
    public function replay(): BelongsTo
    {
        return $this->belongsTo(Replay::class);
    }
}
