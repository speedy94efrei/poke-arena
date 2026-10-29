<?php

namespace App\Http\Requests\Internal;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StoreReplayRequest extends FormRequest
{
    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'id' => ['required', 'string', 'max:120', 'regex:/^[a-z0-9-]+$/'],
            'format' => ['required', 'string', 'max:100'],
            'format_name' => ['required', 'string', 'max:150'],
            'winner' => ['present', 'nullable', 'string', 'max:30'],
            'turns' => ['sometimes', 'integer', 'min:0'],
            'rated' => ['sometimes', 'boolean'],
            'log' => ['required', 'string', 'max:4000000'],
            'players' => ['required', 'array', 'min:2', 'max:4'],
            'players.*.slot' => ['required', 'string', 'distinct', 'in:p1,p2,p3,p4'],
            'players.*.name' => ['required', 'string', 'max:30'],
            'players.*.showdown_id' => ['required', 'string', 'max:30', 'regex:/^[a-z0-9]+$/'],
        ];
    }
}
