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
        Schema::create('atelier_variants', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('pokemon', 40);
            $table->unsignedTinyInteger('position');
            $table->string('name', 30);
            $table->string('item', 40)->nullable();
            $table->string('nature', 20);
            $table->json('moves');
            $table->json('evs');
            $table->json('ivs');
            $table->boolean('favorite')->default(false);
            $table->string('preset', 10)->nullable();
            $table->timestamps();

            $table->unique(['user_id', 'pokemon', 'position']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('atelier_variants');
    }
};
