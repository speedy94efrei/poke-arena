<?php

namespace App\Ranked;

use App\Models\LadderEntry;
use App\Models\User;

/**
 * Bannières d'un joueur : débloquées par son meilleur rang, toutes saisons confondues.
 */
class Banners
{
    public function __construct(private Ladder $ladder) {}

    /**
     * @return list<array{key: string, name: string, condition: string, unlocked: bool, equipped: bool}>
     */
    public function forUser(User $user): array
    {
        $unlocked = $this->unlockedKeys($user);

        return collect(config('ranked.banners'))
            ->map(fn (array $banner, string $key): array => [
                'key' => $key,
                'name' => $banner['name'],
                'condition' => $banner['condition'],
                'unlocked' => in_array($key, $unlocked, true),
                'equipped' => $user->banner === $key,
            ])
            ->values()
            ->all();
    }

    public function isUnlocked(User $user, string $key): bool
    {
        return in_array($key, $this->unlockedKeys($user), true);
    }

    /**
     * @return list<string>
     */
    private function unlockedKeys(User $user): array
    {
        $entries = $user->ladderEntries()->with('season')->get();
        $keys = ['depart'];

        $placed = $entries->filter(fn (LadderEntry $entry): bool => $entry->isPlaced());
        if ($placed->isNotEmpty()) {
            $peak = Rank::fromTotal($placed->max('peak_points'));
            foreach ([...array_keys(config('ranked.tiers')), Rank::MASTER] as $tier) {
                if ($peak->total >= Rank::tierStart($tier)) {
                    $keys[] = $tier;
                }
            }
        }

        $wasChampion = $placed->contains(fn (LadderEntry $entry): bool => $entry->season->isOver()
            && in_array($entry->id, $this->ladder->championIds($entry->season), true));
        if ($wasChampion) {
            $keys[] = Rank::CHAMPION;
        }

        return $keys;
    }
}
