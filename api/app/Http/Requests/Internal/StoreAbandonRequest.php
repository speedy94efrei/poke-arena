<?php

namespace App\Http\Requests\Internal;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StoreAbandonRequest extends FormRequest
{
    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'showdown_id' => ['required', 'string', 'exists:users,showdown_id'],
            'opponent_showdown_id' => ['nullable', 'string', 'exists:users,showdown_id'],
        ];
    }
}
