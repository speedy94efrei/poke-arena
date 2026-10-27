<?php

namespace Tests\Feature;

use App\Models\Battle;
use App\Models\DraftChoice;
use App\Models\Season;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SeasonStatsTest extends TestCase
{
    use RefreshDatabase;

    public function test_current_season_returns_dates_patch_and_draft_counts(): void
    {
        $season = Season::factory()->create(['number' => 1, 'patch' => '1.2']);
        Battle::factory()->for($season)->create(['ended_at' => now()->subDays(3)]);
        Battle::factory()->for($season)->create();

        $this->getJson('/api/seasons/current')
            ->assertOk()
            ->assertJsonPath('data.number', 1)
            ->assertJsonPath('data.patch', '1.2')
            ->assertJsonPath('stats', ['drafts' => 2, 'drafts_today' => 1]);
    }

    public function test_pokemon_stats_count_presence_bans_and_wins_per_draft(): void
    {
        $season = Season::factory()->create();
        [$alice, $bruno] = User::factory()->count(2)->create();
        $first = Battle::factory()->for($season)->create(['player_one_id' => $alice->id, 'player_two_id' => $bruno->id, 'winner_id' => $alice->id]);
        $second = Battle::factory()->for($season)->create(['player_one_id' => $alice->id, 'player_two_id' => $bruno->id, 'winner_id' => $bruno->id]);
        $this->choose($first, $alice, 'lanturn', DraftChoice::PICK);
        $this->choose($first, $bruno, 'weavile', DraftChoice::BAN);
        $this->choose($second, $bruno, 'lanturn', DraftChoice::PICK);
        $this->choose($second, $alice, 'lanturn', DraftChoice::BAN);

        $stats = collect($this->getJson('/api/seasons/current/pokemon-stats')->assertOk()->json('data'))->keyBy('pokemon');

        $this->assertEquals(['pokemon' => 'lanturn', 'picks' => 2, 'bans' => 1, 'presence' => 1, 'ban_rate' => 0.5, 'win_rate' => 1], $stats['lanturn']);
        $this->assertSame(0.5, $stats['weavile']['presence']);
        $this->assertNull($stats['weavile']['win_rate']);
    }

    public function test_duos_count_pairs_drafted_in_the_same_team(): void
    {
        $season = Season::factory()->create();
        [$alice, $bruno] = User::factory()->count(2)->create();
        foreach (range(1, 2) as $i) {
            $battle = Battle::factory()->for($season)->create(['player_one_id' => $alice->id, 'player_two_id' => $bruno->id]);
            $this->choose($battle, $alice, 'lanturn', DraftChoice::PICK);
            $this->choose($battle, $alice, 'qwilfish', DraftChoice::PICK);
            $this->choose($battle, $bruno, 'lanturn', DraftChoice::PICK);
        }

        $this->getJson('/api/seasons/current/duos')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0', ['pokemon' => ['lanturn', 'qwilfish'], 'teams' => 2, 'share' => 0.5]);
    }

    private function choose(Battle $battle, User $user, string $pokemon, string $kind): void
    {
        $battle->draftChoices()->create(['user_id' => $user->id, 'pokemon' => $pokemon, 'kind' => $kind, 'position' => 0]);
    }
}
