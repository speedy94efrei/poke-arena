<?php

namespace Tests\Feature;

use App\Models\Replay;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

class ReplayTest extends TestCase
{
    use RefreshDatabase;

    private const SECRET = 'secret-de-test';

    protected function setUp(): void
    {
        parent::setUp();
        config(['ranked.internal_secret' => self::SECRET]);
    }

    public function test_battle_server_stores_a_replay_that_anyone_can_read(): void
    {
        $this->store()->assertCreated()->assertJsonPath('id', 'gen9pokedraft-12');

        $this->getJson('/api/replays/gen9pokedraft-12')
            ->assertOk()
            ->assertJsonPath('data.format_name', '[Gen 9] PokeDraft')
            ->assertJsonPath('data.winner', 'Alice')
            ->assertJsonPath('data.turns', 14)
            ->assertJsonPath('data.players.1.name', 'Bruno Bis')
            ->assertJsonPath('data.players.1.showdown_id', 'brunobis')
            ->assertJsonPath('data.log', "|player|p1|Alice|1\n|turn|1\n|win|Alice");
    }

    public function test_the_same_battle_sent_twice_is_stored_once(): void
    {
        $this->store()->assertCreated();
        $this->store(['log' => '|autre journal'])->assertOk();

        $this->assertSame(1, Replay::query()->count());
        $this->assertSame("|player|p1|Alice|1\n|turn|1\n|win|Alice", Replay::query()->value('log'));
    }

    public function test_only_the_battle_server_can_store_a_replay(): void
    {
        $this->postJson('/api/internal/replays', $this->payload())->assertForbidden();
        $this->withHeader('X-Arene-Secret', 'mauvais')->postJson('/api/internal/replays', $this->payload())->assertForbidden();

        $this->assertSame(0, Replay::query()->count());
    }

    public function test_replay_needs_players_with_distinct_places(): void
    {
        $players = [['slot' => 'p1', 'name' => 'Alice', 'showdown_id' => 'alice'], ['slot' => 'p1', 'name' => 'Bruno', 'showdown_id' => 'bruno']];

        $this->store(['players' => $players])->assertUnprocessable()->assertJsonValidationErrors('players.0.slot');
        $this->store(['id' => 'Pas un id !'])->assertUnprocessable()->assertJsonValidationErrors('id');
    }

    public function test_list_shows_a_player_replays_newest_first_without_their_log(): void
    {
        Replay::factory()->between('Alice', 'Bruno')->create(['slug' => 'gen9ou-1', 'ended_at' => now()->subDay()]);
        Replay::factory()->between('Chloé', 'Alice')->create(['slug' => 'gen9ou-2', 'ended_at' => now()]);
        Replay::factory()->between('Bruno', 'Chloé')->create(['slug' => 'gen9ou-3']);

        $response = $this->getJson('/api/replays?player=ALICE')->assertOk();

        $this->assertSame(['gen9ou-2', 'gen9ou-1'], array_column($response->json('data'), 'id'));
        $response->assertJsonMissingPath('data.0.log');
        $response->assertJsonPath('data.0.players.0.name', 'Chloé');
    }

    public function test_list_keeps_a_family_of_formats(): void
    {
        Replay::factory()->between('Alice', 'Bruno')->create(['slug' => 'gen9ou-1', 'format' => 'gen9ou']);
        Replay::factory()->between('Alice', 'Bruno')->create(['slug' => 'gen9pokedraft-2', 'format' => 'gen9pokedraft']);
        Replay::factory()->between('Alice', 'Bot Niveau 2')->create(['slug' => 'gen9pokedraftroguelike-3', 'format' => 'gen9pokedraftroguelike']);

        $response = $this->getJson('/api/replays?format=gen9pokedraft&player=alice')->assertOk();

        $this->assertEqualsCanonicalizing(['gen9pokedraft-2', 'gen9pokedraftroguelike-3'], array_column($response->json('data'), 'id'));
    }

    public function test_unknown_replay_is_not_found(): void
    {
        $this->getJson('/api/replays/gen9ou-404')->assertNotFound();
    }

    /**
     * @param  array<string, mixed>  $overrides
     */
    private function store(array $overrides = []): TestResponse
    {
        return $this->withHeader('X-Arene-Secret', self::SECRET)->postJson('/api/internal/replays', $this->payload($overrides));
    }

    /**
     * @param  array<string, mixed>  $overrides
     * @return array<string, mixed>
     */
    private function payload(array $overrides = []): array
    {
        return [
            'id' => 'gen9pokedraft-12',
            'format' => 'gen9pokedraft',
            'format_name' => '[Gen 9] PokeDraft',
            'winner' => 'Alice',
            'turns' => 14,
            'rated' => false,
            'log' => "|player|p1|Alice|1\n|turn|1\n|win|Alice",
            'players' => [
                ['slot' => 'p1', 'name' => 'Alice', 'showdown_id' => 'alice'],
                ['slot' => 'p2', 'name' => 'Bruno Bis', 'showdown_id' => 'brunobis'],
            ],
            ...$overrides,
        ];
    }
}
