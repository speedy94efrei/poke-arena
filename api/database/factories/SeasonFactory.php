<?php

namespace Database\Factories;

use App\Models\Season;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Season>
 */
class SeasonFactory extends Factory
{
    /**
     * Saison en cours par défaut.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $number = fake()->unique()->numberBetween(1, 999);

        return [
            'number' => $number,
            'name' => "Saison {$number}",
            'patch' => '1.0',
            'starts_at' => now()->subDays(10),
            'ends_at' => now()->addDays(50),
        ];
    }

    public function finished(): static
    {
        return $this->state(fn (array $attributes) => [
            'starts_at' => now()->subDays(120),
            'ends_at' => now()->subDays(60),
        ]);
    }
}
