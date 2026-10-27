<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthenticationTest extends TestCase
{
    use RefreshDatabase;

    public function test_registration_creates_player_with_showdown_id_and_returns_201_with_token(): void
    {
        $response = $this->postJson('/api/players', ['name' => 'Mistral 64', 'password' => 'mot-de-passe']);

        $response->assertCreated()->assertJsonPath('name', 'Mistral 64')->assertJsonStructure(['token']);
        $this->assertDatabaseHas('users', ['name' => 'Mistral 64', 'showdown_id' => 'mistral64', 'banner' => 'depart']);
    }

    public function test_registration_returns_422_when_name_matches_existing_showdown_id(): void
    {
        User::factory()->named('Mistral')->create();

        $this->postJson('/api/players', ['name' => 'MISTRAL', 'password' => 'mot-de-passe'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['name' => 'Ce pseudo est déjà pris.']);
    }

    public function test_registration_returns_422_when_name_has_an_accented_letter(): void
    {
        $this->postJson('/api/players', ['name' => 'Testeur Classé', 'password' => 'mot-de-passe'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['name' => 'Le pseudo ne peut contenir que des lettres sans accent, des chiffres, des espaces et _ . -']);
    }

    public function test_registration_returns_422_when_name_has_no_letter_or_digit(): void
    {
        $this->postJson('/api/players', ['name' => '-_-', 'password' => 'mot-de-passe'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['name' => 'Le pseudo doit contenir au moins une lettre ou un chiffre.']);
    }

    public function test_registration_returns_422_when_password_is_shorter_than_8_characters(): void
    {
        $this->postJson('/api/players', ['name' => 'Mistral', 'password' => 'court'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['password']);
        $this->assertDatabaseCount('users', 0);
    }

    public function test_login_with_any_case_of_the_name_returns_token(): void
    {
        User::factory()->named('Mistral')->create();

        $this->postJson('/api/session', ['name' => 'mistral', 'password' => 'password'])
            ->assertOk()
            ->assertJsonPath('name', 'Mistral')
            ->assertJsonStructure(['token']);
    }

    public function test_login_returns_422_when_password_is_wrong(): void
    {
        User::factory()->named('Mistral')->create();

        $this->postJson('/api/session', ['name' => 'Mistral', 'password' => 'mauvais'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['name' => 'Pseudo ou mot de passe incorrect.']);
    }

    public function test_logout_revokes_the_token_and_returns_204(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('site')->plainTextToken;

        $this->withToken($token)->deleteJson('/api/session')->assertNoContent();

        $this->assertDatabaseCount('personal_access_tokens', 0);
    }

    public function test_me_returns_401_without_token(): void
    {
        $this->getJson('/api/me')->assertUnauthorized();
    }
}
