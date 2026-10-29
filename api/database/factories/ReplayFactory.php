<?php

namespace Database\Factories;

use App\Models\Replay;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Replay>
 */
class ReplayFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'slug' => 'gen9pokedraft-'.fake()->unique()->numberBetween(1, 999999),
            'format' => 'gen9pokedraft',
            'format_name' => '[Gen 9] PokeDraft',
            'winner' => null,
            'turns' => fake()->numberBetween(5, 40),
            'rated' => false,
            'log' => "|init|battle\n|player|p1|Alice|1\n|player|p2|Bruno|2\n|start\n|turn|1\n|win|Alice",
            'ended_at' => now(),
        ];
    }

    /**
     * Les joueurs du combat, dans l'ordre des places (p1, p2, p3, p4).
     */
    public function between(string ...$names): static
    {
        return $this->afterCreating(function (Replay $replay) use ($names): void {
            foreach (array_values($names) as $index => $name) {
                $replay->players()->create(['slot' => 'p'.($index + 1), 'name' => $name, 'showdown_id' => User::showdownIdFor($name)]);
            }
        });
    }
}
