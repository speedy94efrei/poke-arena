<?php

namespace Tests\Feature;

use App\Models\LadderEntry;
use App\Models\Season;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

class AbandonTest extends TestCase
{
    use RefreshDatabase;

    private const SECRET = 'secret-de-test';

    protected function setUp(): void
    {
        parent::setUp();
        config(['ranked.internal_secret' => self::SECRET]);
    }

    public function test_abandon_costs_5_points_and_returns_201(): void
    {
        $season = Season::factory()->create();
        $alice = User::factory()->named('Alice')->create();
        User::factory()->named('Bruno')->create();
        LadderEntry::factory()->for($alice)->for($season)->placed(450)->create();

        $this->sendAbandon('alice', 'bruno')->assertCreated()->assertExactJson(['points_delta' => -5, 'points_after' => 445]);

        $this->assertDatabaseHas('ladder_events', ['type' => 'abandon', 'points_delta' => -5, 'note' => 'pénalité de départ']);
    }

    public function test_abandon_does_not_take_points_below_zero(): void
    {
        Season::factory()->create();
        User::factory()->named('Alice')->create();

        $this->sendAbandon('alice')->assertExactJson(['points_delta' => 0, 'points_after' => 0]);
    }

    public function test_third_abandon_in_24_hours_imposes_a_15_minute_wait(): void
    {
        $this->freezeTime();
        Season::factory()->create();
        User::factory()->named('Alice')->create();

        $this->sendAbandon('alice');
        $this->sendAbandon('alice');
        $this->queueStatus('alice')->assertExactJson(['abandons' => 2, 'wait_seconds' => 0]);

        $this->sendAbandon('alice');
        $this->queueStatus('alice')->assertExactJson(['abandons' => 3, 'wait_seconds' => 15 * 60]);

        $this->travel(16)->minutes();
        $this->queueStatus('alice')->assertJsonPath('wait_seconds', 0);
    }

    private function sendAbandon(string $player, ?string $opponent = null): TestResponse
    {
        return $this->withHeader('X-Arene-Secret', self::SECRET)
            ->postJson('/api/internal/abandons', ['showdown_id' => $player, 'opponent_showdown_id' => $opponent]);
    }

    private function queueStatus(string $player): TestResponse
    {
        return $this->withHeader('X-Arene-Secret', self::SECRET)->getJson("/api/internal/players/{$player}/queue-status");
    }
}
