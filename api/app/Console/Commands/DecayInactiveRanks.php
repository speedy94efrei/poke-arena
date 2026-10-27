<?php

namespace App\Console\Commands;

use App\Models\Season;
use App\Ranked\Ladder;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('ranked:decay')]
#[Description('Retire des PL aux joueurs inactifs à partir de Luxe Ball')]
class DecayInactiveRanks extends Command
{
    public function handle(Ladder $ladder): int
    {
        $season = Season::current();
        if (! $season) {
            $this->components->info('Aucune saison en cours.');

            return self::SUCCESS;
        }

        $count = $ladder->decay($season, now());
        $this->components->info("{$count} joueur(s) inactif(s) ont perdu des PL.");

        return self::SUCCESS;
    }
}
