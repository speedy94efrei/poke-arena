<?php

namespace App\Http\Controllers;

use App\Http\Requests\ImportAtelierVariantsRequest;
use App\Http\Requests\UpdateAtelierVariantsRequest;
use App\Http\Resources\AtelierVariantResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AtelierVariantController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        return response()->json(['data' => $this->byPokemon($request->user())]);
    }

    /**
     * Remplace toutes les variantes d'un Pokémon ; une liste vide les supprime.
     */
    public function update(UpdateAtelierVariantsRequest $request, string $pokemon): JsonResponse
    {
        $this->replace($request->user(), $pokemon, $request->validated('variants'));

        return response()->json(['data' => $this->byPokemon($request->user())->{$pokemon} ?? []]);
    }

    /**
     * Ajoute les variantes du navigateur pour les Pokémon que le compte n'a pas encore réglés.
     */
    public function import(ImportAtelierVariantsRequest $request): JsonResponse
    {
        $user = $request->user();
        $owned = $user->atelierVariants()->distinct()->pluck('pokemon')->all();
        $imported = collect($request->validated('variants'))->except($owned)->filter();

        DB::transaction(fn () => $imported->each(fn (array $variants, string $pokemon) => $this->replace($user, $pokemon, $variants)));

        return response()->json(['data' => $this->byPokemon($user), 'imported' => $imported->keys()]);
    }

    /**
     * @param  list<array<string, mixed>>  $variants
     */
    private function replace(User $user, string $pokemon, array $variants): void
    {
        DB::transaction(function () use ($user, $pokemon, $variants): void {
            $user->atelierVariants()->where('pokemon', $pokemon)->delete();
            $user->atelierVariants()->createMany(
                array_map(fn (array $variant, int $position): array => [...$variant, 'pokemon' => $pokemon, 'position' => $position], $variants, array_keys($variants))
            );
        });
    }

    private function byPokemon(User $user): object
    {
        return (object) $user->atelierVariants()
            ->orderBy('pokemon')
            ->orderBy('position')
            ->get()
            ->groupBy('pokemon')
            ->map(fn ($variants): array => AtelierVariantResource::collection($variants)->resolve())
            ->all();
    }
}
