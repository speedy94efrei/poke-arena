<?php

namespace Database\Factories;

use App\Models\AtelierVariant;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<AtelierVariant>
 */
class AtelierVariantFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'pokemon' => 'dragonite',
            'position' => 0,
            'name' => 'Variante 1',
            'item' => 'heavydutyboots',
            'nature' => 'adamant',
            'moves' => ['dragondance', 'extremespeed', 'earthquake', 'firepunch'],
            'evs' => ['hp' => 4, 'atk' => 252, 'def' => 0, 'spa' => 0, 'spd' => 0, 'spe' => 252],
            'ivs' => ['hp' => 31, 'atk' => 31, 'def' => 31, 'spa' => 31, 'spd' => 31, 'spe' => 31],
            'favorite' => true,
            'preset' => 'phy',
        ];
    }
}
