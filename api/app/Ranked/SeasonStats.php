<?php

namespace App\Ranked;

use App\Models\DraftChoice;
use App\Models\Season;
use Illuminate\Support\Collection;

/**
 * Méta d'une saison, calculée à partir des drafts enregistrés.
 */
class SeasonStats
{
    /**
     * @return array{drafts: int, drafts_today: int}
     */
    public function summary(Season $season): array
    {
        return [
            'drafts' => $season->battles()->count(),
            'drafts_today' => $season->battles()->where('ended_at', '>=', now()->subDay())->count(),
        ];
    }

    /**
     * Présence (pické ou banni), taux de ban et taux de victoire de chaque Pokémon joué.
     *
     * @return Collection<int, array{pokemon: string, picks: int, bans: int, presence: float, ban_rate: float, win_rate: ?float}>
     */
    public function pokemon(Season $season): Collection
    {
        $drafts = max(1, $season->battles()->count());

        return $this->choices($season)
            ->groupBy('pokemon')
            ->map(function (Collection $choices, string $pokemon) use ($drafts): array {
                $picks = $choices->where('kind', DraftChoice::PICK);
                $decided = $picks->whereNotNull('winner_id');
                $wins = $decided->filter(fn (DraftChoice $choice): bool => $choice->user_id === $choice->winner_id)->count();

                return [
                    'pokemon' => $pokemon,
                    'picks' => $picks->count(),
                    'bans' => $choices->where('kind', DraftChoice::BAN)->count(),
                    'presence' => round($choices->unique('battle_id')->count() / $drafts, 4),
                    'ban_rate' => round($choices->where('kind', DraftChoice::BAN)->unique('battle_id')->count() / $drafts, 4),
                    'win_rate' => $decided->isEmpty() ? null : round($wins / $decided->count(), 4),
                ];
            })
            ->sortByDesc('presence')
            ->values();
    }

    /**
     * Paires de Pokémon le plus souvent draftées dans la même équipe.
     *
     * @return Collection<int, array{pokemon: list<string>, teams: int, share: float}>
     */
    public function duos(Season $season, int $limit = 5): Collection
    {
        $teams = $this->choices($season)
            ->where('kind', DraftChoice::PICK)
            ->groupBy(fn (DraftChoice $choice): string => "{$choice->battle_id}-{$choice->user_id}");

        $pairs = [];
        foreach ($teams as $team) {
            $pokemon = $team->pluck('pokemon')->sort()->values();
            foreach ($pokemon as $i => $first) {
                foreach ($pokemon->slice($i + 1) as $second) {
                    $pairs["{$first}|{$second}"] = ($pairs["{$first}|{$second}"] ?? 0) + 1;
                }
            }
        }

        return collect($pairs)
            ->sortDesc()
            ->take($limit)
            ->map(fn (int $count, string $pair): array => [
                'pokemon' => explode('|', $pair),
                'teams' => $count,
                'share' => round($count / max(1, $teams->count()), 4),
            ])
            ->values();
    }

    /**
     * @return Collection<int, DraftChoice>
     */
    private function choices(Season $season): Collection
    {
        return DraftChoice::query()
            ->join('battles', 'battles.id', '=', 'draft_choices.battle_id')
            ->where('battles.season_id', $season->id)
            ->get(['draft_choices.battle_id', 'draft_choices.user_id', 'draft_choices.pokemon', 'draft_choices.kind', 'battles.winner_id']);
    }
}
