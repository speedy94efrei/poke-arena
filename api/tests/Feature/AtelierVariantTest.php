<?php

namespace Tests\Feature;

use App\Models\AtelierVariant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AtelierVariantTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create();
    }

    public function test_variants_require_an_account(): void
    {
        $this->getJson('/api/me/atelier-variants')->assertUnauthorized();
        $this->putJson('/api/me/atelier-variants/dragonite', ['variants' => [$this->variant()]])->assertUnauthorized();
    }

    public function test_empty_atelier_is_an_empty_object(): void
    {
        Sanctum::actingAs($this->user);

        $this->assertSame('{"data":{}}', $this->getJson('/api/me/atelier-variants')->assertOk()->getContent());
    }

    public function test_update_replaces_the_variants_of_a_pokemon_in_order(): void
    {
        Sanctum::actingAs($this->user);
        AtelierVariant::factory()->for($this->user)->create(['pokemon' => 'dragonite', 'name' => 'Ancienne']);

        $this->putJson('/api/me/atelier-variants/dragonite', ['variants' => [
            $this->variant(['name' => 'Danse', 'favorite' => false]),
            $this->variant(['name' => 'Choix', 'item' => 'choiceband']),
        ]])
            ->assertOk()
            ->assertJsonPath('data.0.name', 'Danse')
            ->assertJsonPath('data.1.item', 'choiceband');

        $this->getJson('/api/me/atelier-variants')
            ->assertJsonCount(2, 'data.dragonite')
            ->assertJsonPath('data.dragonite.1.name', 'Choix')
            ->assertJsonPath('data.dragonite.1.favorite', true);
        $this->assertDatabaseMissing('atelier_variants', ['name' => 'Ancienne']);
    }

    public function test_an_empty_list_deletes_the_variants_of_a_pokemon(): void
    {
        Sanctum::actingAs($this->user);
        AtelierVariant::factory()->for($this->user)->create(['pokemon' => 'dragonite']);
        AtelierVariant::factory()->for($this->user)->create(['pokemon' => 'garchomp']);

        $this->putJson('/api/me/atelier-variants/dragonite', ['variants' => []])->assertOk()->assertExactJson(['data' => []]);

        $this->assertSame(['garchomp'], $this->user->atelierVariants()->pluck('pokemon')->all());
    }

    public function test_variant_without_item_comes_back_with_an_empty_item(): void
    {
        Sanctum::actingAs($this->user);

        $this->putJson('/api/me/atelier-variants/dragonite', ['variants' => [$this->variant(['item' => ''])]])
            ->assertOk()
            ->assertJsonPath('data.0.item', '');
    }

    public function test_update_returns_422_beyond_three_variants(): void
    {
        Sanctum::actingAs($this->user);

        $this->putJson('/api/me/atelier-variants/dragonite', ['variants' => array_fill(0, 4, $this->variant(['favorite' => false]))])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['variants']);
    }

    public function test_update_returns_422_when_evs_exceed_510(): void
    {
        Sanctum::actingAs($this->user);
        $evs = ['hp' => 252, 'atk' => 252, 'def' => 252, 'spa' => 0, 'spd' => 0, 'spe' => 0];

        $this->putJson('/api/me/atelier-variants/dragonite', ['variants' => [$this->variant(['evs' => $evs])]])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['variants.0.evs' => 'Pas plus de 510 EV au total.']);
    }

    public function test_update_returns_422_with_two_favorites(): void
    {
        Sanctum::actingAs($this->user);

        $this->putJson('/api/me/atelier-variants/dragonite', ['variants' => [$this->variant(), $this->variant()]])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['variants' => 'Une seule variante favorite par Pokémon.']);
    }

    public function test_update_returns_422_when_a_move_slot_is_missing(): void
    {
        Sanctum::actingAs($this->user);

        $this->putJson('/api/me/atelier-variants/dragonite', ['variants' => [$this->variant(['moves' => ['earthquake']])]])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['variants.0.moves']);
    }

    public function test_players_only_see_and_change_their_own_variants(): void
    {
        $other = User::factory()->create();
        AtelierVariant::factory()->for($other)->create(['pokemon' => 'dragonite', 'name' => 'Pas à toi']);
        Sanctum::actingAs($this->user);

        $this->putJson('/api/me/atelier-variants/dragonite', ['variants' => []])->assertOk();

        $this->assertSame('{"data":{}}', $this->getJson('/api/me/atelier-variants')->getContent());
        $this->assertDatabaseHas('atelier_variants', ['user_id' => $other->id, 'name' => 'Pas à toi']);
    }

    public function test_import_adds_browser_variants_only_for_pokemon_the_account_has_not_set(): void
    {
        Sanctum::actingAs($this->user);
        AtelierVariant::factory()->for($this->user)->create(['pokemon' => 'dragonite', 'name' => 'Du compte']);

        $this->postJson('/api/me/atelier-variants/import', ['variants' => [
            'dragonite' => [$this->variant(['name' => 'Du navigateur'])],
            'garchomp' => [$this->variant(['name' => 'Requin']), $this->variant(['name' => 'Requin 2', 'favorite' => false])],
        ]])
            ->assertOk()
            ->assertJsonPath('imported', ['garchomp'])
            ->assertJsonPath('data.dragonite.0.name', 'Du compte')
            ->assertJsonPath('data.garchomp.1.name', 'Requin 2');
    }

    public function test_import_returns_422_for_a_malformed_pokemon_id(): void
    {
        Sanctum::actingAs($this->user);

        $this->postJson('/api/me/atelier-variants/import', ['variants' => ['Dracolosse!' => [$this->variant()]]])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['variants']);
        $this->assertDatabaseCount('atelier_variants', 0);
    }

    /**
     * @param  array<string, mixed>  $overrides
     * @return array<string, mixed>
     */
    private function variant(array $overrides = []): array
    {
        return [
            'name' => 'Variante 1',
            'item' => 'heavydutyboots',
            'nature' => 'adamant',
            'moves' => ['dragondance', 'extremespeed', 'earthquake', null],
            'evs' => ['hp' => 4, 'atk' => 252, 'def' => 0, 'spa' => 0, 'spd' => 0, 'spe' => 252],
            'ivs' => ['hp' => 31, 'atk' => 31, 'def' => 31, 'spa' => 31, 'spd' => 31, 'spe' => 31],
            'favorite' => true,
            'preset' => 'phy',
            ...$overrides,
        ];
    }
}
