<?php

namespace App\Ranked;

use App\Http\Resources\LadderEventResource;
use App\Models\LadderEntry;
use App\Models\Season;
use App\Models\User;

/**
 * Fiche d'un joueur pour une saison : rang, statut, historique, bannières et saisons passées.
 */
class Profiles
{
    public function __construct(private Ladder $ladder, private Banners $banners) {}

    /**
     * @return array<string, mixed>
     */
    public function profile(User $user, Season $season): array
    {
        $entry = $this->ladder->entryFor($user, $season)->load('season');
        $rank = $this->ladder->rankFor($entry);
        $position = $this->ladder->position($entry);
        $players = $this->ladder->standings($season)->count();
        $decayFloor = Rank::tierStart(config('ranked.decay_from_tier'));

        return [
            'name' => $user->name,
            'showdown_id' => $user->showdown_id,
            'banner' => $user->banner,
            'season' => $season->number,
            'rank' => [...$rank->toArray(), 'placed' => $entry->isPlaced()],
            'next' => $this->next($entry),
            'placement' => ['played' => $entry->placement_games, 'needed' => config('ranked.placement_games')],
            'position' => $position,
            'players' => $players,
            'top_percent' => $position ? round($position / max(1, $players), 4) : null,
            'record' => ['wins' => $entry->wins, 'losses' => $entry->losses, 'ties' => $entry->ties],
            'streak' => $entry->streak,
            'shield_games' => $entry->shield_games,
            'abandons' => $this->ladder->abandonStatus($season, $user),
            'decay' => [
                'concerned' => $entry->isPlaced() && $entry->points >= $decayFloor,
                'idle_days' => $entry->last_played_at ? (int) $entry->last_played_at->diffInDays(now()) : null,
            ],
            'history' => LadderEventResource::collection(
                $entry->events()->with('opponent')->orderByDesc('created_at')->orderByDesc('id')->limit(10)->get()
            ),
            'banners' => $this->banners->forUser($user),
            'past_seasons' => $this->pastSeasons($user, $season),
        ];
    }

    /**
     * @return array{label: string, points_needed: int}|null
     */
    private function next(LadderEntry $entry): ?array
    {
        if (! $entry->isPlaced()) {
            return null;
        }
        $rank = Rank::fromTotal($entry->points);
        if ($rank->division === null) {
            return null;
        }
        $target = $rank->floor + config('ranked.division_points');

        return ['label' => Rank::fromTotal($target)->label(), 'points_needed' => $target - $entry->points];
    }

    /**
     * @return list<array{number: int, name: string, rank: string, wins: int, losses: int}>
     */
    private function pastSeasons(User $user, Season $current): array
    {
        return $user->ladderEntries()
            ->with('season')
            ->where('season_id', '!=', $current->id)
            ->get()
            ->filter(fn (LadderEntry $entry): bool => $entry->season->isOver())
            ->sortByDesc(fn (LadderEntry $entry): int => $entry->season->number)
            ->map(fn (LadderEntry $entry): array => [
                'number' => $entry->season->number,
                'name' => $entry->season->name,
                'rank' => $this->ladder->rankFor($entry)->label(),
                'wins' => $entry->wins,
                'losses' => $entry->losses,
            ])
            ->values()
            ->all();
    }
}
