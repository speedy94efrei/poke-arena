<?php

namespace Tests\Feature;

use App\Models\LadderEntry;
use App\Models\Season;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LadderTest extends TestCase
{
    use RefreshDatabase;

    public function test_ladder_lists_placed_players_by_points_and_skips_players_in_placement(): void
    {
        $season = Season::factory()->create();
        LadderEntry::factory()->for(User::factory()->named('Brume'))->for($season)->placed(450)->create();
        LadderEntry::factory()->for(User::factory()->named('Mistral'))->for($season)->placed(764)->create();
        LadderEntry::factory()->for(User::factory()->named('Novice'))->for($season)->create(['placement_games' => 3]);

        $response = $this->getJson('/api/seasons/current/ladder')->assertOk();

        $response->assertJsonCount(2, 'data')
            ->assertJsonPath('players', 2)
            ->assertJsonPath('data.0.name', 'Mistral')
            ->assertJsonPath('data.0.rank.label', 'Hyper Ball II')
            ->assertJsonPath('data.0.rank.points', 64)
            ->assertJsonPath('data.1.name', 'Brume');
    }

    public function test_only_the_top_ten_master_ball_players_are_champions(): void
    {
        $season = Season::factory()->create();
        foreach (range(1, 11) as $i) {
            LadderEntry::factory()->for(User::factory()->named("Maître {$i}"))->for($season)->placed(2000 - $i * 10)->create();
        }

        $response = $this->getJson('/api/seasons/current/ladder')->assertOk();

        $response->assertJsonPath('data.9.rank.tier', 'champion')
            ->assertJsonPath('data.10.rank.tier', 'master')
            ->assertJsonPath('data.10.rank.label', 'Master Ball');
        $distribution = collect($response->json('distribution'))->keyBy('tier');
        $this->assertSame(10, $distribution['champion']['players']);
        $this->assertSame(1, $distribution['master']['players']);
    }

    public function test_ladder_returns_404_without_a_current_season(): void
    {
        Season::factory()->create(['starts_at' => now()->addDay(), 'ends_at' => now()->addMonth()]);

        $this->getJson('/api/seasons/current/ladder')->assertNotFound();
    }
}
