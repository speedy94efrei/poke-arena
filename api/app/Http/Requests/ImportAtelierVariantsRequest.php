<?php

namespace App\Http\Requests;

use App\Models\AtelierVariant;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

/**
 * Variantes gardées dans le navigateur avant la connexion, classées par Pokémon.
 */
class ImportAtelierVariantsRequest extends FormRequest
{
    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'variants' => ['present', 'array', 'max:'.UpdateAtelierVariantsRequest::MAX_POKEMON],
            'variants.*' => ['array', 'list', 'max:'.AtelierVariant::MAX_PER_POKEMON],
            ...UpdateAtelierVariantsRequest::variantRules('variants.*.*'),
        ];
    }

    /**
     * @return array<int, callable(Validator): void>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                foreach ((array) $this->input('variants') as $pokemon => $variants) {
                    if (! preg_match('/^[a-z0-9]{1,40}$/', (string) $pokemon)) {
                        $validator->errors()->add('variants', "Pokémon inconnu : {$pokemon}.");

                        continue;
                    }
                    UpdateAtelierVariantsRequest::checkVariants($validator, "variants.{$pokemon}", $variants);
                }
            },
        ];
    }
}
