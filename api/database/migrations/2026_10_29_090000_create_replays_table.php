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
        Schema::create('replays', function (Blueprint $table) {
            $table->id();
            $table->string('slug', 120)->unique();
            $table->string('format', 100);
            $table->string('format_name', 150);
            $table->string('winner', 30)->nullable();
            $table->unsignedInteger('turns')->default(0);
            $table->boolean('rated')->default(false);
            $table->longText('log');
            $table->timestamp('ended_at');
            $table->timestamps();

            $table->index('ended_at');
        });

        Schema::create('replay_players', function (Blueprint $table) {
            $table->id();
            $table->foreignId('replay_id')->constrained()->cascadeOnDelete();
            $table->string('slot', 2);
            $table->string('name', 30);
            $table->string('showdown_id', 30);

            $table->index(['showdown_id', 'replay_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('replay_players');
        Schema::dropIfExists('replays');
    }
};
