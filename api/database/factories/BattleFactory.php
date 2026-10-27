<?php

namespace Database\Factories;

use App\Models\Battle;
use App\Models\Season;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Battle>
 */
class BattleFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'season_id' => Season::factory(),
            'room_id' => 'battle-gen9pokedraft-'.fake()->unique()->numberBetween(1, 999999),
            'player_one_id' => User::factory(),
            'player_two_id' => User::factory(),
            'winner_id' => null,
            'turns' => fake()->numberBetween(5, 40),
            'ended_at' => now(),
        ];
    }
}
