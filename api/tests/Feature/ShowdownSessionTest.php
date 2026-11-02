<?php

namespace Tests\Feature;

use App\Models\Season;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ShowdownSessionTest extends TestCase
{
    use RefreshDatabase;

    private const SECRET = 'secret-de-test';

    protected function setUp(): void
    {
        parent::setUp();
        config(['ranked.internal_secret' => self::SECRET]);
    }

    public function test_internal_routes_return_403_without_the_shared_secret(): void
    {
        $this->postJson('/api/internal/showdown-sessions', ['token' => 'x', 'showdown_id' => 'x'])->assertForbidden();
        $this->withHeader('X-Arene-Secret', 'faux')
            ->postJson('/api/internal/showdown-sessions', ['token' => 'x', 'showdown_id' => 'x'])
            ->assertForbidden();
    }

    public function test_internal_routes_return_403_when_no_secret_is_configured(): void
    {
        config(['ranked.internal_secret' => null]);

        $this->withHeader('X-Arene-Secret', '')
            ->postJson('/api/internal/showdown-sessions', ['token' => 'x', 'showdown_id' => 'x'])
            ->assertForbidden();
    }

    public function test_token_proves_the_account_once_for_its_showdown_name(): void
    {
        $user = User::factory()->named('Mistral')->create();
        Sanctum::actingAs($user);
        $token = $this->postJson('/api/me/showdown-tokens')->assertCreated()->json('token');

        $this->internal()->postJson('/api/internal/showdown-sessions', ['token' => $token, 'showdown_id' => 'mistral'])
            ->assertOk()
            ->assertExactJson(['name' => 'Mistral', 'showdown_id' => 'mistral']);

        $this->internal()->postJson('/api/internal/showdown-sessions', ['token' => $token, 'showdown_id' => 'mistral'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['token' => 'Jeton inconnu ou expiré.']);
    }

    public function test_token_without_a_showdown_name_gives_the_account_to_log_in_with(): void
    {
        Sanctum::actingAs(User::factory()->named('Mistral')->create());
        $token = $this->postJson('/api/me/showdown-tokens')->json('token');

        $this->internal()->postJson('/api/internal/showdown-sessions', ['token' => $token])
            ->assertOk()
            ->assertExactJson(['name' => 'Mistral', 'showdown_id' => 'mistral']);
    }

    public function test_battle_server_lists_the_names_of_every_account(): void
    {
        User::factory()->named('Mistral')->create();
        User::factory()->named('Brume Noire')->create();

        $this->getJson('/api/internal/protected-names')->assertForbidden();
        $this->internal()->getJson('/api/internal/protected-names')
            ->assertOk()
            ->assertExactJson(['showdown_ids' => ['brumenoire', 'mistral']]);
    }

    public function test_token_returns_422_when_used_under_another_showdown_name(): void
    {
        Sanctum::actingAs(User::factory()->named('Mistral')->create());
        $token = $this->postJson('/api/me/showdown-tokens')->json('token');

        $this->internal()->postJson('/api/internal/showdown-sessions', ['token' => $token, 'showdown_id' => 'brume'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['showdown_id' => 'Connecte-toi au serveur de combat sous le pseudo Mistral.']);
    }

    public function test_token_expires_after_the_configured_delay(): void
    {
        Sanctum::actingAs(User::factory()->named('Mistral')->create());
        $token = $this->postJson('/api/me/showdown-tokens')->json('token');

        $this->travel(config('ranked.showdown_token_minutes') + 1)->minutes();

        $this->internal()->postJson('/api/internal/showdown-sessions', ['token' => $token, 'showdown_id' => 'mistral'])
            ->assertUnprocessable();
    }

    public function test_queue_status_returns_no_wait_for_a_new_player(): void
    {
        Season::factory()->create();
        User::factory()->named('Mistral')->create();

        $this->internal()->getJson('/api/internal/players/mistral/queue-status')
            ->assertOk()
            ->assertExactJson(['abandons' => 0, 'wait_seconds' => 0]);
    }

    private function internal(): static
    {
        return $this->withHeader('X-Arene-Secret', self::SECRET);
    }
}
