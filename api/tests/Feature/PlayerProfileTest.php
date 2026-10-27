<?php

namespace Tests\Feature;

use App\Models\LadderEntry;
use App\Models\Season;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PlayerProfileTest extends TestCase
{
    use RefreshDatabase;

    public function test_profile_shows_rank_points_to_next_division_and_position(): void
    {
        $season = Season::factory()->create(['number' => 1]);
        $mistral = User::factory()->named('Mistral')->create();
        LadderEntry::factory()->for($mistral)->for($season)->placed(764, wins: 4)->create();
        LadderEntry::factory()->for(User::factory())->for($season)->placed(1200)->create();

        $this->getJson('/api/players/mistral')
            ->assertOk()
            ->assertJsonPath('data.rank.label', 'Hyper Ball II')
            ->assertJsonPath('data.rank.points', 64)
            ->assertJsonPath('data.next', ['label' => 'Hyper Ball I', 'points_needed' => 36])
            ->assertJsonPath('data.position', 2)
            ->assertJsonPath('data.players', 2)
            ->assertJsonPath('data.record.wins', 4);
    }

    public function test_profile_of_a_new_player_is_in_placement(): void
    {
        Season::factory()->create();
        Sanctum::actingAs(User::factory()->named('Novice')->create());

        $this->getJson('/api/me')
            ->assertOk()
            ->assertJsonPath('data.rank.tier', 'placement')
            ->assertJsonPath('data.rank.placed', false)
            ->assertJsonPath('data.placement', ['played' => 0, 'needed' => 5])
            ->assertJsonPath('data.position', null);
    }

    public function test_banners_unlock_up_to_the_best_rank_reached(): void
    {
        $season = Season::factory()->create();
        $user = User::factory()->create();
        LadderEntry::factory()->for($user)->for($season)->placed(420)->create(['peak_points' => 700]);

        $banners = collect($this->getJson("/api/players/{$user->showdown_id}")->json('data.banners'))->pluck('unlocked', 'key');

        $this->assertSame(['depart' => true, 'poke' => true, 'super' => true, 'hyper' => true, 'honor' => false, 'luxe' => false, 'master' => false, 'champion' => false], $banners->all());
    }

    public function test_equipping_an_unlocked_banner_saves_it(): void
    {
        $season = Season::factory()->create();
        $user = User::factory()->create();
        LadderEntry::factory()->for($user)->for($season)->placed(700)->create();
        Sanctum::actingAs($user);

        $this->putJson('/api/me/banner', ['banner' => 'hyper'])->assertOk()->assertExactJson(['banner' => 'hyper']);

        $this->assertSame('hyper', $user->fresh()->banner);
    }

    public function test_equipping_a_locked_banner_returns_422(): void
    {
        Season::factory()->create();
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $this->putJson('/api/me/banner', ['banner' => 'master'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['banner' => 'Cette bannière est encore verrouillée.']);
        $this->assertSame('depart', $user->fresh()->banner);
    }

    public function test_profile_lists_finished_seasons_with_their_final_rank(): void
    {
        $user = User::factory()->create();
        $old = Season::factory()->finished()->create(['number' => 1, 'name' => 'Saison 1']);
        LadderEntry::factory()->for($user)->for($old)->placed(1350, wins: 30)->create();
        Season::factory()->create(['number' => 2]);

        $this->getJson("/api/players/{$user->showdown_id}")
            ->assertOk()
            ->assertJsonPath('data.past_seasons', [['number' => 1, 'name' => 'Saison 1', 'rank' => 'Luxe Ball II', 'wins' => 30, 'losses' => 0]]);
    }

    public function test_history_lists_latest_events_first(): void
    {
        $season = Season::factory()->create();
        $user = User::factory()->create();
        $entry = LadderEntry::factory()->for($user)->for($season)->placed(450)->create();
        $entry->events()->create(['type' => 'victoire', 'points_delta' => 20, 'points_after' => 470]);
        $this->travel(1)->minutes();
        $entry->events()->create(['type' => 'abandon', 'points_delta' => -5, 'points_after' => 465]);

        $this->getJson("/api/players/{$user->showdown_id}")
            ->assertJsonPath('data.history.0.type', 'abandon')
            ->assertJsonPath('data.history.1.type', 'victoire');
    }
}
