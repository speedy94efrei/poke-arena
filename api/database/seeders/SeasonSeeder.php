<?php

namespace Database\Seeders;

use App\Models\Season;
use Carbon\CarbonImmutable;
use Illuminate\Database\Seeder;

class SeasonSeeder extends Seeder
{
    /**
     * Saison 1, celle du roster data/rosters/roster-saison-1.json. Les dates sont celles de Paris.
     */
    public function run(): void
    {
        Season::query()->updateOrCreate(['number' => 1], [
            'name' => 'Saison 1',
            'patch' => '1.0',
            'starts_at' => CarbonImmutable::parse('2026-10-27 00:00:00', 'Europe/Paris')->utc(),
            'ends_at' => CarbonImmutable::parse('2026-12-31 23:59:59', 'Europe/Paris')->utc(),
        ]);
    }
}
