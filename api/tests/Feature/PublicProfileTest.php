<?php

namespace Tests\Feature;

use App\Models\LadderEntry;
use App\Models\Season;
use App\Models\User;
use App\Ranked\Ladder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PublicProfileTest extends TestCase
{
    use RefreshDatabase;

    private Season $season;

    private User $alice;

    private User $bruno;

    private int $rooms = 0;

    protected function setUp(): void
    {
        parent::setUp();
        $this->season = Season::factory()->create();
        $this->alice = User::factory()->named('Alice')->create();
        $this->bruno = User::factory()->named('Bruno')->create();
    }

    public function test_public_profile_hides_abandons_inactivity_and_points_history(): void
    {
        $entry = LadderEntry::factory()->for($this->alice)->for($this->season)->placed(1250)->create();
        $entry->events()->create(['type' => 'abandon', 'points_delta' => -5, 'points_after' => 1245]);

        $this->getJson('/api/players/alice')
            ->assertOk()
            ->assertJsonPath('data.rank.label', 'Luxe Ball III')
            ->assertJsonMissingPath('data.abandons')
            ->assertJsonMissingPath('data.decay')
            ->assertJsonMissingPath('data.shield_games')
            ->assertJsonMissingPath('data.history');
    }

    public function test_viewing_a_player_who_never_played_the_season_does_not_create_their_entry(): void
    {
        $this->getJson('/api/players/alice')
            ->assertOk()
            ->assertJsonPath('data.rank.tier', 'placement')
            ->assertJsonPath('data.placement.played', 0)
            ->assertJsonPath('data.drafts', []);

        $this->assertDatabaseCount('ladder_entries', 0);
    }

    public function test_unknown_player_returns_404(): void
    {
        $this->getJson('/api/players/personne')->assertNotFound();
    }

    public function test_peak_is_the_best_rank_reached_this_season(): void
    {
        LadderEntry::factory()->for($this->alice)->for($this->season)->placed(420)->create(['peak_points' => 780]);

        $this->getJson('/api/players/alice')->assertJsonPath('data.peak', 'Hyper Ball II');
    }

    public function test_signature_lists_most_picked_pokemon_with_their_win_rate(): void
    {
        $this->draft(winner: 'alice', alice: ['dragonite', 'garchomp']);
        $this->draft(winner: 'bruno', alice: ['dragonite', 'ceruledge']);
        $this->draft(winner: 'alice', alice: ['dragonite', 'garchomp']);

        $signature = $this->getJson('/api/players/alice')->json('data.signature');

        $this->assertSame(['pokemon' => 'dragonite', 'picks' => 3], array_intersect_key($signature[0], ['pokemon' => 1, 'picks' => 1]));
        $this->assertEqualsWithDelta(0.6667, $signature[0]['win_rate'], 0.0001);
        $this->assertSame(['dragonite', 'garchomp', 'ceruledge'], array_column($signature, 'pokemon'));
    }

    public function test_bans_lists_pokemon_the_player_bans_most(): void
    {
        $this->draft(winner: 'alice', bans: ['kingambit', 'gholdengo']);
        $this->draft(winner: 'alice', bans: ['kingambit']);

        $this->getJson('/api/players/alice')
            ->assertJsonPath('data.bans', [['pokemon' => 'kingambit', 'bans' => 2], ['pokemon' => 'gholdengo', 'bans' => 1]]);
    }

    public function test_drafts_list_latest_first_with_both_teams_and_points_won(): void
    {
        LadderEntry::factory()->for($this->alice)->for($this->season)->placed(450)->create();
        LadderEntry::factory()->for($this->bruno)->for($this->season)->placed(450)->create();
        $this->draft(winner: 'bruno', alice: ['dragonite'], bruno: ['kingambit']);
        $this->travel(1)->minutes();
        $this->draft(winner: 'alice', alice: ['garchomp', 'ceruledge'], bruno: ['gholdengo']);

        $this->getJson('/api/players/alice')
            ->assertJsonCount(2, 'data.drafts')
            ->assertJsonPath('data.drafts.0.result', 'victoire')
            ->assertJsonPath('data.drafts.0.points_delta', 20)
            ->assertJsonPath('data.drafts.0.opponent', ['name' => 'Bruno', 'showdown_id' => 'bruno'])
            ->assertJsonPath('data.drafts.0.team', ['garchomp', 'ceruledge'])
            ->assertJsonPath('data.drafts.0.opponent_team', ['gholdengo'])
            ->assertJsonPath('data.drafts.1.result', 'defaite')
            ->assertJsonPath('data.drafts.1.points_delta', -18);
    }

    public function test_drafts_carry_the_placement_note_while_points_are_not_counted_yet(): void
    {
        $this->draft(winner: 'alice');

        $this->getJson('/api/players/alice')
            ->assertJsonPath('data.drafts.0.points_delta', 0)
            ->assertJsonPath('data.drafts.0.note', 'placement 1/5');
    }

    /**
     * @param  list<string>  $alice
     * @param  list<string>  $bruno
     * @param  list<string>  $bans
     */
    private function draft(string $winner, array $alice = ['dragonite'], array $bruno = ['kingambit'], array $bans = []): void
    {
        app(Ladder::class)->recordBattle($this->season, [
            'room_id' => 'battle-gen9pokedraft-'.++$this->rooms,
            'winner' => $winner,
            'players' => [
                ['showdown_id' => 'alice', 'bans' => $bans, 'picks' => array_map(fn (string $pokemon): array => ['pokemon' => $pokemon], $alice)],
                ['showdown_id' => 'bruno', 'picks' => array_map(fn (string $pokemon): array => ['pokemon' => $pokemon], $bruno)],
            ],
        ]);
    }
}
