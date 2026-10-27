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
        Schema::create('ladder_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ladder_entry_id')->constrained()->cascadeOnDelete();
            $table->string('type');
            $table->integer('points_delta');
            $table->unsignedInteger('points_after');
            $table->foreignId('opponent_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('battle_id')->nullable()->constrained()->nullOnDelete();
            $table->string('note')->nullable();
            $table->timestamps();

            $table->index(['ladder_entry_id', 'created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ladder_events');
    }
};
