<?php

namespace App\Ranked;

use App\Models\Battle;
use App\Models\DraftChoice;
use App\Models\LadderEntry;
use App\Models\LadderEvent;
use App\Models\Season;
use App\Models\User;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Classement d'une saison : résultats des drafts, abandons, inactivité et positions.
 */
class Ladder
{
    /** @var array<int, list<int>> */
    private array $champions = [];

    public function entryFor(User $user, Season $season): LadderEntry
    {
        return LadderEntry::query()->firstOrCreate(['user_id' => $user->id, 'season_id' => $season->id]);
    }

    /**
     * @param  array{room_id: string, turns?: int, winner?: ?string, players: list<array{showdown_id: string, bans?: list<string>, picks: list<array{pokemon: string, random?: bool}>}>}  $data
     */
    public function recordBattle(Season $season, array $data): Battle
    {
        return DB::transaction(function () use ($season, $data): Battle {
            $players = collect($data['players'])
                ->map(fn (array $player): User => User::query()->where('showdown_id', $player['showdown_id'])->firstOrFail());
            $winner = $players->first(fn (User $player): bool => $player->showdown_id === ($data['winner'] ?? null));

            $battle = Battle::query()->create([
                'season_id' => $season->id,
                'room_id' => $data['room_id'],
                'player_one_id' => $players[0]->id,
                'player_two_id' => $players[1]->id,
                'winner_id' => $winner?->id,
                'turns' => $data['turns'] ?? 0,
                'ended_at' => now(),
            ]);

            foreach ($data['players'] as $index => $player) {
                $choices = collect($player['bans'] ?? [])
                    ->map(fn (string $pokemon, int $position): array => ['pokemon' => $pokemon, 'kind' => DraftChoice::BAN, 'position' => $position, 'random' => false])
                    ->concat(collect($player['picks'])->map(fn (array $pick, int $position): array => [
                        'pokemon' => $pick['pokemon'], 'kind' => DraftChoice::PICK, 'position' => $position, 'random' => $pick['random'] ?? false,
                    ]));
                $battle->draftChoices()->createMany($choices->map(fn (array $choice): array => [...$choice, 'user_id' => $players[$index]->id]));
            }

            foreach ($players as $index => $player) {
                $result = match (true) {
                    $winner === null => LadderEvent::TIE,
                    $winner->is($player) => LadderEvent::VICTORY,
                    default => LadderEvent::DEFEAT,
                };
                $this->applyResult($this->entryFor($player, $season), $result, $players[1 - $index], $battle);
            }

            return $battle;
        });
    }

    public function applyResult(LadderEntry $entry, string $result, User $opponent, Battle $battle): LadderEvent
    {
        $before = $entry->points;
        $note = null;

        if ($result === LadderEvent::TIE) {
            $entry->ties++;
        } elseif (! $entry->isPlaced()) {
            $this->countResult($entry, $result);
            $entry->placement_games++;
            if ($entry->isPlaced()) {
                $entry->points = config('ranked.placement_base') + $entry->wins * config('ranked.placement_per_win');
                $note = 'placé en '.Rank::fromTotal($entry->points)->label();
            } else {
                $note = "placement {$entry->placement_games}/".config('ranked.placement_games');
            }
        } else {
            $shielded = $entry->shield_games > 0;
            $this->countResult($entry, $result);
            if ($result === LadderEvent::VICTORY) {
                $bonus = min(($entry->streak - 1) * config('ranked.streak_bonus'), config('ranked.streak_bonus_max'));
                $entry->points += config('ranked.win_points') + $bonus;
            } else {
                $entry->points = max(0, $entry->points - config('ranked.loss_points'));
                $floor = Rank::fromTotal($before)->floor;
                if ($shielded && $entry->points < $floor) {
                    $entry->points = $floor;
                    $note = 'bouclier';
                }
            }
            if ($shielded) {
                $entry->shield_games--;
            }
            $note = $this->rankChange($entry, $before) ?? $note;
            if ($note === null && $result === LadderEvent::VICTORY && $entry->streak >= 2) {
                $note = "série de {$entry->streak}";
            }
        }

        $entry->peak_points = max($entry->peak_points, $entry->points);
        $entry->last_played_at = now();
        $entry->save();

        return $entry->events()->create([
            'type' => $result,
            'points_delta' => $entry->points - $before,
            'points_after' => $entry->points,
            'opponent_id' => $opponent->id,
            'battle_id' => $battle->id,
            'note' => $note,
        ]);
    }

    public function recordAbandon(Season $season, User $user, ?User $opponent): LadderEvent
    {
        $entry = $this->entryFor($user, $season);
        $before = $entry->points;
        $entry->points = max(0, $entry->points - config('ranked.abandon_points'));
        $entry->streak = 0;
        $entry->last_played_at = now();
        $entry->save();

        return $entry->events()->create([
            'type' => LadderEvent::ABANDON,
            'points_delta' => $entry->points - $before,
            'points_after' => $entry->points,
            'opponent_id' => $opponent?->id,
            'note' => 'pénalité de départ',
        ]);
    }

    /**
     * Abandons récents, et attente imposée quand la limite est atteinte.
     *
     * @return array{abandons: int, wait_seconds: int}
     */
    public function abandonStatus(Season $season, User $user): array
    {
        $abandons = LadderEvent::query()
            ->whereHas('ladderEntry', fn (Builder $query) => $query->where('season_id', $season->id)->where('user_id', $user->id))
            ->where('type', LadderEvent::ABANDON)
            ->where('created_at', '>=', now()->subHours(config('ranked.abandon_window_hours')))
            ->orderByDesc('created_at')
            ->get(['created_at']);

        $wait = 0;
        if ($abandons->count() >= config('ranked.abandon_limit')) {
            $until = $abandons->first()->created_at->addMinutes(config('ranked.abandon_cooldown_minutes'));
            $wait = max(0, (int) ceil(now()->diffInSeconds($until, false)));
        }

        return ['abandons' => $abandons->count(), 'wait_seconds' => $wait];
    }

    /**
     * Retire des PL aux joueurs inactifs des paliers hauts, au plus une fois par jour.
     */
    public function decay(Season $season, CarbonInterface $now): int
    {
        $floor = Rank::tierStart(config('ranked.decay_from_tier'));
        $entries = $season->ladderEntries()
            ->where('points', '>=', $floor)
            ->where('last_played_at', '<=', $now->copy()->subDays(config('ranked.decay_after_days')))
            ->where(fn (Builder $query) => $query->whereNull('decayed_at')->orWhere('decayed_at', '<=', $now->copy()->subDay()))
            ->get();

        foreach ($entries as $entry) {
            $before = $entry->points;
            $entry->points = max($floor, $entry->points - config('ranked.decay_points'));
            $entry->decayed_at = $now;
            $entry->save();
            $entry->events()->create([
                'type' => LadderEvent::DECAY,
                'points_delta' => $entry->points - $before,
                'points_after' => $entry->points,
                'note' => 'plus de '.config('ranked.decay_after_days').' jours sans partie',
            ]);
        }

        return $entries->count();
    }

    /**
     * Joueurs placés, du premier au dernier.
     *
     * @return Builder<LadderEntry>
     */
    public function standings(Season $season): Builder
    {
        return LadderEntry::query()
            ->where('season_id', $season->id)
            ->where('placement_games', '>=', config('ranked.placement_games'))
            ->orderByDesc('points')
            ->orderByDesc('wins')
            ->orderBy('id');
    }

    public function position(LadderEntry $entry): ?int
    {
        if (! $entry->isPlaced()) {
            return null;
        }

        return $this->standings($entry->season)
            ->where(fn (Builder $query) => $query
                ->where('points', '>', $entry->points)
                ->orWhere(fn (Builder $tie) => $tie->where('points', $entry->points)->where('wins', '>', $entry->wins))
                ->orWhere(fn (Builder $tie) => $tie->where('points', $entry->points)->where('wins', $entry->wins)->where('id', '<', $entry->id)))
            ->count() + 1;
    }

    public function rankFor(LadderEntry $entry): Rank
    {
        if (! $entry->isPlaced()) {
            return Rank::placement();
        }

        return Rank::fromTotal($entry->points, in_array($entry->id, $this->championIds($entry->season), true));
    }

    /**
     * @return list<int>
     */
    public function championIds(Season $season): array
    {
        return $this->champions[$season->id] ??= $this->standings($season)
            ->where('points', '>=', Rank::tierStart(Rank::MASTER))
            ->limit(config('ranked.champion_slots'))
            ->pluck('id')
            ->all();
    }

    /**
     * Répartition des joueurs placés par palier.
     *
     * @return Collection<int, array{tier: string, name: string, players: int, share: float}>
     */
    public function distribution(Season $season): Collection
    {
        $ranks = $this->standings($season)->with('season')->get()->map(fn (LadderEntry $entry): Rank => $this->rankFor($entry));
        $total = max(1, $ranks->count());
        $tiers = [...config('ranked.tiers'), Rank::MASTER => config('ranked.master'), Rank::CHAMPION => config('ranked.champion')];

        return collect($tiers)->map(fn (string $name, string $tier): array => [
            'tier' => $tier,
            'name' => $name,
            'players' => $ranks->where('tier', $tier)->count(),
            'share' => round($ranks->where('tier', $tier)->count() / $total, 4),
        ])->values();
    }

    private function countResult(LadderEntry $entry, string $result): void
    {
        if ($result === LadderEvent::VICTORY) {
            $entry->wins++;
            $entry->streak++;
        } else {
            $entry->losses++;
            $entry->streak = 0;
        }
    }

    private function rankChange(LadderEntry $entry, int $before): ?string
    {
        $from = Rank::fromTotal($before);
        $to = Rank::fromTotal($entry->points);
        if ($to->step > $from->step) {
            $entry->shield_games = config('ranked.shield_games');

            return 'promotion en '.$to->label();
        }

        return $to->step < $from->step ? 'rétrogradation en '.$to->label() : null;
    }
}
