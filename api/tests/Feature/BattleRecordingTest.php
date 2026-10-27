<?php

namespace Tests\Feature;

use App\Models\LadderEntry;
use App\Models\Season;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

class BattleRecordingTest extends TestCase
{
    use RefreshDatabase;

    private const SECRET = 'secret-de-test';

    private Season $season;

    private User $alice;

    private User $bruno;

    private int $rooms = 0;

    protected function setUp(): void
    {
        parent::setUp();
        config(['ranked.internal_secret' => self::SECRET]);
        $this->season = Season::factory()->create();
        $this->alice = User::factory()->named('Alice')->create();
        $this->bruno = User::factory()->named('Bruno')->create();
    }

    public function test_placement_games_give_no_points_until_the_fifth_which_places_the_player(): void
    {
        foreach (['alice', 'alice', 'bruno', 'alice'] as $winner) {
            $this->battle($winner)->assertCreated();
        }
        $entry = $this->entry($this->alice);
        $this->assertSame(0, $entry->points);
        $this->assertSame('placement 4/5', $entry->events()->latest('id')->value('note'));

        $this->battle('alice')->assertCreated();

        $entry->refresh();
        $this->assertSame(300 + 4 * 120, $entry->points);
        $this->assertSame('placé en Hyper Ball II', $entry->events()->latest('id')->value('note'));
    }

    public function test_placed_player_gains_20_then_22_on_a_streak_and_loses_18(): void
    {
        $this->placed($this->alice, 450);
        $this->placed($this->bruno, 450);

        $this->battle('alice')->assertJsonPath('players.0.points_delta', 20);
        $this->battle('alice')->assertJsonPath('players.0.points_delta', 22);
        $this->assertSame('série de 2', $this->entry($this->alice)->events()->latest('id')->value('note'));

        $this->battle('bruno');
        $this->assertSame(450 + 20 + 22 - 18, $this->entry($this->alice)->points);
    }

    public function test_promotion_grants_a_shield_that_blocks_demotion_for_three_games(): void
    {
        $this->placed($this->alice, 390);
        $this->placed($this->bruno, 900);

        $this->battle('alice');
        $entry = $this->entry($this->alice);
        $this->assertSame(410, $entry->points);
        $this->assertSame('promotion en Super Ball II', $entry->events()->latest('id')->value('note'));
        $this->assertSame(3, $entry->shield_games);

        $this->battle('bruno');
        $entry->refresh();
        $this->assertSame(400, $entry->points);
        $this->assertSame('bouclier', $entry->events()->latest('id')->value('note'));
        $this->assertSame(2, $entry->shield_games);
    }

    public function test_loss_without_shield_demotes_the_player(): void
    {
        $this->placed($this->alice, 405);
        $this->placed($this->bruno, 900);

        $this->battle('bruno');

        $this->assertSame(387, $this->entry($this->alice)->points);
        $this->assertSame('rétrogradation en Super Ball III', $this->entry($this->alice)->events()->latest('id')->value('note'));
    }

    public function test_tie_changes_no_points(): void
    {
        $this->placed($this->alice, 450);
        $this->placed($this->bruno, 450);

        $this->battle(null)->assertJsonPath('players.0.points_delta', 0)->assertJsonPath('players.0.type', 'egalite');

        $this->assertSame(1, $this->entry($this->alice)->ties);
    }

    public function test_same_room_sent_twice_returns_200_and_is_counted_once(): void
    {
        $this->placed($this->alice, 450);
        $this->placed($this->bruno, 450);

        $this->battle('alice', 'battle-gen9pokedraft-1')->assertCreated();
        $this->battle('alice', 'battle-gen9pokedraft-1')->assertOk();

        $this->assertDatabaseCount('battles', 1);
        $this->assertSame(470, $this->entry($this->alice)->points);
    }

    public function test_bans_and_picks_are_stored_for_each_player(): void
    {
        $this->battle('alice');

        $this->assertDatabaseCount('draft_choices', 2 * (2 + 6));
        $this->assertDatabaseHas('draft_choices', ['user_id' => $this->alice->id, 'pokemon' => 'weavile', 'kind' => 'ban', 'position' => 0]);
        $this->assertDatabaseHas('draft_choices', ['user_id' => $this->bruno->id, 'pokemon' => 'lanturn', 'kind' => 'pick', 'random' => true]);
    }

    public function test_returns_422_when_the_winner_is_not_one_of_the_players(): void
    {
        $this->internal()->postJson('/api/internal/battles', [...$this->payload('alice'), 'winner' => 'charlie'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['winner' => 'Le vainqueur doit être un des deux joueurs.']);
    }

    public function test_returns_422_when_a_player_has_no_account(): void
    {
        $payload = $this->payload('alice');
        $payload['players'][1]['showdown_id'] = 'inconnu';

        $this->internal()->postJson('/api/internal/battles', $payload)
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['players.1.showdown_id']);
    }

    public function test_returns_403_without_the_shared_secret(): void
    {
        $this->postJson('/api/internal/battles', $this->payload('alice'))->assertForbidden();
        $this->assertDatabaseCount('battles', 0);
    }

    private function placed(User $user, int $points): void
    {
        LadderEntry::factory()->for($user)->for($this->season)->placed($points)->create();
    }

    private function entry(User $user): LadderEntry
    {
        return LadderEntry::query()->where('user_id', $user->id)->where('season_id', $this->season->id)->firstOrFail();
    }

    private function battle(?string $winner, ?string $room = null): TestResponse
    {
        return $this->internal()->postJson('/api/internal/battles', $this->payload($winner, $room));
    }

    /**
     * @return array<string, mixed>
     */
    private function payload(?string $winner, ?string $room = null): array
    {
        $picks = fn (array $ids, bool $random = false): array => array_map(fn (string $id): array => ['pokemon' => $id, 'random' => $random], $ids);

        return [
            'room_id' => $room ?? 'battle-gen9pokedraft-'.(++$this->rooms),
            'turns' => 12,
            'winner' => $winner,
            'players' => [
                ['showdown_id' => 'alice', 'bans' => ['weavile', 'lucario'], 'picks' => $picks(['dewgong', 'onix', 'marowak', 'arbok', 'hypno', 'miltank'])],
                ['showdown_id' => 'bruno', 'bans' => ['typhlosion', 'altaria'], 'picks' => $picks(['lanturn', 'qwilfish', 'heracross', 'relicanth', 'ninjask', 'tropius'], true)],
            ],
        ];
    }

    private function internal(): static
    {
        return $this->withHeader('X-Arene-Secret', self::SECRET);
    }
}
