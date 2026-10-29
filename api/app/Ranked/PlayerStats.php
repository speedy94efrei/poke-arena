<?php

namespace App\Ranked;

use App\Models\Battle;
use App\Models\DraftChoice;
use App\Models\LadderEntry;
use App\Models\LadderEvent;
use App\Models\Season;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;

/**
 * Habitudes d'un joueur sur une saison : ses Pokémon, ses bans et ses derniers drafts.
 */
class PlayerStats
{
    /**
     * Pokémon que le joueur pique le plus, avec son taux de victoire quand il les joue.
     *
     * @return Collection<int, array{pokemon: string, picks: int, win_rate: ?float}>
     */
    public function signature(User $user, Season $season, int $limit = 6): Collection
    {
        return $this->choices($user, $season, DraftChoice::PICK)
            ->selectRaw('draft_choices.pokemon, count(*) as picks')
            ->selectRaw('sum(case when battles.winner_id = draft_choices.user_id then 1 else 0 end) as wins')
            ->selectRaw('sum(case when battles.winner_id is not null then 1 else 0 end) as decided')
            ->limit($limit)
            ->get()
            ->map(fn (DraftChoice $choice): array => [
                'pokemon' => $choice->pokemon,
                'picks' => (int) $choice->picks,
                'win_rate' => $choice->decided ? round($choice->wins / $choice->decided, 4) : null,
            ]);
    }

    /**
     * @return Collection<int, array{pokemon: string, bans: int}>
     */
    public function bans(User $user, Season $season, int $limit = 5): Collection
    {
        return $this->choices($user, $season, DraftChoice::BAN)
            ->selectRaw('draft_choices.pokemon, count(*) as bans')
            ->limit($limit)
            ->get()
            ->map(fn (DraftChoice $choice): array => ['pokemon' => $choice->pokemon, 'bans' => (int) $choice->bans]);
    }

    /**
     * Derniers drafts classés du joueur, avec les deux équipes et les PL gagnés ou perdus.
     *
     * @return Collection<int, array<string, mixed>>
     */
    public function drafts(LadderEntry $entry, int $limit = 8): Collection
    {
        $userId = $entry->user_id;
        $battles = Battle::query()
            ->where('season_id', $entry->season_id)
            ->where(fn (Builder $query) => $query->where('player_one_id', $userId)->orWhere('player_two_id', $userId))
            ->with(['playerOne', 'playerTwo', 'draftChoices' => fn ($query) => $query->where('kind', DraftChoice::PICK)->orderBy('position')])
            ->orderByDesc('ended_at')
            ->orderByDesc('id')
            ->limit($limit)
            ->get();

        $events = $entry->exists
            ? $entry->events()->whereIn('battle_id', $battles->modelKeys())->get(['battle_id', 'points_delta', 'note'])->keyBy('battle_id')
            : collect();

        return $battles->map(function (Battle $battle) use ($userId, $events): array {
            $opponent = $battle->player_one_id === $userId ? $battle->playerTwo : $battle->playerOne;
            $event = $events->get($battle->id);

            return [
                'result' => match ($battle->winner_id) {
                    null => LadderEvent::TIE,
                    $userId => LadderEvent::VICTORY,
                    default => LadderEvent::DEFEAT,
                },
                'points_delta' => $event?->points_delta,
                'note' => $event?->note,
                'room_id' => $battle->room_id,
                'turns' => $battle->turns,
                'opponent' => ['name' => $opponent->name, 'showdown_id' => $opponent->showdown_id],
                'team' => $battle->draftChoices->where('user_id', $userId)->pluck('pokemon')->values(),
                'opponent_team' => $battle->draftChoices->where('user_id', $opponent->id)->pluck('pokemon')->values(),
                'at' => $battle->ended_at->toIso8601String(),
            ];
        });
    }

    /**
     * @return Builder<DraftChoice>
     */
    private function choices(User $user, Season $season, string $kind): Builder
    {
        return DraftChoice::query()
            ->join('battles', 'battles.id', '=', 'draft_choices.battle_id')
            ->where('battles.season_id', $season->id)
            ->where('draft_choices.user_id', $user->id)
            ->where('draft_choices.kind', $kind)
            ->groupBy('draft_choices.pokemon')
            ->orderByRaw('count(*) desc')
            ->orderBy('draft_choices.pokemon');
    }
}
