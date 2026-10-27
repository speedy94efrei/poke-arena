<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('ladder_entries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('season_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('points')->default(0);
            $table->unsignedInteger('peak_points')->default(0);
            $table->unsignedInteger('wins')->default(0);
            $table->unsignedInteger('losses')->default(0);
            $table->unsignedInteger('ties')->default(0);
            $table->unsignedTinyInteger('placement_games')->default(0);
            $table->unsignedTinyInteger('shield_games')->default(0);
            $table->unsignedInteger('streak')->default(0);
            $table->timestamp('last_played_at')->nullable();
            $table->timestamp('decayed_at')->nullable();
            $table->timestamps();

            $table->unique(['season_id', 'user_id']);
            $table->index(['season_id', 'points']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ladder_entries');
    }
};
