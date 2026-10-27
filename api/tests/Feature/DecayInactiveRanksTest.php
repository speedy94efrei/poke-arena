<?php

namespace Tests\Feature;

use App\Models\LadderEntry;
use App\Models\Season;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DecayInactiveRanksTest extends TestCase
{
    use RefreshDatabase;

    public function test_inactive_luxe_ball_player_loses_25_points_once_per_day(): void
    {
        $season = Season::factory()->create();
        $entry = LadderEntry::factory()->for($season)->placed(1350)->create(['last_played_at' => now()->subDays(8)]);

        $this->artisan('ranked:decay')->assertSuccessful();
        $this->artisan('ranked:decay')->assertSuccessful();

        $this->assertSame(1325, $entry->fresh()->points);
        $this->assertDatabaseHas('ladder_events', ['ladder_entry_id' => $entry->id, 'type' => 'inactivite', 'points_delta' => -25]);

        $this->travel(1)->days();
        $this->artisan('ranked:decay');
        $this->assertSame(1300, $entry->fresh()->points);
    }

    public function test_decay_does_not_touch_lower_tiers_recent_players_or_drop_below_luxe_ball(): void
    {
        $season = Season::factory()->create();
        $hyper = LadderEntry::factory()->for($season)->placed(800)->create(['last_played_at' => now()->subDays(30)]);
        $recent = LadderEntry::factory()->for($season)->placed(1350)->create(['last_played_at' => now()->subDays(2)]);
        $floor = LadderEntry::factory()->for($season)->placed(1210)->create(['last_played_at' => now()->subDays(30)]);

        $this->artisan('ranked:decay')->assertSuccessful();

        $this->assertSame(800, $hyper->fresh()->points);
        $this->assertSame(1350, $recent->fresh()->points);
        $this->assertSame(1200, $floor->fresh()->points);
    }
}
