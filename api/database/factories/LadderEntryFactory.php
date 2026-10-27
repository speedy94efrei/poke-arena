<?php

namespace Database\Factories;

use App\Models\LadderEntry;
use App\Models\Season;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<LadderEntry>
 */
class LadderEntryFactory extends Factory
{
    /**
     * Joueur qui n'a pas encore fini ses placements.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'season_id' => Season::factory(),
            'points' => 0,
            'peak_points' => 0,
        ];
    }

    /**
     * Joueur placé avec ce total de points.
     */
    public function placed(int $points, int $wins = 3): static
    {
        return $this->state(fn (array $attributes) => [
            'points' => $points,
            'peak_points' => $points,
            'wins' => $wins,
            'losses' => 5 - min(5, $wins),
            'placement_games' => config('ranked.placement_games'),
            'last_played_at' => now(),
        ]);
    }
}
