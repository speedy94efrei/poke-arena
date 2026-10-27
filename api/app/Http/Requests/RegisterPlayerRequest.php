<?php

namespace App\Http\Requests;

use App\Models\User;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\Validator;

class RegisterPlayerRequest extends FormRequest
{
    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'min:2', 'max:18', 'regex:/^[A-Za-z0-9 _.-]+$/'],
            'password' => ['required', 'string', Password::min(8)],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'name.regex' => 'Le pseudo ne peut contenir que des lettres sans accent, des chiffres, des espaces et _ . -',
        ];
    }

    /**
     * Le pseudo sert aussi d'identifiant Showdown : il doit en produire un, libre.
     *
     * @return array<int, callable(Validator): void>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                if ($validator->errors()->has('name')) {
                    return;
                }
                $showdownId = User::showdownIdFor($this->string('name'));
                if ($showdownId === '') {
                    $validator->errors()->add('name', 'Le pseudo doit contenir au moins une lettre ou un chiffre.');
                } elseif (User::query()->where('showdown_id', $showdownId)->exists()) {
                    $validator->errors()->add('name', 'Ce pseudo est déjà pris.');
                }
            },
        ];
    }
}
