<?php

namespace App\Http\Requests\Internal;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class StoreBattleRequest extends FormRequest
{
    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'room_id' => ['required', 'string', 'max:100'],
            'turns' => ['sometimes', 'integer', 'min:0'],
            'winner' => ['present', 'nullable', 'string'],
            'players' => ['required', 'array', 'size:2'],
            'players.*.showdown_id' => ['required', 'string', 'distinct', 'exists:users,showdown_id'],
            'players.*.bans' => ['present', 'array', 'max:3'],
            'players.*.bans.*' => ['string', 'max:40'],
            'players.*.picks' => ['required', 'array', 'size:6'],
            'players.*.picks.*.pokemon' => ['required', 'string', 'max:40'],
            'players.*.picks.*.random' => ['sometimes', 'boolean'],
        ];
    }

    /**
     * @return array<int, callable(Validator): void>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                $winner = $this->input('winner');
                $players = collect($this->input('players', []))->pluck('showdown_id');
                if ($winner !== null && ! $players->contains($winner)) {
                    $validator->errors()->add('winner', 'Le vainqueur doit être un des deux joueurs.');
                }
            },
        ];
    }
}
