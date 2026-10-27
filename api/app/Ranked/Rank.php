<?php

namespace App\Ranked;

/**
 * Rang affiché à partir du total de points d'une saison.
 *
 * Chaque palier couvre 3 divisions de 100 PL. Au-delà du dernier palier, le joueur
 * est Master Ball et ses PL ne sont plus plafonnés.
 */
final readonly class Rank
{
    public const PLACEMENT = 'placement';

    public const MASTER = 'master';

    public const CHAMPION = 'champion';

    public function __construct(
        public string $tier,
        public string $tierName,
        public ?string $division,
        public int $points,
        public int $total,
        public int $floor,
        public int $step,
    ) {}

    public static function fromTotal(int $total, bool $champion = false): self
    {
        $divisionPoints = config('ranked.division_points');
        $divisions = config('ranked.divisions');
        $tierPoints = $divisionPoints * count($divisions);
        $tiers = config('ranked.tiers');
        $masterStart = $tierPoints * count($tiers);

        if ($total >= $masterStart) {
            return new self(
                $champion ? self::CHAMPION : self::MASTER,
                $champion ? config('ranked.champion') : config('ranked.master'),
                null,
                $total - $masterStart,
                $total,
                $masterStart,
                count($tiers) * count($divisions) + ($champion ? 1 : 0),
            );
        }

        $tierIndex = intdiv($total, $tierPoints);
        $divisionIndex = intdiv($total % $tierPoints, $divisionPoints);
        $tier = array_keys($tiers)[$tierIndex];

        return new self(
            $tier,
            $tiers[$tier],
            $divisions[$divisionIndex],
            $total % $divisionPoints,
            $total,
            $tierIndex * $tierPoints + $divisionIndex * $divisionPoints,
            $tierIndex * count($divisions) + $divisionIndex,
        );
    }

    public static function placement(): self
    {
        return new self(self::PLACEMENT, 'En placement', null, 0, 0, 0, -1);
    }

    public static function tierStart(string $tier): int
    {
        $tierPoints = config('ranked.division_points') * count(config('ranked.divisions'));
        $index = array_search($tier, array_keys(config('ranked.tiers')), true);

        return $index === false ? $tierPoints * count(config('ranked.tiers')) : $index * $tierPoints;
    }

    public function label(): string
    {
        return $this->division ? "{$this->tierName} {$this->division}" : $this->tierName;
    }

    /**
     * @return array{tier: string, tier_name: string, division: ?string, label: string, points: int, total: int}
     */
    public function toArray(): array
    {
        return [
            'tier' => $this->tier,
            'tier_name' => $this->tierName,
            'division' => $this->division,
            'label' => $this->label(),
            'points' => $this->points,
            'total' => $this->total,
        ];
    }
}
